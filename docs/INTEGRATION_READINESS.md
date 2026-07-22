# IMTS Site Integration Gateway v1.0

## Objective
The institutional site is the presentation and interaction layer. IMTS.OS, CRM, transactional email, identity, analytics, storage and observability connect through replaceable adapters and environment parameters. No credential belongs in source.

## Public contracts
- `GET /api/integrations/status`: non-sensitive capability state.
- `POST /api/leads`: validated lead intake, HMAC-signed webhook delivery and safe mail fallback.
- `POST /api/ai/query`: public or authenticated IMTS.OS proxy.
- `POST /api/events`: allowlisted, first-party event gateway.

## Lead webhook
Event: `lead.created`. Headers: `x-imts-event`, `x-imts-signature: sha256=<hex>`, `x-imts-idempotency-key`. The downstream integration layer is responsible for deduplication, CRM mapping, acknowledgement email, persistence, retention and audit.

## Required downstream response
Any HTTP 2xx acknowledges durable acceptance. Non-2xx activates the browser mail fallback. The correlation UUID is the shared protocol identifier.

## Roles and SLA proposal
- Solution: Negócios; acknowledgement 1h; triage 8h.
- Partnership: Relações + Negócios; acknowledgement 1h; triage 16h.
- Initiative: Inteligência + Estratégias; acknowledgement 1h; triage 24h.
- Talent: Gestão de Pessoas; acknowledgement 4h; triage 40h.
- Capital: Capital Strategy; acknowledgement 1h; triage 16h.
- Relations: Relações; acknowledgement 4h; triage 24h.

## Activation gates
1. Approve endpoint owner and data processing agreement.
2. Configure secrets only in the hosting environment.
3. Run contract, failure, retry and idempotency tests.
4. Validate consent text, retention and deletion workflow.
5. Enable one connector at a time and monitor errors.
6. Preserve mail fallback until 30 days of stable operation.

## Security boundaries
Public IMTS.OS cannot access confidential sources. Authenticated level requires an upstream authorization token and role-aware enforcement inside IMTS.OS. The site never trusts a client-supplied role. Secrets, client names, strategies and operational information must not be logged or returned by public status endpoints.
