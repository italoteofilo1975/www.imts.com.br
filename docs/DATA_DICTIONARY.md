# Dicionário de Dados — Site IMTS

Versão auditada: v16. Classificação padrão: uso interno.

## `leads`

| Campo | Tipo | Obrigatório | Classificação | Regra |
|---|---|---:|---|---|
| `id` | TEXT | Sim | Interno | UUID; chave primária e idempotência |
| `intent` | TEXT | Sim | Interno | `solution`, `partnership`, `initiative`, `talent`, `capital` ou `relations` |
| `name` | TEXT | Sim | PII | 2 a 120 caracteres |
| `email` | TEXT | Sim | PII | E-mail válido, máximo 254 caracteres |
| `organization` | TEXT | Sim | Potencialmente PII | Máximo 180 caracteres |
| `role` | TEXT | Sim | Potencialmente PII | Máximo 180 caracteres |
| `message` | TEXT | Sim | PII/confidencial | 10 a 6.000 caracteres |
| `destination` | TEXT | Sim | Interno | Caixa funcional definida pela intenção |
| `consent_version` | TEXT | Sim | Privacidade | Versão do aviso aceito |
| `delivery_status` | TEXT | Sim | Operacional | `accepted`, `pending` ou `delivered` |
| `delivery_channel` | TEXT | Não | Operacional | `resend`, `webhook` ou `fallback` |
| `delivery_attempts` | INTEGER | Sim | Operacional | Inicia em 0; máximo operacional de 5 |
| `last_error` | TEXT | Não | Restrito | Erro sanitizado; não inserir segredos |
| `created_at` | TEXT | Sim | Interno | ISO 8601 UTC |
| `updated_at` | TEXT | Sim | Interno | ISO 8601 UTC |

Retenção e descarte dependem de aprovação formal do controlador e do DPO.

## `lead_events`

| Campo | Tipo | Obrigatório | Classificação | Regra |
|---|---|---:|---|---|
| `id` | INTEGER | Sim | Interno | Chave primária autoincremental |
| `lead_id` | TEXT | Sim | Interno | Identificador lógico de `leads.id` |
| `event` | TEXT | Sim | Operacional | `accepted`, `delivered`, `retry_failed` etc. |
| `channel` | TEXT | Não | Operacional | Canal utilizado |
| `detail` | TEXT | Não | Restrito | Mensagem técnica sanitizada |
| `created_at` | TEXT | Sim | Interno | ISO 8601 UTC |

Integridade pendente: `lead_events.lead_id → leads.id` é relação lógica, sem chave estrangeira declarada.

## `site_events`

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
- Respostas públicas usam protocolo UUID e não devolvem o conteúdo integral do lead.
- Exportação, correção, anonimização e exclusão precisam de procedimento formal.
- Criptografia em trânsito exige TLS ativo no domínio final.
- Criptografia em repouso exige evidência do provedor da base.
