# Validação por Agentes Autopilotos (J0–J7)

Simulações das jornadas no lugar de humanos para regressão contínua do site institucional IMTS.

## Agentes e jornadas

| Agente | Jornadas |
|---|---|
| `visitante-publico` | J1 Descoberta institucional · J5 Conformidade e confiança |
| `gestor-b2g` | J2 Avaliação de soluções · J3 IMTS.OS e portal · J4 Participação e conexão |
| `participante-workshop` | J3 IMTS.OS e portal · J6 Conteúdo e ecossistema |
| `parceiro-instituicao` | J4 Participação e conexão |
| `auditor-qualidade` | J0 Varredura total (todas as rotas) |

A jornada **J7 (IMTS.OS nível autenticado)** é opcional: só executa quando a variável de
ambiente `IMTS_AUTH_COOKIE` está definida (ex.: `IMTS_AUTH_COOKIE="sess=..."`). O nível 2
ainda não está implantado nesta versão; a jornada verifica os marcadores quando houver credenciais.

## J8 — Conexões externas e conectores

As dependências externas do site (D1 persistência, Groq assistant, Resend transacional,
analytics) são exercitadas por três peças em `conectores/`:

| Peça | Papel |
|---|---|
| `conectores/mock-externo.mjs` (`npm run conector:mock`) | Proxy que emula `/api/*` com contrato fiel das rotas reais + registra evidências em `relatorios/evidencias-externas.jsonl`; repassa páginas/assets ao upstream |
| `conectores/mcp-imts-externo.mjs` (`npm run mcp:externo`) | Servidor MCP (stdio, zero deps) com 5 ferramentas: `submeter_lead`, `consultar_imts_os`, `registrar_evento`, `status_integracoes`, `validar_conexoes_externas` |
| `simular_externas.mjs` (`npm run validate:externas`) | Bateria J8: happy path, `x-correlation-id`, origin-rejected 403, validation 422, honeypot, assistant público, 501 autenticado, eventos/allowlist, gateway, guarda de operação — score 100/100 exigido |

E2E completo: suba o app (`npm start`), o mock (`npm run conector:mock`) e rode
`IMTS_BASE_URL=http://localhost:3200 npm run validate:browser` — o formulário real é
submetido no browser e o lead é persistido/emalado pelo conector, com evidência em JSONL.
Contra produção (D1/Groq reais): `npm run validate:live` e `node tests/autopilotos/simular_externas.mjs --base https://www.imts.com.br --live`.

## Como rodar

```bash
# estático (sem dependências; somente leitura)
npm run validate                      # contra http://localhost:3000
IMTS_BASE_URL=https://www.imts.com.br npm run validate

# browser real (interações: cliques, formulário, menu mobile, FAQ, cookies)
npm i -D playwright-core              # primeira vez
npm run validate:browser

# smoke de formulário contra produção (POST /api/leads — exige conector D1 ativo)
npm run validate:live
```

Classificação: **P1** = falha de interação · **P2** = console error, HTTP ≥ 400, imagem quebrada, landmark ARIA ausente. Exit code 2 quando há P1 ou falha de smoke.

## Relatórios

Gerados em `tests/autopilotos/relatorios/` (não versionados): por-agente (`.md`/`.json`), `CONSOLIDADO.md`, `browser-consolidado.md/.json` (passo a passo de cada interação) e `evidencias/` (screenshots das falhas).

## Histórico

- **2026-09-21:** suíte criada; rodadas iniciais 86/100 (4×P2 `form-sem-action`); correção aplicada em `app/conectar/BriefingForm.tsx` (`action="/api/leads" method="post"` — degradação progressiva); revalidado **100/100 nas camadas estática e browser**.
