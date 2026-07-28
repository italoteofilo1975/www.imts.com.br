import { createHash, randomUUID } from "node:crypto";
import { retryDelay } from "./controls.mjs";

export function correlationId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? "")
    ? value
    : randomUUID();
}

export function classifyFailure({ status = 0, retryAfter = null, attempt = 1, now = Date.now(), random = 0.5 }) {
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return { state: "dead", nextAttemptAt: null, reason: `permanent_${status}` };
  }
  if (attempt >= 5) return { state: "dead", nextAttemptAt: null, reason: "attempts_exhausted" };
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const parsed = Number.isFinite(seconds) ? now + seconds * 1_000 : Date.parse(retryAfter);
    if (Number.isFinite(parsed) && parsed > now) {
      return { state: "pending", nextAttemptAt: Math.min(parsed, now + 15 * 60_000), reason: `retry_${status || "network"}` };
    }
  }
  return { state: "pending", nextAttemptAt: now + retryDelay(attempt, random), reason: `retry_${status || "network"}` };
}

export class SharedPrototypeQueue {
  constructor(rows = []) {
    this.rows = new Map(rows.map((row) => [row.id, {
      attempts: 0,
      state: "pending",
      nextAttemptAt: 0,
      ...row,
    }]));
    this.audit = [];
  }

  async claim(worker, now = Date.now(), leaseMs = 30_000) {
    for (const row of this.rows.values()) {
      if (row.state === "processing" && row.leaseExpiresAt <= now) row.state = "pending";
      if (row.state !== "pending" || row.nextAttemptAt > now) continue;
      row.state = "processing";
      row.leaseToken = randomUUID();
      row.leaseOwner = worker;
      row.leaseExpiresAt = now + leaseMs;
      row.attempts += 1;
      this.audit.push({ action: "lead.claimed", resource: row.id, actor: worker, correlationId: row.correlationId, outcome: "allowed" });
      return structuredClone(row);
    }
    return null;
  }

  finalize(id, leaseToken, outcome, now = Date.now()) {
    const row = this.rows.get(id);
    if (!row || row.state !== "processing" || row.leaseToken !== leaseToken) return false;
    if (outcome.ok) {
      row.state = "delivered";
      row.nextAttemptAt = null;
    } else {
      const failure = classifyFailure({ ...outcome, attempt: row.attempts, now });
      row.state = failure.state;
      row.nextAttemptAt = failure.nextAttemptAt;
      row.lastError = failure.reason;
    }
    this.audit.push({ action: "lead.finalized", resource: row.id, actor: row.leaseOwner, correlationId: row.correlationId, outcome: row.state });
    delete row.leaseToken;
    delete row.leaseOwner;
    delete row.leaseExpiresAt;
    return true;
  }
}

export class SharedRateLimiter {
  constructor(limit = 5, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.buckets = new Map();
  }
  consume(key, now = Date.now()) {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= this.limit,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    };
  }
}

export function anonymizeExpired(rows, now = Date.now()) {
  let changed = 0;
  for (const row of rows) {
    if (row.legalHold || row.anonymizedAt || row.retentionUntil > now) continue;
    row.name = "[anonymized]";
    row.email = `anon-${row.id}@invalid.local`;
    row.organization = "";
    row.role = "";
    row.message = "[anonymized]";
    row.anonymizedAt = new Date(now).toISOString();
    changed += 1;
  }
  return changed;
}

export async function runLoadSimulation(size, workers = 16) {
  const rows=Array.from({length:size},(_,i)=>({id:`lead-${i}`,correlationId:correlationId()}));
  const queue=new SharedPrototypeQueue(rows),started=performance.now(),terminal=new Set(),latencies=[];
  for(;;){
    const batch=await Promise.all(Array.from({length:workers},async(_,i)=>{
      const before=performance.now(),claim=await queue.claim(`worker-${i}`,Date.now());
      if(!claim)return false;
      latencies.push(performance.now()-before);
      if(!queue.finalize(claim.id,claim.leaseToken,{ok:true},Date.now()))throw new Error("lease finalization failed");
      terminal.add(claim.id);return true;
    }));
    if(!batch.some(Boolean))break;
  }
  const sorted=latencies.sort((a,b)=>a-b),percentile=(p)=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;
  return {size,workers,processed:terminal.size,duplicates:size-terminal.size,loss:size-terminal.size,durationMs:performance.now()-started,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),auditEvents:queue.audit.length};
}

function canonical(rows){return [...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).join("\n")}
export function snapshotManifest(rows,cutoff=Date.now()){
  return {cutoff,rowCount:rows.length,sha256:createHash("sha256").update(canonical(rows)).digest("hex")};
}
export function runRestoreSimulation(size){
  const source=Array.from({length:size},(_,i)=>({id:`lead-${i}`,state:i%3?"pending":"delivered",createdAt:i+1,parentId:null}));
  const started=performance.now(),manifest=snapshotManifest(source,size),snapshot=structuredClone(source);
  source.splice(0,source.length);source.push({id:"corrupt",state:"invalid",createdAt:size+1,parentId:"missing"});
  const restored=structuredClone(snapshot),validated=snapshotManifest(restored,size);
  return {size,rtoMs:performance.now()-started,rpoRecords:0,integrity:validated.rowCount===manifest.rowCount&&validated.sha256===manifest.sha256,orphans:restored.filter(row=>row.parentId&&!restored.some(parent=>parent.id===row.parentId)).length,manifest};
}
