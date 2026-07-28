import {database} from "./lead-store";

export async function sharedRateLimit(request:Request,route:string,limit:number,windowSeconds:number){
  const db=await database();
  if(!db)return {allowed:true,retryAfter:0,degraded:true};
  const ip=(request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip));
  const subject=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("").slice(0,32);
  const now=Date.now(),windowStart=new Date(Math.floor(now/(windowSeconds*1000))*windowSeconds*1000).toISOString();
  await db.prepare(`INSERT INTO rate_limit_windows (route,subject_hash,window_start,count,updated_at)
    VALUES (?,?,?,1,?) ON CONFLICT(route,subject_hash,window_start)
    DO UPDATE SET count=count+1,updated_at=excluded.updated_at`).bind(route,subject,windowStart,new Date(now).toISOString()).run();
  const row=await db.prepare("SELECT count FROM rate_limit_windows WHERE route=? AND subject_hash=? AND window_start=?")
    .bind(route,subject,windowStart).first<{count:number}>();
  const retryAfter=Math.max(1,Math.ceil((Date.parse(windowStart)+windowSeconds*1000-now)/1000));
  return {allowed:Number(row?.count||0)<=limit,retryAfter,degraded:false};
}

export async function circuitPermission(connector:string,threshold=5,openSeconds=60){
  const db=await database();if(!db)return {allowed:true,probe:null as string|null,degraded:true};
  const now=new Date(),row=await db.prepare("SELECT state,failures,opened_at,probe_lease FROM connector_circuit WHERE connector=?").bind(connector).first<{state:string;failures:number;opened_at:string|null;probe_lease:string|null}>();
  if(!row)return {allowed:true,probe:null,degraded:false};
  if(row.state!=="open")return {allowed:true,probe:row.probe_lease,degraded:false};
  if(!row.opened_at||now.getTime()-Date.parse(row.opened_at)<openSeconds*1000)return {allowed:false,probe:null,degraded:false};
  const probe=crypto.randomUUID();
  const changed=await db.prepare("UPDATE connector_circuit SET state='half_open',probe_lease=?,updated_at=? WHERE connector=? AND state='open'")
    .bind(probe,now.toISOString(),connector).run();
  return {allowed:Boolean(changed.meta.changes),probe,degraded:false,threshold};
}

export async function recordCircuit(connector:string,ok:boolean,probe:string|null,threshold=5){
  const db=await database();if(!db)return;
  const now=new Date().toISOString();
  if(ok){
    await db.prepare(`INSERT INTO connector_circuit (connector,state,failures,opened_at,probe_lease,updated_at)
      VALUES (?,'closed',0,NULL,NULL,?) ON CONFLICT(connector) DO UPDATE SET state='closed',failures=0,opened_at=NULL,probe_lease=NULL,updated_at=excluded.updated_at
      WHERE connector_circuit.probe_lease IS NULL OR connector_circuit.probe_lease=?`).bind(connector,now,probe).run();return;
  }
  await db.prepare(`INSERT INTO connector_circuit (connector,state,failures,opened_at,probe_lease,updated_at)
    VALUES (?,'closed',1,NULL,NULL,?) ON CONFLICT(connector) DO UPDATE SET
    failures=failures+1,state=CASE WHEN failures+1>=? THEN 'open' ELSE 'closed' END,
    opened_at=CASE WHEN failures+1>=? THEN excluded.updated_at ELSE opened_at END,
    probe_lease=NULL,updated_at=excluded.updated_at`).bind(connector,now,threshold,threshold).run();
}
