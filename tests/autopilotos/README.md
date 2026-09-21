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
