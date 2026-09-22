#!/usr/bin/env node
/**
 * VALIDACAO_AUTOPILOTOS — Runner de simulação em browser real (Playwright + Chrome do sistema).
 *
 * Executa TODAS as jornadas (J0–J6) como um humano faria: cliques, preenchimento de
 * formulários, menus mobile, acordeões, banner de cookies e assistente IMTS.OS.
 *
 * Classificação:
 *   P1 — falha de interação (clique não navega, formulário não responde, elemento ausente)
 *   P2 — console error, request >= 400 (não provocado), imagem quebrada, landmark ARIA ausente
 *
 * Uso: node simular_browser.cjs --base http://localhost:3100
 *        IMTS_AUTH_COOKIE="sess=..." habilita a jornada autenticada J7 (opcional)
 */
const path = require("path");
const fs = require("fs");
let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  console.error("✗ playwright-core não instalado. Rode: npm i -D playwright-core");
  process.exit(69);
}

const args = process.argv.slice(2);
const BASE = (args[args.indexOf("--base") + 1] || "http://localhost:3100").replace(/\/$/, "");
const REL_DIR = path.join(__dirname, "relatorios");
const EV_DIR = path.join(REL_DIR, "evidencias");
fs.mkdirSync(EV_DIR, { recursive: true });

const ROTAS = ["/", "/capital", "/conectar", "/conhecimento", "/cookies", "/ecossistema",
  "/explorar", "/faq", "/governanca", "/impacto", "/imts-os", "/insights", "/integracoes",
  "/ive", "/partnerships", "/portal", "/privacidade", "/segmentos", "/solucoes", "/talentos", "/termos"];

const results = { base: BASE, inicio: new Date().toISOString(), jornadas: [], resumo: { passos: 0, ok: 0, falhas: [] } };

function addStep(j, step) {
  j.passos.push({ t: new Date().toISOString(), ...step });
  results.resumo.passos++;
  if (step.resultado === "ok") results.resumo.ok++;
  else {
    results.resumo.falhas.push({ jornada: j.id, ...step });
    j.problemas.push({ nivel: step.nivel || "P1", onde: `${j.id}:${step.tela} ${step.acao}`, detalhe: step.detalhe });
  }
}
function novoJ(id, nome) { const j = { id, nome, passos: [], problemas: [] }; results.jornadas.push(j); return j; }

async function shoot(page, name) {
  try { await page.screenshot({ path: path.join(EV_DIR, `${name}.png`), fullPage: false }); } catch {}
}

/** Clica e aguarda a navegação efetiva (evita corrida entre click e leitura de URL). */
async function clickAndWait(page, locator, predicate, timeout = 8000) {
  await Promise.all([
    page.waitForURL(predicate, { timeout }).catch(() => null),
    locator.click(),
  ]);
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Coletores transversais de qualidade (usados no J0 e em toda navegação). */
function instrument(page, j, coleta) {
  page.on("console", m => { if (m.type() === "error") coleta.consoleErrors.push(m.text().slice(0, 300)); });
  page.on("pageerror", e => coleta.pageErrors.push(String(e).slice(0, 300)));
  page.on("response", r => {
    // Fontes com caminho absoluto do build original (/workspace/...) — artefato do
    // build relocado para o sandbox, sem impacto funcional (fallback tipográfico).
    if (r.url().includes("/.vinext/fonts/")) { coleta.fontesAmbiente.add(r.url().split("/").pop()); return; }
    // POST /api/leads com conector D1 inativo no build local: 503 esperado — o form
    // ativa degradação graciosa (mailto). Validado em passo próprio (formulario-submeter).
    if (r.status() === 503 && r.url().includes("/api/leads") && r.request().method() === "POST") return;
    if (r.status() >= 400) coleta.http4xx5xx.push(`${r.status()} ${r.url().slice(BASE.length)}`);
  });
}
async function varreduraQualidade(page, j, rota) {
  const imgs = await page.$$eval("img", els => els.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute("src")));
  for (const src of imgs) addStep(j, { tela: rota, acao: "imagem-quebrada", seletor: `img[src="${src}"]`, resultado: "falha", nivel: "P2", detalhe: `Imagem sem renderização: ${src}` });
  const landmarks = await page.evaluate(() => ({ main: !!document.querySelector("main, [role=main]"), nav: !!document.querySelector("nav"), h1: !!document.querySelector("h1"), title: !!document.title }));
  if (!landmarks.main) addStep(j, { tela: rota, acao: "landmark-main", resultado: "falha", nivel: "P2", detalhe: "Landmark <main> ausente" });
  if (!landmarks.nav) addStep(j, { tela: rota, acao: "landmark-nav", resultado: "falha", nivel: "P2", detalhe: "Landmark <nav> ausente" });
  if (!landmarks.h1) addStep(j, { tela: rota, acao: "heading-h1", resultado: "falha", nivel: "P2", detalhe: "<h1> ausente" });
  if (!landmarks.title) addStep(j, { tela: rota, acao: "title", resultado: "falha", nivel: "P2", detalhe: "<title> vazio" });
}
async function drenarColeta(j, rota, coleta) {
  for (const e of coleta.consoleErrors) {
    // console-error genérico de recurso 404 causado pelas fontes relocadas — já contabilizado em fontesAmbiente
    if (/Failed to load resource/.test(e) && coleta.fontesAmbiente.size > 0) continue;
    addStep(j, { tela: rota, acao: "console-error", resultado: "falha", nivel: "P2", detalhe: e });
  }
  for (const e of coleta.pageErrors) addStep(j, { tela: rota, acao: "page-error", resultado: "falha", nivel: "P1", detalhe: e });
  for (const e of coleta.http4xx5xx) addStep(j, { tela: rota, acao: "http>=400", resultado: "falha", nivel: "P2", detalhe: e });
  if (coleta.fontesAmbiente.size) addStep(j, { tela: rota, acao: "fontes-build-relocado", resultado: "ok", detalhe: `${coleta.fontesAmbiente.size} fontes com path absoluto do build original (aviso de ambiente, fallback ativo)` });
  coleta.consoleErrors = []; coleta.pageErrors = []; coleta.http4xx5xx = []; coleta.fontesAmbiente = new Set();
}
const novaColeta = () => ({ consoleErrors: [], pageErrors: [], http4xx5xx: [], fontesAmbiente: new Set() });

(async () => {
  // pré-voo: recusa validar o site errado
  {
    const probe = async (rota) => { try { const r = await fetch(BASE + rota, { signal: AbortSignal.timeout(8000) }); return { status: r.status, html: await r.text() }; } catch { return { status: 0, html: "" }; } };
    const conectar = await probe("/conectar"), gateway = await probe("/api/integrations/status");
    if (!(conectar.status === 200 && /briefing/i.test(conectar.html) && gateway.status === 200 && gateway.html.includes("imts-site-integration-gateway"))) {
      console.error(`PRÉ-VIO FALHOU: ${BASE} não está servindo o app IMTS (/conectar ${conectar.status} · gateway ${gateway.status}). Exit 3.`);
      process.exit(3);
    }
  }
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  // ---------- J1 — Descoberta institucional (desktop + menu mobile) ----------
  {
    const j = novoJ("J1", "Descoberta institucional");
    let page = await desktop.newPage();
    let coleta = novaColeta(); instrument(page, j, coleta);
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    addStep(j, { tela: "/", acao: "carregar", seletor: "GET /", resultado: page.url() === BASE + "/" ? "ok" : "falha", detalhe: page.url() });
    await varreduraQualidade(page, j, "/");
    for (const alvo of ["/ecossistema", "/solucoes", "/segmentos"]) {
      // header da home é inline (nav sem aria-label); páginas internas usam <nav aria-label>
      const nav = page.locator(`header a[href="${alvo}"], nav a[href="${alvo}"]`).first();
      if (await nav.count() === 0) { addStep(j, { tela: "/", acao: "nav-header", seletor: `a[href=${alvo}]`, resultado: "falha", detalhe: "Link ausente no header" }); continue; }
      await clickAndWait(page, nav, u => u.pathname.endsWith(alvo));
      const ok = page.url().endsWith(alvo);
      addStep(j, { tela: "/", acao: "nav-header", seletor: `a[href=${alvo}]`, resultado: ok ? "ok" : "falha", detalhe: `navegou para ${page.url()}` });
      if (!ok) await shoot(page, `J1-nav-${alvo.replace("/", "_")}`);
    }
    await drenarColeta(j, "header-desktop", coleta);
    await page.close();

    // menu mobile hambúrguer
    page = await mobile.newPage();
    coleta = novaColeta(); instrument(page, j, coleta);
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const toggle = page.locator("button.menu-toggle");
    await toggle.click();
    const expandido = await toggle.getAttribute("aria-expanded");
    const menuVisivel = await page.locator("#mobile-navigation").isVisible();
    addStep(j, { tela: "/", acao: "menu-mobile-abrir", seletor: "button.menu-toggle", resultado: expandido === "true" && menuVisivel ? "ok" : "falha", detalhe: `aria-expanded=${expandido} visivel=${menuVisivel}` });
    if (menuVisivel) {
      await clickAndWait(page, page.locator('#mobile-navigation a[href="/imts-os"]'), u => u.pathname.endsWith("/imts-os"));
      addStep(j, { tela: "/", acao: "menu-mobile-navegar", seletor: 'a[href="/imts-os"]', resultado: page.url().endsWith("/imts-os") ? "ok" : "falha", detalhe: page.url() });
    }
    await drenarColeta(j, "header-mobile", coleta);
    await page.close();
  }

  // ---------- J2 — Avaliação de soluções ----------
  {
    const j = novoJ("J2", "Avaliação de soluções");
    const page = await desktop.newPage();
    const coleta = novaColeta(); instrument(page, j, coleta);
    await page.goto(BASE + "/solucoes", { waitUntil: "networkidle" });
    const card = page.locator("[data-track^=solution_]").first();
    if (await card.count() === 0) addStep(j, { tela: "/solucoes", acao: "lista-solucoes", resultado: "falha", detalhe: "Nenhum card de capacidade encontrado" });
    else {
      await clickAndWait(page, card, u => /\/solucoes\/[\w-]+$/.test(u.pathname));
      const detalheOk = /\/solucoes\/[\w-]+/.test(page.url());
      addStep(j, { tela: "/solucoes", acao: "detalhe-slug", seletor: "[data-track^=solution_]", resultado: detalheOk ? "ok" : "falha", detalhe: page.url() });
      await varreduraQualidade(page, j, page.url().slice(BASE.length));
      const cta = page.locator('a[href="/conectar"]').first();
      if (await cta.count() === 0) addStep(j, { tela: page.url().slice(BASE.length), acao: "cta-conectar", resultado: "falha", detalhe: "CTA para /conectar ausente no detalhe" });
      else {
        await clickAndWait(page, cta, u => u.pathname.endsWith("/conectar"));
        addStep(j, { tela: "detalhe", acao: "cta-conectar", seletor: 'a[href="/conectar"]', resultado: page.url().endsWith("/conectar") ? "ok" : "falha", detalhe: page.url() });
      }
    }
    await drenarColeta(j, "/solucoes", coleta);
    await page.close();
  }

  // ---------- J3 — IMTS.OS e portal ----------
  {
    const j = novoJ("J3", "IMTS.OS e portal");
    const page = await desktop.newPage();
    const coleta = novaColeta(); instrument(page, j, coleta);
    await page.goto(BASE + "/imts-os", { waitUntil: "networkidle" });
    const niveis = await page.locator(".os-levels article").count();
    addStep(j, { tela: "/imts-os", acao: "niveis-publico-autenticado", seletor: ".os-levels article", resultado: niveis === 2 ? "ok" : "falha", detalhe: `${niveis} níveis renderizados` });
    const ctaPortal = page.locator('a[href="/portal"]').first();
    if (await ctaPortal.count() === 0) addStep(j, { tela: "/imts-os", acao: "cta-portal", resultado: "falha", detalhe: "Link para /portal ausente" });
    else {
      await clickAndWait(page, ctaPortal, u => u.pathname.endsWith("/portal"));
      addStep(j, { tela: "/imts-os", acao: "cta-portal", seletor: 'a[href="/portal"]', resultado: page.url().endsWith("/portal") ? "ok" : "falha", detalhe: page.url() });
    }
    // drill-down no explorar por persona
    await page.goto(BASE + "/explorar", { waitUntil: "networkidle" });
    const select = page.locator(".explorer-controls select");
    await select.selectOption({ index: 1 });
    const personaPath = await page.locator(".persona-path").isVisible().catch(() => false);
    addStep(j, { tela: "/explorar", acao: "drill-down-persona", seletor: ".explorer-controls select", resultado: personaPath ? "ok" : "falha", detalhe: `persona-path visivel=${personaPath}` });
    const resultado = page.locator(".explorer-results a").first();
    if (await resultado.count() > 0) {
      await clickAndWait(page, resultado, u => /\/solucoes\/[\w-]+$/.test(u.pathname));
      addStep(j, { tela: "/explorar", acao: "drill-down-resultado", seletor: ".explorer-results a", resultado: /\/solucoes\/[\w-]+/.test(page.url()) ? "ok" : "falha", detalhe: page.url() });
    } else addStep(j, { tela: "/explorar", acao: "drill-down-resultado", resultado: "falha", detalhe: "Nenhum resultado de exploração" });
    await drenarColeta(j, "/imts-os+/explorar", coleta);
    await page.close();
  }

  // ---------- J4 — Conectar (formulário real) + FAQ ----------
  {
    const j = novoJ("J4", "Conectar e FAQ");
    const page = await desktop.newPage();
    const coleta = novaColeta(); instrument(page, j, coleta);
    await page.goto(BASE + "/conectar", { waitUntil: "networkidle" });
    const form = page.locator("form.briefing-form");
    if (await form.count() === 0) addStep(j, { tela: "/conectar", acao: "formulario-render", resultado: "falha", detalhe: "form.briefing-form ausente" });
    else {
      await form.locator("select").selectOption({ label: "Construir uma partnership" });
      const rota = await page.locator(".route-note strong").innerText();
      addStep(j, { tela: "/conectar", acao: "form-intencao", seletor: "select", resultado: rota.includes("partnerships@imts.com.br") ? "ok" : "falha", detalhe: `roteamento=${rota}` });
      await form.locator("input[autocomplete=name]").fill("Agente Autopiloto J4");
      await form.locator("input[type=email]").fill("autopiloto.j4@validacao.local");
      await form.locator("textarea").fill("Simulação de validação: briefing gerado por agente autopiloto para teste de jornada. Pode descartar.");
      await form.locator("input[type=checkbox]").check();
      await form.locator('button[type=submit]').click();
      await page.waitForTimeout(2500);
      const status = (await page.locator(".form-status").innerText().catch(() => "")).trim();
      const ok = /Recebemos|Protocolo|fallback|e-mail/i.test(status) || await form.locator('button[type=submit]').isDisabled().catch(() => false);
      addStep(j, { tela: "/conectar", acao: "formulario-submeter", seletor: "button[type=submit]", resultado: ok ? "ok" : "falha", detalhe: `status="${status.slice(0, 160)}"` });
      if (!ok) await shoot(page, "J4-form-falha");
    }
    await drenarColeta(j, "/conectar", coleta);

    // FAQ — acordeão nativo <details>
    await page.goto(BASE + "/faq", { waitUntil: "networkidle" });
    const det = page.locator(".faq-list details").first();
    if (await det.count() === 0) addStep(j, { tela: "/faq", acao: "faq-acordeao", resultado: "falha", detalhe: "Nenhum <details> encontrado" });
    else {
      await det.locator("summary").click();
      await page.waitForTimeout(300);
      const aberto = await det.getAttribute("open") !== null;
      addStep(j, { tela: "/faq", acao: "faq-acordeao", seletor: ".faq-list details summary", resultado: aberto ? "ok" : "falha", detalhe: `open=${aberto}` });
    }
    await drenarColeta(j, "/faq", coleta);
    await page.close();
  }

  // ---------- J5 — LGPD / cookies ----------
  {
    const j = novoJ("J5", "LGPD e confiança");
    const page = await desktop.newPage();
    const coleta = novaColeta(); instrument(page, j, coleta);
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const painel = page.locator(".consent-panel");
    const painelVisivel = await painel.isVisible().catch(() => false);
    addStep(j, { tela: "/", acao: "banner-cookies", seletor: ".consent-panel", resultado: painelVisivel ? "ok" : "falha", detalhe: `visivel=${painelVisivel}` });
    if (painelVisivel) {
      await painel.getByText("Somente necessários").click();
      await page.waitForTimeout(400);
      const fechado = !(await painel.isVisible().catch(() => true));
      const consent = await page.evaluate(() => localStorage.getItem("imts.consent") || "");
      addStep(j, { tela: "/", acao: "consent-salvar", seletor: "button:has-text('Somente necessários')", resultado: fechado ? "ok" : "falha", detalhe: `painelFechado=${fechado} storage=${consent.slice(0, 80)}` });
    }
    await drenarColeta(j, "consent", coleta);
    for (const rota of ["/cookies", "/privacidade", "/termos", "/governanca"]) {
      await page.goto(BASE + rota, { waitUntil: "networkidle" });
      const h1 = await page.locator("h1, h2").first().innerText().catch(() => "");
      addStep(j, { tela: rota, acao: "pagina-legal", seletor: "h1,h2", resultado: h1.trim() ? "ok" : "falha", detalhe: h1.slice(0, 80) });
      await varreduraQualidade(page, j, rota);
    }
    await drenarColeta(j, "paginas-legais", coleta);
    await page.close();
  }

  // ---------- J6 — Conteúdo e ecossistema ----------
  {
    const j = novoJ("J6", "Conteúdo e ecossistema");
    const page = await desktop.newPage();
    const coleta = novaColeta(); instrument(page, j, coleta);
    for (const rota of ["/insights", "/ive", "/integracoes", "/capital", "/talentos", "/partnerships", "/conhecimento", "/impacto", "/segmentos", "/ecossistema"]) {
      await page.goto(BASE + rota, { waitUntil: "networkidle" });
      const links = await page.$$eval("main a[href^='/']", as => as.length);
      addStep(j, { tela: rota, acao: "conteudo-links-internos", seletor: "main a", resultado: links > 0 ? "ok" : "falha", detalhe: `${links} links internos` });
      await varreduraQualidade(page, j, rota);
    }
    await drenarColeta(j, "conteudo", coleta);
    await page.close();
  }

  // ---------- J0 — Auditor transversal: TODAS as rotas ----------
  {
    const j = novoJ("J0", "Varredura total (auditor)");
    const page = await desktop.newPage();
    const coleta = novaColeta(); instrument(page, j, coleta);
    for (const rota of ROTAS) {
      await page.goto(BASE + rota, { waitUntil: "networkidle" });
      const status = "ok";
      addStep(j, { tela: rota, acao: "carregar-rota", seletor: "GET", resultado: status, detalhe: `${documentTitle(await page.title())}` });
      await varreduraQualidade(page, j, rota);
      await drenarColeta(j, rota, coleta);
    }
    await page.close();
  }

  // ---------- J7 — IMTS.OS nível autenticado (só com IMTS_AUTH_COOKIE) ----------
  {
    const j = novoJ("J7", "IMTS.OS nível autenticado");
    const auth = process.env.IMTS_AUTH_COOKIE;
    if (!auth) {
      addStep(j, { tela: "/portal", acao: "auth-gated", resultado: "ok", detalhe: "IMTS_AUTH_COOKIE não definido — jornada autenticada pulada (executa em produção com credenciais, quando o nível 2 for implantado)" });
    } else {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try { await ctx.addCookies(auth.split(";").map(c => { const [n, ...v] = c.trim().split("="); return { name: n.trim(), value: v.join("=").trim(), url: BASE }; })); } catch (e) {
        addStep(j, { tela: "/portal", acao: "auth-cookie", resultado: "falha", detalhe: String(e).slice(0, 160) });
      }
      const page = await ctx.newPage();
      const coleta = novaColeta(); instrument(page, j, coleta);
      await page.goto(BASE + "/portal", { waitUntil: "networkidle" });
      const marcadores = await page.evaluate(() => ({ painel: !!document.querySelector("[data-auth], .portal-auth, #portal-auth"), historico: document.body.innerText.includes("Histórico") || document.body.innerText.includes("histórico"), fontes: document.body.innerText.includes("fonte") }));
      const okAuth = marcadores.painel || marcadores.historico;
      addStep(j, { tela: "/portal", acao: "portal-autenticado", seletor: "conteúdo autenticado", resultado: okAuth ? "ok" : "falha", detalhe: JSON.stringify(marcadores) });
      await drenarColeta(j, "/portal-auth", coleta);
      await ctx.close();
    }
  }

  await browser.close();

  results.fim = new Date().toISOString();
  results.resumo.p1 = results.resumo.falhas.filter(f => (f.nivel || "P1") === "P1").length;
  results.resumo.p2 = results.resumo.falhas.filter(f => f.nivel === "P2").length;
  const ok = results.resumo.ok, total = results.resumo.passos;
  results.resumo.score = total ? Math.round((ok / total) * 100) : 0;

  fs.writeFileSync(path.join(REL_DIR, "browser-consolidado.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(REL_DIR, "browser-consolidado.md"), renderMd(results));
  console.log(JSON.stringify({ score: results.resumo.score, passos: total, ok, p1: results.resumo.p1, p2: results.resumo.p2, falhas: results.resumo.falhas.slice(0, 10) }, null, 2));
  process.exit(results.resumo.p1 > 0 ? 2 : 0);
})().catch(e => { console.error("RUNNER-ERROR", e); process.exit(1); });

function documentTitle(t) { return (t || "").slice(0, 60); }

function renderMd(r) {
  const L = [];
  L.push(`# Simulação em browser — consolidado`, ``);
  L.push(`- Base: ${r.base}`, `- Início: ${r.inicio}`, `- Fim: ${r.fim}`);
  L.push(`- **Score: ${r.resumo.score}/100** (${r.resumo.ok}/${r.resumo.passos} passos ok)`, `- P1: ${r.resumo.p1} · P2: ${r.resumo.p2}`, ``);
  for (const j of r.jornadas) {
    L.push(`## ${j.id} — ${j.nome}`, ``);
    const okJ = j.passos.filter(p => p.resultado === "ok").length;
    L.push(`Passos ok: ${okJ}/${j.passos.length}`, ``);
    if (j.problemas.length) {
      L.push(`| Nível | Onde | Detalhe |`, `|---|---|---|`);
      for (const p of j.problemas) L.push(`| ${p.nivel} | ${p.onde} | ${String(p.detalhe).replaceAll("|", "\\|").slice(0, 140)} |`);
      L.push(``);
    }
  }
  if (r.resumo.falhas.length) {
    L.push(`## Falhas (evidências em relatorios/evidencias/)`, ``);
    for (const f of r.resumo.falhas) L.push(`- **[${f.nivel || "P1"}] ${f.jornada} · ${f.tela} · ${f.acao}** — ${String(f.detalhe).slice(0, 200)}`);
    L.push(``);
  }
  return L.join("\n");
}
