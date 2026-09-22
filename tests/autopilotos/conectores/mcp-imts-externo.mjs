#!/usr/bin/env node
/**
 * MCP IMTS EXTERNO — conector MCP (stdio, JSON-RPC 2.0, zero dependências) para as
 * conexões externas do site IMTS: leads (D1+Resend), IMTS.OS (Groq), eventos,
 * gateway de integrações e bateria completa de validação J8.
 *
 * Ferramentas: submeter_lead · consultar_imts_os · registrar_evento ·
 *              status_integracoes · validar_conexoes_externas
 *
 * Base URL: env IMTS_BASE_URL (padrão http://localhost:3200 — conector mock-externo).
 * Uso: node mcp-imts-externo.mjs   (stdio; compatível com clientes MCP)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.IMTS_BASE_URL || "http://localhost:3200").replace(/\/$/, "");

const schema = {
  name: "imts-externo",
  version: "1.0.0",
  tools: [
    { name: "submeter_lead", description: "Submete um lead de teste ao endpoint /api/leads e devolve protocolo + evidência", inputSchema: { type: "object", properties: { intent: { type: "string", enum: ["solution", "partnership", "initiative", "talent", "capital", "relations"] }, nome: { type: "string" }, email: { type: "string" }, mensagem: { type: "string" }, organizacao: { type: "string" }, papel: { type: "string" } }, required: ["intent", "nome", "email", "mensagem"] } },
    { name: "consultar_imts_os", description: "Consulta o assistente público IMTS.OS (/api/ai/query)", inputSchema: { type: "object", properties: { pergunta: { type: "string" } }, required: ["pergunta"] } },
    { name: "registrar_evento", description: "Registra evento de analytics (/api/events)", inputSchema: { type: "object", properties: { evento: { type: "string" }, path: { type: "string" }, propriedades: { type: "object" } }, required: ["evento", "path"] } },
    { name: "status_integracoes", description: "Lê o gateway público de integrações (/api/integrations/status)", inputSchema: { type: "object", properties: {} } },
    { name: "validar_conexoes_externas", description: "Executa a bateria completa J8 de contrato das conexões externas e devolve o score", inputSchema: { type: "object", properties: { base: { type: "string" } } } },
  ],
};

async function chamarApi(metodo, rota, corpo) {
  const res = await fetch(BASE + rota, { method: metodo, headers: { "content-type": "application/json", origin: BASE }, body: corpo ? JSON.stringify(corpo) : undefined, signal: AbortSignal.timeout(10000) });
  let json = null; try { json = await res.json(); } catch { /* vazio */ }
  return { status: res.status, corpo: json, x_correlation_id: res.headers.get("x-correlation-id") };
}

async function executarFerramenta(nome, args = {}) {
  switch (nome) {
    case "submeter_lead":
      return chamarApi("POST", "/api/leads", { intent: args.intent, name: args.nome, email: args.email, message: args.mensagem, organization: args.organizacao || "", role: args.papel || "", consent: true });
    case "consultar_imts_os":
      return chamarApi("POST", "/api/ai/query", { question: args.pergunta, level: "public" });
    case "registrar_evento":
      return chamarApi("POST", "/api/events", { event: args.evento, path: args.path, properties: args.propriedades || {} });
    case "status_integracoes":
      return chamarApi("GET", "/api/integrations/status");
    case "validar_conexoes_externas": {
      const base = (args.base || BASE).replace(/\/$/, "");
      await new Promise((resolve) => {
        const p = spawn("node", [join(ROOT, "..", "simular_externas.mjs"), "--base", base], { stdio: "pipe" });
        let out = ""; p.stdout.on("data", d => out += d); p.stderr.on("data", d => out += d);
        p.on("close", () => resolve());
      });
      try {
        const rel = JSON.parse(readFileSync(join(ROOT, "..", "relatorios", "externas-j8.json"), "utf8"));
        return { score: rel.score, base: rel.base, quando: rel.quando, resultados: rel.resultados.map(r => ({ nome: r.nome, ok: r.ok, detalhe: r.detalhe })) };
      } catch (e) { return { erro: "relatório J8 indisponível: " + String(e).slice(0, 120) }; }
    }
    default:
      return { erro: `ferramenta desconhecida: ${nome}` };
  }
}

// ---- loop stdio JSON-RPC 2.0 (Content-Length framing não exigido: linhas JSON) ----
let buffer = "";
process.stdin.on("data", async (chunk) => {
  buffer += chunk.toString("utf8");
  let nl;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const linha = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
    if (!linha) continue;
    let msg; try { msg = JSON.parse(linha); } catch { continue; }
    if (msg.method === "initialize") {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: schema.name, version: schema.version } } }) + "\n");
    } else if (msg.method === "notifications/initialized" || msg.method === "initialized") {
      /* ack implícito */
    } else if (msg.method === "tools/list") {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { tools: schema.tools } }) + "\n");
    } else if (msg.method === "tools/call") {
      try {
        const result = await executarFerramenta(msg.params?.name, msg.params?.arguments || {});
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } }) + "\n");
      } catch (e) {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: String(e).slice(0, 200) } }) + "\n");
      }
    } else if (msg.id !== undefined) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `método não suportado: ${msg.method}` } }) + "\n");
    }
  }
});
console.error(`🛰 MCP imts-externo pronto (stdio) · base: ${BASE}`);
