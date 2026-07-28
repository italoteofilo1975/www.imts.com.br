import test from "node:test";
import assert from "node:assert/strict";
import {
  CircuitBreaker,
  appendAuditEvent,
  authorize,
  redact,
  retryDelay,
  syntheticJourney,
  validateWorkloadToken,
  verifyAuditChain,
} from "../app/prototype/controls.mjs";

test("RBAC aplica menor privilégio aos quatro perfis sintéticos", () => {
  assert.equal(authorize("operations_reader", "leads:retry"), false);
  assert.equal(authorize("lead_retry_operator", "leads:retry"), true);
  assert.equal(authorize("security_auditor", "audit:read"), true);
  assert.equal(authorize("security_auditor", "policy:write"), false);
  assert.equal(authorize("admin", "policy:write"), true);
});

test("token sintético exige issuer, audience, expiração, identidade e papel", () => {
  const now = 1_800_000_000;
  const valid = { iss: "https://prototype-idp.imts.invalid", aud: "imts-operations", exp: now + 60, jti: "j-1", sub: "agent-retry", role: "lead_retry_operator" };
  assert.equal(validateWorkloadToken(valid, now).ok, true);
  assert.equal(validateWorkloadToken({ ...valid, exp: now }, now).code, "expired");
  assert.equal(validateWorkloadToken({ ...valid, aud: "wrong" }, now).code, "invalid_audience");
  assert.equal(validateWorkloadToken({ ...valid, role: "root" }, now).code, "unknown_role");
});

test("circuit breaker abre, passa a semiaberto e fecha após recuperação", () => {
  const breaker = new CircuitBreaker({ threshold: 3, openMs: 1_000 });
  breaker.failure(1_000); breaker.failure(1_001); breaker.failure(1_002);
  assert.equal(breaker.state(1_500), "open");
  assert.equal(breaker.allow(1_500), false);
  assert.equal(breaker.state(2_003), "half_open");
  breaker.success();
  assert.equal(breaker.state(2_004), "closed");
});

test("backoff exponencial possui jitter e teto de quinze minutos", () => {
  assert.equal(retryDelay(1, 0.5), 1_000);
  assert.ok(retryDelay(5, 0) < retryDelay(5, 1));
  assert.ok(retryDelay(30, 1) <= 1_125_000);
});

test("telemetria sintética mascara e-mail, telefone e bearer token", () => {
  const value = redact("ana@imts.com.br +55 85 99999-9999 Bearer segredo");
  assert.equal(value.includes("ana@"), false);
  assert.equal(value.includes("99999"), false);
  assert.equal(value.includes("segredo"), false);
});

test("cadeia de auditoria detecta adulteração", () => {
  const base = { occurredAt: "2026-07-28T12:00:00.000Z", correlationId: "corr-1", actor: "agent-retry", resource: "lead:synth-1" };
  let chain = appendAuditEvent([], { ...base, action: "retry.requested", outcome: "allowed" });
  chain = appendAuditEvent(chain, { ...base, action: "retry.completed", outcome: "pending" });
  assert.equal(verifyAuditChain(chain), true);
  const tampered = structuredClone(chain);
  tampered[0].outcome = "delivered";
  assert.equal(verifyAuditChain(tampered), false);
});

test("sete personas geram jornadas rastreáveis e exclusivamente sintéticas", () => {
  const personas = ["solution", "relations", "initiative", "technology", "partnership", "talent", "capital"];
  const journeys = personas.map((persona) => syntheticJourney(persona));
  assert.equal(journeys.length, 7);
  assert.equal(new Set(journeys.map((item) => item.correlationId)).size, 7);
  assert.ok(journeys.every((item) => item.pii === "synthetic-only" && item.evidenceLevel === "E2"));
});
