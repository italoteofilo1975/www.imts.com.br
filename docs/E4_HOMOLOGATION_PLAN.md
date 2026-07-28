# Plano de homologação produtiva E4

Este pacote não converte simulações E2 em prova produtiva. Cada gate começa como `NOT_RUN` e só muda para `PASS` com evidência verificável, data, responsável e hash do artefato.

| Gate | Executor responsável | Critério de aprovação | Evidência mínima | Rollback |
|---|---|---|---|---|
| DNS e TLS | Administrador do domínio | CNAME definitivo, certificado válido, HTTPS e redirecionamentos aprovados | consulta DNS, relatório TLS e capturas datadas | restaurar registros anteriores |
| OIDC e JWKS | Segurança | issuer/audience válidos, dois `kid` no overlap, revogação e MFA operacional | configuração do IdP, testes 401/403 e log de rotação | reativar chave anterior durante janela controlada |
| Rate limiting D1 | Engenharia/SRE | três rotas limitadas entre instâncias, `Retry-After` correto e nenhum bloqueio cruzado | teste concorrente e consultas D1 | desativar política por rota |
| Backup, RPO e RTO | SRE | restauração íntegra dentro dos objetivos aprovados | dump, restore, checksums, órfãos e tempos | manter versão anterior e congelar writes |
| Resend | Operações | SPF, DKIM e DMARC válidos; entrega e bounce observados | cabeçalhos, logs e protocolo real | contingência por webhook/mailto |
| Observabilidade | SRE | alertas disparam, deduplicam, resolvem e chegam ao plantão | logs correlacionados e recibos do canal | escalonamento manual |
| WCAG manual | QA de Inclusão | NVDA, VoiceOver, teclado, zoom e quatro viewports sem bloqueador | roteiro assinado, vídeos/capturas e issues | impedir Go-Live até correção |
| LGPD e jurídico | DPO/Jurídico | bases legais, retenção, direitos e textos formalmente aprovados | parecer e versão aprovada | manter coleta mínima e suspender campanha |

## Procedimento

1. Criar um manifesto a partir de `evidence/e4-manifest.schema.json`.
2. Executar cada gate no ambiente definitivo com dados de teste autorizados.
3. Registrar `PASS`, `FAIL` ou `BLOCKED`, nunca “aprovado por simulação”.
4. Anexar hash SHA-256, timestamp, responsável e referência do incidente quando houver.
5. Autorizar o Go-Live somente com todos os P0 em `PASS`, zero bloqueador WCAG e prontidão comprovada igual ou superior a 98%.
