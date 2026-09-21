#!/usr/bin/env node
/**
 * VALIDAÇÃO AUTOPILOTOS — executor de simulações (sem dependências externas)
 * Uso: node simular.mjs --base http://localhost:3000 [--agente auditor-qualidade] [--live-forms]
 *        --live-forms: POSTa um lead de teste em /api/leads (rode contra produção/CI com D1 ativo)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const BASE = getArg("base", "http://localhost:3000").replace(/\/$/, "");
const ONLY = getArg("agente", null);

const plano = JSON.parse(readFileSync(join(ROOT, "jornadas", "jornadas.json"), "utf8"));
mkdirSync(join(ROOT, "relatorios"), { recursive: true });

// ---------- utilidades ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchPage(path, timeoutMs = 8000) {
  const t0 = Date.now();
  try {
    const res = await fetch(BASE + path, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
    const body = await res.text();
    return { path, status: res.status, ms: Date.now() - t0, html: body, finalUrl: res.url };
  } catch (e) {
    return { path, status: 0, ms: Date.now() - t0, html: "", error: String(e).slice(0, 160) };
  }
}
const pick = (html, re) => { const m = html.match(re); return m ? m[1].trim() : null; };
const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function analisar(page) {
  const h = page.html;
  const achados = [];
  const checks = {};
  const title = pick(h, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1s = [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1]));
  const headings = [...h.matchAll(/<h([1-6])[^>]*>/gi)].map((m) => Number(m[1]));
  const links = [...h.matchAll(/<a\s[^>]*href="([^"]+)"/gi)].map((m) => m[1]);
  const imgs = [...h.matchAll(/<img\s[^>]*>/gi)].map((m) => m[0]);
  const forms = [...h.matchAll(/<form[^>]*>/gi)].map((m) => m[0]);
  const textoVisivel = stripTags(h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, ""));

  checks.title = Boolean(title && title.length >= 5);
  checks.description = /<meta[^>]+name="description"[^>]+content="[^"]+"/i.test(h) || /<meta[^>]+content="[^"]+"[^>]+name="description"/i.test(h);
  checks.lang = /<html[^>]+lang="pt-BR"/i.test(h);
  checks.h1_unico = h1s.length === 1;
  checks.conteudo = textoVisivel.length > 100;
  checks.main = /<main[\s>]/i.test(h);
  checks.sem_erro_framework = !/Application error|__next_error__|Unhandled Runtime Error|Minified React error/i.test(h);

  const imgsSemAlt = imgs.filter((t) => !/alt="[^"]+"/.test(t) && !/alt=""/.test(t)).length;
  const imgsSemSrc = imgs.filter((t) => !/src="[^"]+"/.test(t)).length;
  if (imgsSemAlt > 0) achados.push({ sev: "P2", tipo: "img-sem-alt", qtd: imgsSemAlt });
  if (imgsSemSrc > 0) achados.push({ sev: "P1", tipo: "img-sem-src", qtd: imgsSemSrc });

  let salto = false;
  for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i - 1] > 1) { salto = true; break; }
  if (salto) achados.push({ sev: "P2", tipo: "hierarquia-headings-com-salto" });
  if (!checks.main) achados.push({ sev: "P2", tipo: "sem-landmark-main" });
  if (page.status !== 200) achados.push({ sev: "P1", tipo: "http-status", status: page.status });
  if (!checks.title) achados.push({ sev: "P2", tipo: "title-ausente-ou-curto" });
  if (!checks.description) achados.push({ sev: "P2", tipo: "meta-description-ausente" });
  if (!checks.h1_unico) achados.push({ sev: "P2", tipo: "h1_ausente_ou_multiplo", qtd: h1s.length });
  if (!checks.conteudo) achados.push({ sev: "P1", tipo: "tela-morta", chars: textoVisivel.length });
  if (!checks.sem_erro_framework) achados.push({ sev: "P1", tipo: "erro-de-renderizacao" });
  if (forms.length > 0 && !forms.some((f) => /action=/.test(f))) achados.push({ sev: "P2", tipo: "form-sem-action" });

  const internal = links.filter((l) => l.startsWith("/") && !l.startsWith("//"));
  return { title, h1: h1s[0] || null, links: internal, checks, achados, forms: forms.length, textoChars: textoVisivel.length };
}

async function checarLinks(agente, origem, links, rotasConhecidas, visitados, profundidade = 0) {
  const quebras = [];
  const alvos = [...new Set(links)].filter((l) => !l.startsWith("#") && !/\.(png|jpg|jpeg|webp|svg|ico|css|js|txt|xml)/i.test(l));
  for (const alvo of alvos.slice(0, 40)) {
    if (visitados.has(alvo)) continue;
    visitados.add(alvo);
    const alvoPath = alvo.split("#")[0].split("?")[0];
    const r = await fetchPage(alvoPath, 6000);
    if (r.status >= 400 || r.status === 0) {
      quebras.push({ origem, alvo, status: r.status, sev: "P1" });
    } else if (profundidade < 1 && agente === "auditor-qualidade" && r.html && alvoPath.startsWith("/solucoes/") === false) {
      // auditor rastreia um segundo nível
      const a = analisar(r);
      for (const q of await checarLinks(agente, alvoPath, a.links, rotasConhecidas, visitados, profundidade + 1)) quebras.push(q);
    }
  }
  return quebras;
}

// ---------- execução ----------
async function executarJornada(agenteId, jornada, rotasEfetivas) {
  const passos = [];
  const achados = [];
  const rotas = jornada.rotas === "TODAS" ? rotasEfetivas : jornada.rotas;
  let expandidas = [];
  for (const r of rotas) {
    if (r === "/solucoes/[slug]") {
      const s = await fetchPage("/solucoes");
      if (s.html) {
        const slugs = [...new Set([...s.html.matchAll(/href="(\/solucoes\/[a-z0-9-]+)"/gi)].map((m) => m[1]))];
        expandidas.push(...slugs.slice(0, 12));
      }
    } else expandidas.push(r);
  }
  const visitados = new Set();
  for (const rota of expandidas) {
    await sleep(120); // ritmo humano
    const page = await fetchPage(rota);
    if (!page.html || page.status !== 200) {
      passos.push({ rota, status: page.status, ms: page.ms, title: null, h1: null, erro: page.error || "sem-conteudo" });
      achados.push({ rota, sev: "P1", tipo: "rota-inacessivel", status: page.status });
      continue;
    }
    const a = analisar(page);
    passos.push({ rota, status: page.status, ms: page.ms, title: a.title, h1: a.h1, textoChars: a.textoChars, forms: a.forms });
    for (const ad of a.achados) achados.push({ rota, ...ad });
    if (jornada.id === "J0" || jornada.funcoes?.includes("links-internos")) {
      const quebras = await checarLinks(agenteId, rota, a.links, rotasEfetivas, visitados);
      for (const q of quebras) achados.push({ rota: q.origem, tipo: "link-quebrado", alvo: q.alvo, status: q.status, sev: q.sev });
    }
  }
  const p1 = achados.filter((x) => x.sev === "P1").length;
  const p2 = achados.filter((x) => x.sev === "P2").length;
  const veredito = p1 > 0 ? "FAIL" : p2 > 0 ? "PASS_COM_RESSALVAS" : "PASS";
  return { agente: agenteId, jornada: jornada.id, nome: jornada.nome, rotasExecutadas: expandidas.length, passos, achados, p1, p2, veredito };
}

async function main() {
  const alvo = ONLY || "todos";
  console.log(`🤖 Validação Autopilotos — base: ${BASE} · agente: ${alvo}`);
  const health = await fetchPage("/", 8000);
  if (health.status !== 200) {
    console.error(`❌ Base inacessível (HTTP ${health.status}). Suba o app: npm run install:ci && npm run build && npm start`);
    process.exit(2);
  }
  // resolve slugs reais
  const s = await fetchPage("/solucoes");
  const slugs = s.html ? [...new Set([...s.html.matchAll(/href="(\/solucoes\/[a-z0-9-]+)"/gi)].map((m) => m[1]))] : [];
  const rotasEfetivas = [...plano.rotas.filter((r) => r !== "/solucoes/[slug]"), ...slugs];

  const resultados = [];
  for (const agente of plano.agentes) {
    if (ONLY && agente.id !== ONLY) continue;
    console.log(`▶ ${agente.id} (${agente.persona.slice(0, 60)}…)`);
    for (const jid of agente.jornadas) {
      const jornada = plano.jornadas.find((j) => j.id === jid);
      const r = await executarJornada(agente.id, jornada, rotasEfetivas);
      resultados.push(r);
      console.log(`  ${jornada.id} ${jornada.nome}: ${r.veredito} (${r.rotasExecutadas} telas · ${r.p1}×P1 · ${r.p2}×P2)`);
    }
  }

  // smoke de formulário em ambiente com conector D1 ativo (--live-forms; contra produção/CI)
  if (args.includes("--live-forms")) {
    console.log("▶ smoke-api (POST /api/leads — exige conector D1 ativo)");
    let liveStatus = 0, liveCorpo = "";
    try {
      const res = await fetch(BASE + "/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ intent: "solution", name: "Agente Autopiloto CI", email: "autopiloto.ci@validacao.local", organization: "IMTS", role: "validacao", message: "Smoke test automatizado da suíte de autopilotos. Pode descartar.", consent: true }),
      });
      liveStatus = res.status;
      liveCorpo = (await res.text()).slice(0, 200);
    } catch (e) { liveCorpo = String(e).slice(0, 200); }
    const liveOk = liveStatus >= 200 && liveStatus < 300;
    writeFileSync(join(ROOT, "relatorios", "live-forms.json"), JSON.stringify({ base: BASE, quando: new Date().toISOString(), postLeads: { status: liveStatus, corpo: liveCorpo, ok: liveOk } }, null, 2));
    console.log(`  POST /api/leads → HTTP ${liveStatus} ${liveOk ? "✓" : "✗ (conector D1 inativo ou não implantado)"}`);
    if (!liveOk) process.exitCode = 2;
  }

  // relatórios
  for (const agente of plano.agentes) {
    if (ONLY && agente.id !== ONLY) continue;
    const rs = resultados.filter((r) => r.agente === agente.id);
    writeFileSync(join(ROOT, "relatorios", `${agente.id}.json`), JSON.stringify({ agente, base: BASE, quando: new Date().toISOString(), simulacoes: rs }, null, 2));
    let md = `# Simulação — ${agente.id}\n\n**Persona:** ${agente.persona}\n**Base:** ${BASE} · ${new Date().toISOString()}\n\n`;
    for (const r of rs) {
      md += `## ${r.jornada} · ${r.nome} — **${r.veredito}**\n\n| Tela | Status | ms | Title | H1 |\n|---|---|---|---|---|\n`;
      for (const p of r.passos) md += `| ${p.rota} | ${p.status} | ${p.ms} | ${(p.title || "—").slice(0, 40)} | ${(p.h1 || "—").slice(0, 40)} |\n`;
      if (r.achados.length) { md += `\n**Achados:**\n`; for (const a of r.achados) md += `- [${a.sev}] ${a.rota} — ${a.tipo}${a.alvo ? ` → ${a.alvo} (HTTP ${a.status})` : ""}${a.qtd ? ` (×${a.qtd})` : ""}\n`; }
      md += "\n";
    }
    writeFileSync(join(ROOT, "relatorios", `${agente.id}.md`), md);
  }

  // consolidado
  let totalTelas = 0, somaScore = 0, totalP1 = 0, totalP2 = 0;
  let cons = `# CONSOLIDADO — Validação Autopilotos\n\n**Base:** ${BASE} · ${new Date().toISOString()}\n\n| Agente | Jornada | Telas | P1 | P2 | Veredito |\n|---|---|---|---|---|---|\n`;
  for (const r of resultados) {
    const score = r.veredito === "PASS" ? 100 : r.veredito === "PASS_COM_RESSALVAS" ? 80 : 0;
    totalTelas += r.rotasExecutadas; somaScore += score * r.rotasExecutadas;
    totalP1 += r.p1; totalP2 += r.p2;
    cons += `| ${r.agente} | ${r.jornada} ${r.nome} | ${r.rotasExecutadas} | ${r.p1} | ${r.p2} | ${r.veredito} |\n`;
  }
  cons += `\n**Score geral do projeto:** ${totalTelas ? Math.round(somaScore / totalTelas) : 0}/100 · **Achados:** ${totalP1}×P1 · ${totalP2}×P2\n`;
  writeFileSync(join(ROOT, "relatorios", "CONSOLIDADO.md"), cons);
  console.log(`\n📄 Relatórios em relatorios/ — Score geral: ${totalTelas ? Math.round(somaScore / totalTelas) : 0}/100 · ${totalP1}×P1 · ${totalP2}×P2`);
}

main().catch((e) => { console.error(e); process.exit(1); });
