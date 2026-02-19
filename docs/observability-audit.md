# Observability And Audit Runbook

This document defines how to trace requests, inspect failures, and audit key actions in RAGScope.

## What Is Collected

RAGScope stores two observability streams in MongoDB:

- `app_logs`: operational logs (`info`, `warn`, `error`)
- `audit_events`: security and business-critical events (`audit`)

Both streams support:

- `requestId` (`X-Correlation-ID`)
- `userId`
- `jobId`
- HTTP context (`path`, `method`, `statusCode`, `durationMs`)
- `metadata` (sanitized)

Sensitive fields are redacted by `backend/src/utils/logger.js`.

## Correlation ID Flow

1. Backend middleware `requestContext` reads or generates `X-Correlation-ID`.
2. Backend returns `X-Correlation-ID` on all responses.
3. Frontend stores and reuses correlation IDs in API + SSE calls.
4. SDK propagates correlation IDs via metadata and request headers.

## Event Taxonomy

Primary event families:

- `auth.*`
- `evaluation.*`
- `orchestrator.*`
- `webhook.*`
- `sse.*`
- `system.*`
- `history.*`
- `results.*`
- `sdk.ingest.*`

## Retention Policy

Configured with environment variables:

- `LOG_PERSIST` (`true` to persist in Mongo)
- `APP_LOG_TTL_DAYS` (default `30`)
- `AUDIT_TTL_DAYS` (default `180`)

TTL indexes are defined in:

- `backend/src/models/AppLog.js`
- `backend/src/models/AuditEvent.js`

## Investigation Workflow

### By Correlation ID

1. Capture `X-Correlation-ID` from frontend/network logs.
2. Query endpoint:

```bash
GET /api/observability/search?requestId=<requestId>
```

3. Reconstruct sequence using `app_logs` + `audit_events` timestamps.

### By Job ID

1. Start from evaluation job ID.
2. Query endpoint:

```bash
GET /api/observability/search?jobId=<jobId>
```

3. Verify route events, orchestration milestones, webhook outcomes, and SSE behavior.

## Operational Checks

- Confirm `LOG_PERSIST=true` in production.
- Verify TTL indexes exist for both observability collections.
- Check periodic volume and prune event noise if needed.
- Validate redaction tests pass before release.
