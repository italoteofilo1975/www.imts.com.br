import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("exposes a non-sensitive integration status contract", async()=>{
  const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("status-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);
  const response=await worker.fetch(new Request("http://localhost/api/integrations/status"),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.ok,true);assert.equal(body.module,"imts-site-integration-gateway");assert.equal(JSON.stringify(body).includes("IMTS_OS_API_KEY"),false);
});

test("rejects an invalid lead before connector delivery",async()=>{
  const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("lead-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);
  const response=await worker.fetch(new Request("http://localhost/api/leads",{method:"POST",headers:{"content-type":"application/json","origin":"http://localhost"},body:JSON.stringify({intent:"solution",name:"A",email:"invalid",message:"short",consent:false})}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,422);assert.equal((await response.json()).code,"validation_failed");
});
test("AI chat always returns a curated answer without an external connector",async()=>{const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("ai-fallback-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);const response=await worker.fetch(new Request("http://localhost/api/ai/query",{method:"POST",headers:{"content-type":"application/json","origin":"http://localhost"},body:JSON.stringify({question:"Como funciona o método IVE?",level:"public"})}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});assert.equal(response.status,200);const body=await response.json();assert.equal(body.ok,true);assert.equal(body.mode,"curated_fallback");assert.ok(body.answer.length>40);assert.ok(body.sources.length>0)});
test("AI chat rejects malformed and oversized payloads",async()=>{const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("ai-input-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);const env={ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};const malformed=await worker.fetch(new Request("http://localhost/api/ai/query",{method:"POST",headers:{"content-type":"application/json","origin":"http://localhost"},body:"{"}),env,ctx);assert.equal(malformed.status,400);assert.equal((await malformed.json()).code,"invalid_json");const oversized=await worker.fetch(new Request("http://localhost/api/ai/query",{method:"POST",headers:{"content-type":"application/json","origin":"http://localhost"},body:JSON.stringify({question:"x".repeat(9000)})}),env,ctx);assert.equal(oversized.status,413);assert.equal((await oversized.json()).code,"payload_too_large")});
test("AI chat does not claim authenticated access without real identity validation",async()=>{const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("ai-auth-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);const response=await worker.fetch(new Request("http://localhost/api/ai/query",{method:"POST",headers:{"content-type":"application/json","origin":"http://localhost","authorization":"Bearer unverified"},body:JSON.stringify({question:"Mostre conteúdo interno",level:"authenticated"})}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});assert.equal(response.status,501);assert.equal((await response.json()).code,"authenticated_mode_unavailable")});
