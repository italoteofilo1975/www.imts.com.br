#!/usr/bin/env node
/**
 * J8 — CONEXÕES EXTERNAS (contrato das rotas /api/*)
 * Bateria de evidências das integrações: leads (D1+Resend emulados ou reais),
 * IMTS.OS assistant (Groq), eventos/analytics, gateway de integrações, guardas.
 *
 * Uso: node simular_externas.mjs --base http://localhost:3200 [--live]
 *      --live → roda contra produção (evidência real, exige D1/Groq ativos)
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const BASE = getArg("base", "http://localhost:3200").replace(/\/$/, "");
const LIVE = args.includes("--live");
const REL = join(ROOT, "relatorios");
mkdirSync(REL, { recursive: true });

const resultados = [];
const passo = (nome, ok, detalhe, evidencia = null) => { resultados.push({ nome, ok, detalhe, evidencia, ts: new Date().toISOString() }); console.log(`${ok ? "✓" : "✗"} ${nome} — ${detalhe}`); };

async function api(metodo, rota, corpo, headers = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(BASE + rota, { method: metodo, headers: { "content-type": "application/json", ...headers }, body: corpo ? JSON.stringify(corpo) : undefined, signal: AbortSignal.timeout(10000) });
    let json = null; try { json = await res.json(); } catch { /* sem corpo */ }
    return { status: res.status, json, headers: res.headers, ms: Date.now() - t0 };
  } catch (e) { return { status: 0, json: null, erro: String(e).slice(0, 120), ms: Date.now() - t0 }; }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const leadValido = { intent: "solution", name: "Agente Autopiloto J8", email: "autopiloto.j8@validacao.local", organization: "IMTS", role: "validacao externa", message: "Evidência de conexão externa gerada por agente autopiloto. Pode descartar.", consent: true };

// 1. happy path leads
{
  const r = await api("POST", "/api/leads", leadValido, { origin: BASE });
  const ref = r.json?.reference || "";
  passo("leads:happy-path", r.status === 202 && r.json?.ok === true && UUID.test(ref), `HTTP ${r.status} · reference=${ref.slice(0, 8)}… · durable=${r.json?.durable}`, { tipo: "lead", reference: ref });
  passo("leads:correlation-id", !!r.headers?.get("x-correlation-id"), `x-correlation-id=${(r.headers?.get("x-correlation-id") || "").slice(0, 8)}…`);
}
// 2. origin cruzado rejeitado
{
  const r = await api("POST", "/api/leads", leadValido, { origin: "https://hostil.example" });
  passo("leads:origin-rejected", r.status === 403 && r.json?.code === "origin_rejected", `HTTP ${r.status} · code=${r.json?.code}`);
}
// 3. validação de payload
{
  const r = await api("POST", "/api/leads", { intent: "solution", name: "X", email: "invalido", message: "curta", consent: false }, { origin: BASE });
  passo("leads:validation-failed", r.status === 422 && r.json?.code === "validation_failed", `HTTP ${r.status} · code=${r.json?.code}`);
}
// 4. honeypot silencioso
{
  const r = await api("POST", "/api/leads", { ...leadValido, website: "http://spam.bot" }, { origin: BASE });
  passo("leads:honeypot", r.status === 202 && r.json?.ok === true && !r.json?.destination, `HTTP ${r.status} (aceito em silêncio, sem encaminhamento)`);
}
// 5. IMTS.OS assistant
{
  const r = await api("POST", "/api/ai/query", { question: "Como submeter uma iniciativa ao IVE?", level: "public" }, { origin: BASE });
  passo("ai:query-publico", r.status === 200 && !!r.json?.answer, `HTTP ${r.status} · mode=${r.json?.mode} · resposta=${(r.json?.answer || "").length} chars`);
}
// 6. nível autenticado indisponível (contrato 501)
{
  const r = await api("POST", "/api/ai/query", { question: "dados internos", level: "authenticated" }, { origin: BASE });
  passo("ai:authenticated-501", r.status === 501 && r.json?.code === "authenticated_mode_unavailable", `HTTP ${r.status} · code=${r.json?.code}`);
}
// 7. eventos analytics
{
  const r = await api("POST", "/api/events", { event: "form_submit", path: "/conectar", properties: { jornada: "J8" } }, { origin: BASE });
  passo("events:durable", r.status === 202 && r.json?.durable === true, `HTTP ${r.status} · durable=${r.json?.durable}`);
  const r2 = await api("POST", "/api/events", { event: "evento_proibido" }, { origin: BASE });
  passo("events:allowlist", r2.status === 422, `HTTP ${r2.status} (evento fora da allowlist rejeitado)`);
}
// 8. gateway de integrações
{
  const r = await api("GET", "/api/integrations/status");
  passo("integrations:gateway", r.status === 200 && r.json?.module === "imts-site-integration-gateway", `HTTP ${r.status} · module=${r.json?.module} · v=${r.json?.version}`);
}
// 9. operação protegida sem credencial
{
  const r = await api("POST", "/api/operations/retry-leads", {}, { origin: BASE });
  passo("operations:guarda", r.status === 401 || r.status === 403, `HTTP ${r.status} (operação protegida recusa acesso anônimo)`);
}

// evidências registradas pelo conector mock (quando aplicável)
const evidJsonl = join(REL, "evidencias-externas.jsonl");
if (existsSync(evidJsonl)) {
  const linhas = readFileSync(evidJsonl, "utf8").trim().split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const porTipo = {};
  for (const e of linhas) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
  passo("evidencias:registradas", linhas.length >= 3, `${linhas.length} evidências em JSONL: ${Object.entries(porTipo).map(([t, n]) => `${t}×${n}`).join(", ")}`);
}

const okCount = resultados.filter(r => r.ok).length;
const score = Math.round((okCount / resultados.length) * 100);
writeFileSync(join(REL, "externas-j8.json"), JSON.stringify({ base: BASE, live: LIVE, quando: new Date().toISOString(), score, resultados }, null, 2));
console.log(`\n📄 J8 Conexões externas — Score: ${score}/100 (${okCount}/${resultados.length}) · relatórios/externas-j8.json`);
process.exit(score === 100 ? 0 : 2);
