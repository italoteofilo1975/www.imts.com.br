# IMTS Site — Activation and Contingency Runbook

## Universal preflight
1. Name the functional owner, technical owner and backup role.
2. Approve the data fields, lawful purpose, retention and deletion path.
3. Validate sandbox endpoint, authentication, timeout and response contract.
4. Insert credentials only in Sites environment variables.
5. Run success, validation, timeout, duplicate and dependency-failure tests.
6. Activate for internal traffic, then a controlled percentage, then all traffic.
7. Keep the previous fallback for at least 30 stable days.

## Lead connector
Success is HTTP 2xx after durable acceptance. Deduplicate by `x-imts-idempotency-key`. Verify `x-imts-signature`. Create the same correlation ID in CRM, acknowledgement email and audit record. On timeout or non-2xx, the browser opens the functional `@imts.com.br` mailbox flow.

## IMTS.OS connector
Public queries may access only approved institutional knowledge. Authenticated queries require the caller token and authorization enforced by IMTS.OS. On failure, the site returns to curated answers and human escalation.

## Analytics connector
Accept only the allowlisted event catalog. Do not activate before measurement consent. Never transmit message contents, e-mail addresses, client names, secrets or confidential strategy as event properties.

The first-party gateway persists the allowlisted event before forwarding it. Event properties are restricted to 12 short string values and must remain non-identifying. Configure `IMTS_ANALYTICS_ENDPOINT` and `IMTS_ANALYTICS_SITE_ID` only when the external processor and consent basis are approved.

## Pending lead retry
Set `IMTS_OPERATIONS_SECRET`, `IMTS_LEAD_WEBHOOK_URL` and `IMTS_LEAD_WEBHOOK_SECRET`. Invoke `POST /api/operations/retry-leads` with `Authorization: Bearer <IMTS_OPERATIONS_SECRET>` from an approved hourly scheduler. The worker selects at most 25 pending records, preserves the original idempotency key and stops after five attempts. Never call this route from a browser or expose its secret in client code.

Operational evidence for each run is the returned aggregate (`processed`, `delivered`, `pending`) plus the corresponding `lead_events` records. Alert the technical owner when pending records remain after five attempts.

## Incident levels
- P1: exposure risk, authentication bypass or integrity failure — disable connector immediately.
- P2: lead loss, duplicated processing or sustained IMTS.OS outage — switch to fallback and investigate.
- P3: delayed telemetry or partial degradation — monitor and correct within the operating window.

## Rollback
Remove the affected connector variables or rotate its secret, redeploy the last stable Site version, confirm fallback behavior, preserve correlation evidence and notify the functional owner.
