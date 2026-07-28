import test from "node:test";
import assert from "node:assert/strict";
import {
  SharedPrototypeQueue,
  SharedRateLimiter,
  anonymizeExpired,
  classifyFailure,
  correlationId,
} from "../app/prototype/operational-flow.mjs";

test("claim concorrente entrega cada lead a somente um worker", async () => {
  const queue = new SharedPrototypeQueue(Array.from({ length: 100 }, (_, i) => ({ id: `lead-${i}`, correlationId: correlationId() })));
  const claimed = await Promise.all(Array.from({ length: 10 }, (_, i) => queue.claim(`worker-${i}`, 1_000)));
  assert.equal(new Set(claimed.filter(Boolean).map((row) => row.id)).size, 10);
});

test("lease expirado é recuperado e lease incorreto não finaliza", async () => {
  const queue = new SharedPrototypeQueue([{ id: "lead-1", correlationId: correlationId() }]);
  const first = await queue.claim("worker-a", 1_000, 100);
  const second = await queue.claim("worker-b", 1_101, 100);
  assert.equal(second.id, first.id);
  assert.equal(queue.finalize(second.id, first.leaseToken, { ok: true }, 1_102), false);
  assert.equal(queue.finalize(second.id, second.leaseToken, { ok: true }, 1_102), true);
});

test("Retry-After delta e HTTP-date são respeitados com teto", () => {
  const now = Date.parse("2026-07-28T12:00:00Z");
  assert.equal(classifyFailure({ status: 429, retryAfter: "120", now }).nextAttemptAt, now + 120_000);
  assert.equal(classifyFailure({ status: 503, retryAfter: "Tue, 28 Jul 2026 12:05:00 GMT", now }).nextAttemptAt, now + 300_000);
});

test("falha permanente e exaustão seguem para dead-letter", () => {
  assert.equal(classifyFailure({ status: 400 }).state, "dead");
  assert.equal(classifyFailure({ status: 500, attempt: 5 }).state, "dead");
});

test("rate limiting compartilhado preserva limite e Retry-After", () => {
  const limiter = new SharedRateLimiter(2, 60_000);
  assert.equal(limiter.consume("subject", 1_000).allowed, true);
  assert.equal(limiter.consume("subject", 1_001).allowed, true);
  const blocked = limiter.consume("subject", 1_002);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 60);
});

test("correlation-id inválido é regenerado e UUID válido é preservado", () => {
  const valid = "550e8400-e29b-41d4-a716-446655440000";
  assert.equal(correlationId(valid), valid);
  assert.notEqual(correlationId("PII-or-arbitrary-text"), "PII-or-arbitrary-text");
});

test("anonimização é idempotente e respeita retenção e legal hold", () => {
  const rows = [
    { id: "expired", retentionUntil: 1, name: "Ana", email: "ana@example.com", organization: "X", role: "Y", message: "Z" },
    { id: "hold", retentionUntil: 1, legalHold: true, name: "Bia", email: "bia@example.com" },
    { id: "future", retentionUntil: 9_999, name: "Caio", email: "caio@example.com" },
  ];
  assert.equal(anonymizeExpired(rows, 2_000), 1);
  assert.equal(anonymizeExpired(rows, 2_000), 0);
  assert.equal(rows[0].name, "[anonymized]");
  assert.equal(rows[1].name, "Bia");
  assert.equal(rows[2].name, "Caio");
});
