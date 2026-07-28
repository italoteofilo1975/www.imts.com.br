import {authorizeOperation} from "@/app/integrations/operations-auth";
import {database,deliver} from "@/app/integrations/lead-store";
import {sharedRateLimit,circuitPermission,recordCircuit} from "@/app/integrations/runtime-controls";
import type {PendingLead} from "@/app/integrations/types";

async function hash(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}
async function audit(db:D1Database,identity:{subject:string},correlationId:string,action:string,resource:string,outcome:string){
  const now=new Date().toISOString(),previous=await db.prepare("SELECT event_hash FROM prototype_audit_events ORDER BY id DESC LIMIT 1").first<{event_hash:string}>(),previousHash=previous?.event_hash||"GENESIS";
  const eventHash=await hash(JSON.stringify({correlationId,actor:identity.subject,action,resource,outcome,previousHash,createdAt:now}));
  await db.prepare("INSERT INTO prototype_audit_events (correlation_id,actor,action,resource,outcome,previous_hash,event_hash,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(correlationId,identity.subject,action,resource,outcome,previousHash,eventHash,now).run();
}
async function claim(db:D1Database,worker:string){
  const now=new Date(),leaseToken=crypto.randomUUID(),expires=new Date(now.getTime()+30_000).toISOString();
  return db.prepare(`UPDATE leads SET delivery_status='processing',lease_owner=?,lease_token=?,lease_expires_at=?,delivery_attempts=delivery_attempts+1,updated_at=?
    WHERE id=(SELECT id FROM leads WHERE delivery_attempts<5 AND (delivery_status='pending' OR (delivery_status='processing' AND lease_expires_at<=?)) AND (next_attempt_at IS NULL OR next_attempt_at<=?) ORDER BY created_at LIMIT 1)
    AND (delivery_status='pending' OR lease_expires_at<=?) RETURNING id,intent,name,email,organization,role,message,destination,consent_version,created_at,correlation_id,delivery_attempts,lease_token`)
    .bind(worker,leaseToken,expires,now.toISOString(),now.toISOString(),now.toISOString(),now.toISOString()).first<PendingLead&{correlation_id:string;delivery_attempts:number;lease_token:string}>();
}
function retryAt(attempt:number,retryAfter?:string|null){
  const now=Date.now(),seconds=Number(retryAfter);
  if(retryAfter&&Number.isFinite(seconds))return new Date(now+Math.min(seconds*1000,900_000)).toISOString();
  return new Date(now+Math.min(900_000,1000*2**Math.max(0,attempt-1))*(.75+Math.random()*.5)).toISOString();
}

export async function POST(request:Request){
  if(!request.headers.get("authorization")||!process.env.IMTS_OPERATIONS_JWT_SECRET)return Response.json({ok:false,code:"unauthorized"},{status:401,headers:{"www-authenticate":"Bearer"}});
  const db=await database();if(!db)return Response.json({ok:false,code:"database_unavailable"},{status:503});
  const identity=await authorizeOperation(request,db,"leads:retry");
  if(!identity)return Response.json({ok:false,code:"unauthorized"},{status:401,headers:{"www-authenticate":"Bearer"}});
  const rate=await sharedRateLimit(request,"operations.retry",30,60);
  if(!rate.allowed)return Response.json({ok:false,code:"rate_limited"},{status:429,headers:{"retry-after":String(rate.retryAfter)}});
  const worker=`${identity.subject}:${crypto.randomUUID()}`,max=Math.min(25,Math.max(1,Number(new URL(request.url).searchParams.get("limit")||25)));
  let delivered=0,pending=0,dead=0,processed=0;
  for(let i=0;i<max;i++){
    const lead=await claim(db,worker);if(!lead)break;processed++;
    await audit(db,identity,lead.correlation_id||crypto.randomUUID(),"lead.claimed",`lead:${lead.id}`,"allowed");
    const circuit=await circuitPermission("lead_webhook");
    const outcome=circuit.allowed?await deliver(lead):{ok:false,status:503,detail:"circuit open",retryAfter:"60"};
    if(circuit.allowed)await recordCircuit("lead_webhook",outcome.ok,circuit.probe);
    const now=new Date().toISOString();
    const permanent=outcome.status>=400&&outcome.status<500&&outcome.status!==408&&outcome.status!==429;
    const exhausted=lead.delivery_attempts>=5,state=outcome.ok?"delivered":permanent||exhausted?"dead":"pending";
    const next=state==="pending"?retryAt(lead.delivery_attempts,outcome.retryAfter):null;
    const changed=await db.prepare("UPDATE leads SET delivery_status=?,delivery_channel='webhook',next_attempt_at=?,last_error=?,lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=? WHERE id=? AND lease_token=?")
      .bind(state,next,outcome.ok?null:outcome.detail,now,lead.id,lead.lease_token).run();
    if(!changed.meta.changes){await audit(db,identity,lead.correlation_id||crypto.randomUUID(),"lead.finalized",`lead:${lead.id}`,"lease_rejected");continue}
    await db.prepare("INSERT INTO lead_events (lead_id,event,channel,detail,created_at) VALUES (?,?,'webhook',?,?)").bind(lead.id,state,outcome.detail,now).run();
    await audit(db,identity,lead.correlation_id||crypto.randomUUID(),"lead.finalized",`lead:${lead.id}`,state);
    if(state==="delivered")delivered++;else if(state==="dead")dead++;else pending++;
  }
  return Response.json({ok:true,processed,delivered,pending,dead});
}
