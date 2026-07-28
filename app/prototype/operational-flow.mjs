import { randomUUID } from "node:crypto";
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
