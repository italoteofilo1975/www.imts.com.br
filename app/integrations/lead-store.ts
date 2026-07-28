type StoredLead={id:string;intent:string;name:string;email:string;organization:string;role:string;message:string;destination:string;createdAt:string;correlationId:string;privacy:{consentVersion:string}};
async function database(){
  try{
    const {env}=await import("cloudflare:workers");
    return (env as unknown as {DB?:D1Database}).DB;
  }catch{return undefined}
}

async function ensureSchema(db:D1Database){
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, intent TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, destination TEXT NOT NULL, consent_version TEXT NOT NULL, delivery_status TEXT NOT NULL DEFAULT 'accepted', delivery_channel TEXT, delivery_attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, correlation_id TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS lead_events (id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id TEXT NOT NULL, event TEXT NOT NULL, channel TEXT, detail TEXT, created_at TEXT NOT NULL)"),
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
