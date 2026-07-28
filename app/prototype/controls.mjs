import { createHash, randomUUID } from "node:crypto";

export const EVIDENCE_LEVELS = Object.freeze({
  E0: "desenho",
  E1: "teste unitário",
  E2: "simulação integrada",
  E3: "homologação equivalente",
  E4: "produção comprovada",
});

export const PROTOTYPE_ROLES = Object.freeze({
  operations_reader: ["operations:read"],
  lead_retry_operator: ["operations:read", "leads:retry"],
  security_auditor: ["audit:read"],
  admin: ["operations:read", "leads:retry", "audit:read", "policy:write"],
});

export function authorize(role, permission) {
  return Boolean(PROTOTYPE_ROLES[role]?.includes(permission));
}

export function validateWorkloadToken(claims, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!claims || claims.iss !== "https://prototype-idp.imts.invalid") return { ok: false, code: "invalid_issuer" };
  if (claims.aud !== "imts-operations") return { ok: false, code: "invalid_audience" };
  if (!Number.isFinite(claims.exp) || claims.exp <= nowSeconds) return { ok: false, code: "expired" };
  if (!claims.jti || !claims.sub || !claims.role) return { ok: false, code: "incomplete_claims" };
  if (!PROTOTYPE_ROLES[claims.role]) return { ok: false, code: "unknown_role" };
  return { ok: true, subject: claims.sub, role: claims.role };
}

export class CircuitBreaker {
  constructor({ threshold = 5, openMs = 60_000 } = {}) {
    this.threshold = threshold;
    this.openMs = openMs;
    this.failures = 0;
    this.openedAt = 0;
  }
  state(now = Date.now()) {
    if (!this.openedAt) return "closed";
    return now - this.openedAt >= this.openMs ? "half_open" : "open";
  }
  allow(now = Date.now()) {
    return this.state(now) !== "open";
  }
  success() {
    this.failures = 0;
    this.openedAt = 0;
  }
  failure(now = Date.now()) {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = now;
  }
}

export function retryDelay(attempt, random = 0.5) {
  const base = Math.min(15 * 60_000, 1_000 * 2 ** Math.max(0, attempt - 1));
  return Math.round(base * (0.75 + random * 0.5));
}

export function redact(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email-redacted]")
    .replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g, "[phone-redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

export function appendAuditEvent(chain, event) {
  const previousHash = chain.at(-1)?.eventHash ?? "GENESIS";
  const normalized = {
    eventId: event.eventId ?? randomUUID(),
    occurredAt: event.occurredAt,
    correlationId: event.correlationId,
    actor: event.actor,
    action: event.action,
    resource: event.resource,
    outcome: event.outcome,
    previousHash,
  };
  const eventHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  return [...chain, { ...normalized, eventHash }];
}

export function verifyAuditChain(chain) {
  let previousHash = "GENESIS";
  for (const event of chain) {
    const { eventHash, ...normalized } = event;
    if (normalized.previousHash !== previousHash) return false;
    const expected = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
    if (expected !== eventHash) return false;
    previousHash = eventHash;
  }
  return true;
}

export function syntheticJourney(persona, outcome = "accepted_pending_delivery") {
  const correlationId = randomUUID();
  return {
    persona,
    correlationId,
    steps: ["page_view", "cta_click", "form_start", "form_submit", outcome],
    pii: "synthetic-only",
    evidenceLevel: "E2",
  };
}
