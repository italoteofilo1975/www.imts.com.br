# Dicionário de Dados — Site IMTS

Versão auditada: v20
Classificação padrão: uso interno, salvo indicação em contrário.

## `leads`

Registro primário e durável de contatos recebidos pelo site.

| Campo | Tipo | Obrigatório | Classificação | Regra |
|---|---|---:|---|---|
| `id` | TEXT | Sim | Interno | UUID; chave primária e idempotência |
| `intent` | TEXT | Sim | Interno | `solution`, `partnership`, `initiative`, `talent`, `capital` ou `relations` |
| `name` | TEXT | Sim | PII | 2 a 120 caracteres |
| `email` | TEXT | Sim | PII | E-mail válido, máximo 254 caracteres |
| `organization` | TEXT | Sim | Potencialmente PII | Máximo 180 caracteres; vazio por padrão |
| `role` | TEXT | Sim | Potencialmente PII | Máximo 180 caracteres; vazio por padrão |
| `message` | TEXT | Sim | PII/confidencial | 10 a 6.000 caracteres |
| `destination` | TEXT | Sim | Interno | Caixa funcional definida pela intenção |
| `consent_version` | TEXT | Sim | Privacidade | Versão do aviso aceito |
| `delivery_status` | TEXT | Sim | Operacional | `accepted`, `pending`, `processing`, `delivered` ou `dead` |
| `delivery_channel` | TEXT | Não | Operacional | `resend`, `webhook` ou `fallback` |
| `delivery_attempts` | INTEGER | Sim | Operacional | Inicia em 0; máximo operacional de 5 |
| `last_error` | TEXT | Não | Restrito | Erro técnico sanitizado; não inserir segredos |
| `created_at` | TEXT | Sim | Interno | ISO 8601 UTC |
| `updated_at` | TEXT | Sim | Interno | ISO 8601 UTC |
| `correlation_id` | TEXT | Não | Operacional | UUID propagado ponta a ponta |
| `next_attempt_at` | TEXT | Não | Operacional | Próxima tentativa em ISO 8601 UTC |
| `lease_owner` | TEXT | Não | Restrito | Worker que possui o claim |
| `lease_token` | TEXT | Não | Restrito | Token efêmero do claim |
| `lease_expires_at` | TEXT | Não | Operacional | Expiração do claim |
| `retention_until` | TEXT | Não | Privacidade | Data limite de retenção |
| `anonymized_at` | TEXT | Não | Privacidade | Data da anonimização |
| `legal_hold` | INTEGER | Sim | Privacidade | 0 ou 1 |

Retenção e descarte: pendente de aprovação formal do controlador e do encarregado de dados. Até essa decisão, não declarar conformidade LGPD plena.

## `lead_events`

Trilha operacional de cada tentativa de entrega.

| Campo | Tipo | Obrigatório | Classificação | Regra |
|---|---|---:|---|---|
| `id` | INTEGER | Sim | Interno | Chave primária autoincremental |
| `lead_id` | TEXT | Sim | Interno | Identificador lógico de `leads.id` |
| `event` | TEXT | Sim | Operacional | Ex.: `accepted`, `delivered`, `retry_failed` |
| `channel` | TEXT | Não | Operacional | Canal utilizado |
| `detail` | TEXT | Não | Restrito | Mensagem técnica sanitizada |
| `created_at` | TEXT | Sim | Interno | ISO 8601 UTC |

Integridade pendente: a relação `lead_events.lead_id → leads.id` é lógica, sem chave estrangeira declarada.

## `operation_token_jti`

Registro antirreplay dos JWTs administrativos. `jti` é chave primária; `subject`, `expires_at` e `consumed_at` sustentam identidade, expiração e auditoria. Não armazena o token.

## `connector_circuit`

Estado durável do circuit breaker por conector: `connector`, `state`, `failures`, `opened_at`, `probe_lease` e `updated_at`.

## `prototype_audit_events`

Trilha E2 encadeada por hash com `correlation_id`, `actor`, `action`, `resource`, `outcome`, `previous_hash`, `event_hash` e `created_at`. PII e bearer são proibidos.

## `site_events`

Telemetria própria, restrita a eventos autorizados e propriedades não identificáveis.

| Campo | Tipo | Obrigatório | Classificação | Regra |
|---|---|---:|---|---|
| `id` | INTEGER | Sim | Interno | Chave primária autoincremental |
| `event` | TEXT | Sim | Analítico | Evento da lista permitida |
| `path` | TEXT | Sim | Analítico | Caminho, máximo 300 caracteres |
| `properties` | TEXT/JSON | Sim | Analítico | Até 12 pares string; chave 40 e valor 120 caracteres |
| `created_at` | TEXT | Sim | Interno | ISO 8601 UTC |

Eventos permitidos: `page_view`, `cta_click`, `form_start`, `form_submit`, `assistant_open`, `assistant_query` e `consent_update`.

## Controles transversais

- PII não deve aparecer em telemetria, cabeçalhos, URLs ou logs.
- Segredos existem apenas como variáveis de ambiente do servidor.
- Respostas públicas usam protocolo UUID, nunca devolvem o conteúdo integral do lead.
- Exportação, correção, anonimização e exclusão ainda precisam de procedimento operacional formal.
- Criptografia em trânsito deve ser comprovada por TLS ativo no domínio final.
- Criptografia em repouso deve ser comprovada por evidência do provedor da base.
