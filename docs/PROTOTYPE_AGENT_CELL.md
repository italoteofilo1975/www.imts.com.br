# Célula de Agentes de Prototipação IMTS

Data de ativação: 28/07/2026  
Escopo: Site IMTS v17+  
Regra: toda evidência gerada por esta célula é identificada como `SIMULADA` e não substitui prova de produção.

## Agentes permanentes

| Agente | Papel | Cenários executados | Gate |
|---|---|---|---|
| ORQ-01 Orquestrador SET7 | Coordena ondas, dependências e evidências | Reexecução da suíte e consolidação do índice | Nenhum P0 omitido |
| IAM-02 Arquiteto de Identidade | Modela JWT/OIDC e menor privilégio | Token expirado, audience/issuer incorretos e matriz RBAC | E3 antes de implantação; E4 para fechamento |
| RED-03 Red Team | Procura bypass e escalada | Replay, papel indevido, segredo exposto e abuso de endpoint | Zero falha alta/crítica |
| DAT-04 Arquiteto de Dados | Garante ACID, FK, constraints e idempotência | Órfãos, estados inválidos, duplicidade e concorrência | Reconciliação sem violações |
| SRE-05 Agente de Resiliência | Simula dependências indisponíveis | 429, timeout, 500, reinício, circuit breaker e retry | Recuperação sem perda ou sucesso falso |
| OBS-06 Auditor Forense | Reconstrói operações e detecta adulteração | Correlation ID, ator, cadeia de hashes e PII em logs | Jornada reconstruível e adulteração detectada |
| A11Y-07 QA de Inclusão | WCAG 2.2, teclado e leitores de tela | Quatro classes de viewport, zoom, reflow, overlays e formulários | Zero P0 e zero axe crítico/sério |
| UX-08 Product Design | ISO 9241-11 e sete personas | Sucesso, erro, contingência e compreensão do próximo passo | Efetividade ≥95% e SUS ≥80 |
| DPO-09 Guardião LGPD | Minimização, retenção e direitos | Acesso, correção, revogação e exclusão com dados fictícios | Parecer humano obrigatório em produção |
| BCM-10 Continuidade | Backup, restauração e crise | Falha de provedor, restauração sintética e exercício de mesa | RPO/RTO medidos e depois homologados |

## Escala de evidência

| Nível | Significado | Uso |
|---|---|---|
| E0 | desenho ou backlog | não fecha controle |
| E1 | teste unitário | comprova regra isolada |
| E2 | simulação integrada com dados sintéticos | comprova comportamento do protótipo |
| E3 | homologação equivalente à produção | autoriza implantação condicionada |
| E4 | controle ativo e observado em produção | pode fechar P0 |

## Suíte automática inicial

A suíte `test:prototype` valida:

1. menor privilégio em quatro perfis sintéticos;
2. claims mínimos de identidade de workload;
3. abertura, semiabertura e recuperação do circuit breaker;
4. backoff exponencial com jitter e teto;
5. mascaramento de e-mail, telefone e token;
6. detecção de adulteração na cadeia de auditoria;
7. rastreabilidade das sete jornadas institucionais.

`evidence:prototype` executa a suíte e gera `evidence/prototype-latest.json`, sempre classificado como `SIMULATED — NOT PRODUCTION EVIDENCE`.

## Política de decisão

O protótipo pode ser declarado `pronto para homologação produtiva` quando todos os cenários E2 estiverem aprovados e os planos E3 estiverem definidos. Go-Live definitivo exige E4 para identidade, rate limiting, continuidade, observabilidade, domínio/TLS, conectores e LGPD.
