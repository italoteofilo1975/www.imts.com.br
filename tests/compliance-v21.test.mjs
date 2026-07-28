import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {e4Gate,rotateKeys,wcagMatrix} from "../app/prototype/compliance-v21.mjs";

test("matriz WCAG possui 28 cenários únicos e sete verificações por cenário",()=>{
  const matrix=wcagMatrix();
  assert.equal(matrix.length,28);
  assert.equal(new Set(matrix.map(x=>x.id)).size,28);
  assert.ok(matrix.every(x=>x.assertions.length===7&&x.evidenceLevel==="E2"));
});

test("rotação de chaves exige overlap e revoga apenas a chave anterior",()=>{
  assert.deepEqual(rotateKeys(["kid-2026-a","kid-2026-b"],"kid-2026-a","kid-2026-b"),{
    before:["kid-2026-a","kid-2026-b"],after:["kid-2026-b"],revoked:["kid-2026-a"],
  });
  assert.throws(()=>rotateKeys(["kid-a"],"kid-a","kid-b"));
});

test("manifesto E4 nunca promove simulação E2",()=>{
  for(const status of ["NOT_RUN","PASS","FAIL","BLOCKED"])assert.equal(e4Gate("dns",status).evidenceLevel,"E4");
  assert.throws(()=>e4Gate("dns","SIMULATED_PASS"));
});

test("fluxo operacional usa rate limit e circuit breaker persistentes",async()=>{
  const source=await readFile(new URL("../app/api/operations/retry-leads/route.ts",import.meta.url),"utf8");
  assert.match(source,/sharedRateLimit/);
  assert.match(source,/circuitPermission/);
  assert.match(source,/recordCircuit/);
});
