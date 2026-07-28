import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
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
test("publishes second-level journeys for strategic audiences",async()=>{const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("depth-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);const env={ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};for(const [path,marker] of [["/segmentos","Aprofundar este segmento"],["/partnerships","Ver critérios e responsabilidades"],["/ive","Abrir estágio"],["/capital","Protocolo da bifurcação"],["/governanca","Instrumentos operacionais"]]){const response=await worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),env,ctx);assert.equal(response.status,200);assert.match(await response.text(),new RegExp(marker,"i"))}});
test("operations retry endpoint is closed without its server-side secret",async()=>{const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("ops-auth-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);const response=await worker.fetch(new Request("http://localhost/api/operations/retry-leads",{method:"POST"}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});assert.equal(response.status,401);assert.equal((await response.json()).code,"unauthorized")});
test("analytics gateway validates its allowlist and accepts safe first-party events",async()=>{const workerUrl=new URL("../dist/server/index.js",import.meta.url);workerUrl.searchParams.set("events-test",`${Date.now()}`);const {default:worker}=await import(workerUrl.href);const env={ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};const invalid=await worker.fetch(new Request("http://localhost/api/events",{method:"POST",headers:{"content-type":"application/json","origin":"http://localhost"},body:JSON.stringify({event:"unknown"})}),env,ctx);assert.equal(invalid.status,422);const valid=await worker.fetch(new Request("http://localhost/api/events",{method:"POST",headers:{"content-type":"application/json","origin":"http://localhost"},body:JSON.stringify({event:"page_view",path:"/",properties:{section:"home"}})}),env,ctx);assert.equal(valid.status,202);assert.equal((await valid.json()).ok,true)});
test("maps every institutional persona to an explicit operational intent",async()=>{const source=await readFile(new URL("../app/content.ts",import.meta.url),"utf8");for(const [persona,intent] of [["lider","solution"],["publico","relations"],["inovacao","initiative"],["tecnologia","solution"],["parceiro","partnership"],["talento","talent"],["capital","capital"]])assert.match(source,new RegExp(`id:"${persona}"[^}]+intent:"${intent}"`))});
