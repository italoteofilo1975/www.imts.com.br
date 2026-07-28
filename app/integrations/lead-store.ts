import {signature} from "./security";
import type {PendingLead} from "./types";

type StoredLead={id:string;intent:string;name:string;email:string;organization:string;role:string;message:string;destination:string;createdAt:string;correlationId:string;privacy:{consentVersion:string}};
export async function database(){
  try{
    const {env}=await import("cloudflare:workers");
    return (env as unknown as {DB?:D1Database}).DB;
  }catch{return undefined}
}

export async function deliver(lead:PendingLead){
  const endpoint=process.env.IMTS_LEAD_WEBHOOK_URL,secret=process.env.IMTS_LEAD_WEBHOOK_SECRET;
  if(!endpoint||!secret)return {ok:false,status:0,detail:"connector not configured",retryAfter:null as string|null};
  const payload={id:lead.id,intent:lead.intent,name:lead.name,email:lead.email,organization:lead.organization,role:lead.role,message:lead.message,consent:true,source:"site",locale:"pt-BR",destination:lead.destination,createdAt:lead.created_at,correlationId:lead.correlation_id,privacy:{consentVersion:lead.consent_version}};
  const body=JSON.stringify(payload),sig=await signature(body,secret),ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
  try{
    const response=await fetch(endpoint,{method:"POST",signal:ctl.signal,headers:{"content-type":"application/json","x-imts-event":"lead.created","x-imts-signature":`sha256=${sig}`,"x-imts-idempotency-key":lead.id,"x-correlation-id":lead.correlation_id||crypto.randomUUID()},body});
    return {ok:response.ok,status:response.status,detail:response.ok?"webhook accepted":`webhook ${response.status}`,retryAfter:response.headers.get("retry-after")};
  }catch{return {ok:false,status:0,detail:"webhook unavailable",retryAfter:null}}
  finally{clearTimeout(timer)}
}

async function ensureSchema(db:D1Database){
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, intent TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, destination TEXT NOT NULL, consent_version TEXT NOT NULL, delivery_status TEXT NOT NULL DEFAULT 'accepted', delivery_channel TEXT, delivery_attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, correlation_id TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS lead_events (id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id TEXT NOT NULL, event TEXT NOT NULL, channel TEXT, detail TEXT, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS operation_token_jti (jti TEXT PRIMARY KEY, subject TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS connector_circuit (connector TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'closed', failures INTEGER NOT NULL DEFAULT 0, opened_at TEXT, probe_lease TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS prototype_audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, correlation_id TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, outcome TEXT NOT NULL, previous_hash TEXT NOT NULL, event_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS leads_delivery_status_idx ON leads(delivery_status, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS lead_events_lead_id_idx ON lead_events(lead_id, created_at)"),
  ]);
}

export async function persistLead(lead:StoredLead){
  const db=await database();if(!db)throw new Error("durable lead storage unavailable");await ensureSchema(db);
  await db.batch([
    db.prepare("INSERT INTO leads (id,intent,name,email,organization,role,message,destination,consent_version,delivery_status,created_at,updated_at,correlation_id) VALUES (?,?,?,?,?,?,?,?,?,'accepted',?,?,?)").bind(lead.id,lead.intent,lead.name,lead.email,lead.organization,lead.role,lead.message,lead.destination,lead.privacy.consentVersion,lead.createdAt,lead.createdAt,lead.correlationId),
    db.prepare("INSERT INTO lead_events (lead_id,event,detail,created_at) VALUES (?,'accepted','durable intake',?)").bind(lead.id,lead.createdAt),
  ]);return true;
}

export async function recordDelivery(id:string,status:"delivered"|"pending",channel:"resend"|"webhook"|"fallback",detail=""){
  const db=await database();if(!db)return;const now=new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE leads SET delivery_status=?,delivery_channel=?,delivery_attempts=delivery_attempts+1,last_error=?,updated_at=? WHERE id=?").bind(status,channel,detail||null,now,id),
    db.prepare("INSERT INTO lead_events (lead_id,event,channel,detail,created_at) VALUES (?,?,?,?,?)").bind(id,status,channel,detail||null,now),
  ]);
}
