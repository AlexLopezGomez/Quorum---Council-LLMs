# Background and Motivation

(Previous: Commit 1/2 schema+threshold, observability audit, WP1.1/1.2 provider resilience — all completed.)

**Current task: Render deployment preparation.** User wants to deploy the full app (frontend+backend as single service in DEMO_MODE) to Render, connect custom domain `testquorum.*`, and make the project production-ready for push to GitHub.

Architecture decision: Render (not Vercel) is the correct platform because the backend requires a long-running server for SSE streaming, in-memory event state, and background async evaluation processing — none of which work in Vercel's serverless model.

# Key Challenges and Analysis

- `package-lock.json` is gitignored → `npm ci` in render.yaml will FAIL. Fix: switch to `npm install`.
- No `.node-version` or root `engines` field → Render may pick wrong Node version. Fix: add `.node-version` file.
- Backend is a long-running Express server (SSE, in-memory state) → cannot use Vercel serverless.
- DEMO_MODE bundles frontend+backend as single service → perfect for Render single-service deploy.
- Custom domain requires DNS CNAME configuration + Render dashboard setting.

# High-level Task Breakdown

## Render Deployment Prep

1. Fix render.yaml: `npm ci` → `npm install`, add `NODE_VERSION` env var.
   - Success: render.yaml deploys without lockfile errors on correct Node version.
2. Add `.node-version` file at repo root.
   - Success: Render picks up Node 20.
3. Verify frontend build succeeds.
   - Success: `npm run build` in frontend/ exits 0. ✅ (already verified)
4. Update DEMO_DEPLOY.md with custom domain instructions.
   - Success: Clear steps for DNS + Render domain setup.
5. Update scratchpad with env var reference and final status.
   - Success: All env vars documented.

# Project Status Board

- [x] ~~Commit 1/2, Observability, WP1.1/1.2~~ (completed in previous sessions)
- [x] Fix render.yaml build command and env vars
- [x] Add .node-version file
- [x] Verify frontend build
- [x] Update DEMO_DEPLOY.md with custom domain steps
- [x] Final audit and documentation

# Current Status / Progress Tracking

Commit 1 implementation completed: schema modules added, validation/model updated for `id` and `metadata`, schema tests added, and e2e edge-case tests added for `/api/evaluate`. Backend test suite passes (`38/38`).

Commit 2 implemented:
- Added `backend/src/evaluators/thresholdEvaluator.js` with threshold evaluation, per-case verdicting, run-level verdicting, and summary pass-rate logic with SKIP exclusion.
- Added `backend/tests/evaluators/thresholdEvaluator.test.js` with 29 tests covering boundaries, strategy-specific SKIP handling, ERROR precedence, empty/all-SKIP behavior, and finalScore metric evaluation.
- Backend test suite passes: `67/67`.
- Commit created: `5a0b02a` (`feat: add commit-2 threshold evaluator and test coverage`).

Observability implementation started. Next milestone is backend contract/foundation (request context middleware + logger + audit/log persistence models and env defaults), then instrumentation and cross-layer propagation.

Observability implementation completed:
- Added backend request correlation middleware and structured logger with redaction.
- Added Mongo persistence models for logs/audit with TTL (`AppLog`, `AuditEvent`) and new observability search route.
- Instrumented backend critical flows (auth, evaluate/ingest, orchestrator/adaptive, results/history, webhooks, SSE/stream, system lifecycle).
- Propagated correlation to frontend (`api`, SSE hook, ErrorBoundary) and SDK (`collector`, `transport`).
- Added tests for redaction and request context middleware; backend suite passes (`73/73`).
- Added runbook docs in `docs/observability-audit.md` and updated `README.md` + `backend/.env.example`.

Cursor memory alignment update completed:
- Confirmed MCP availability list includes `exa`, `context7`, and `playwright`.
- Persisted this reminder in Lessons for future sessions.

Documentation support update completed:
- Added concise project comprehension guide for current scope in `docs/project-understanding-brief.md`.
- Guide defines minimum required understanding (critical flows/contracts/observability) vs non-critical deep details.
- Upgraded the guide to a technical deep-dive format (execution path, concrete modules/routes, data contracts, observability workflow, and technical self-checklist).

CI workflow fix completed for Quorum quality gate:
- Root cause identified: `.github/workflows/quorum-example.yml` referenced `config: .quorum.yml`, but repo config lives at `tests/golden/.quorum.yml`.
- Updated workflow input to `config: tests/golden/.quorum.yml`.
- Hardened `.github/actions/quorum-test/action.yml` with config-file preflight:
  - Fallback from missing `.quorum.yml` to `tests/golden/.quorum.yml`.
  - Explicit actionable error when provided config path does not exist.

Planning documentation update completed:
- Updated `IMPLEMENTATION_PLAN.md` to reflect latest CI reality:
  - Config/pathing issue is resolved.
  - Active blocker is runtime `429` throttling during evaluation/polling.
  - Marked WP1.1/WP1.2 as urgent and tightened acceptance criteria around reducing `429`-driven `ERROR` outcomes in CI.

WP1.1 + WP1.2 implementation completed:
- Added shared provider resilience layer in `backend/src/services/providerResilience.js`:
  - Shared per-provider concurrency limiter (`openai`, `anthropic`, `gemini`) with env-configurable caps.
  - Retry/backoff with jitter and `Retry-After` support.
  - Explicit throttling annotations for exhausted retries.
- Wired resilience execution into:
  - `backend/src/services/orchestrator.js` (council judges + aggregator path)
  - `backend/src/orchestrator/adaptiveRouter.js` (single/hybrid judge path)
- Added explicit SSE/runtime events for throttling visibility:
  - `rate_limited`
  - `retry_scheduled`
  - `retry_exhausted`
- Updated frontend SSE registry in `frontend/src/lib/constants.js` to consume new event types.
- Added retry/concurrency env configuration examples in `backend/.env.example`.
- Added backend tests in `backend/tests/services/providerResilience.test.js` covering:
  - 429 retry success path
  - `Retry-After` handling
  - retry exhaustion behavior
  - non-429 no-retry behavior
  - shared concurrency limit enforcement
- Validation:
  - Backend tests pass (`114/114`).

Planning status sync completed:
- Updated `IMPLEMENTATION_PLAN.md` status markers to match current state.
- Marked Commit 5 / WP0.1 as completed in commit/phase gates where applicable.
- Marked WP1.1 and WP1.2 as implemented with validation pending under WP1.3.

Render deployment prep completed:
- Fixed `render.yaml`: `npm ci` → `npm install` (lockfile is gitignored), added `NODE_VERSION=20`, added `--omit=dev` for backend prod install.
- Added `.node-version` at repo root (Node 20).
- Frontend build verified clean (Vite 6, 0 errors, 455 kB JS + 34 kB CSS gzipped).
- All backend routes audited for DEMO_MODE compatibility (evaluate, stream, results, history, auth — all handle demoStore fallback).
- Updated `DEMO_DEPLOY.md` with custom domain DNS instructions, Render dashboard steps, and full env var reference for both demo and production modes.

# Executor's Feedback or Assistance Requests

No blockers. Render deployment is ready to push.

# Lessons

- Always read the complete target files before editing to avoid accidental regressions.
- Windows sandbox can block Vitest worker process spawning; when this happens, run tests outside sandbox.
- If npm install reports vulnerabilities, run `npm audit` to verify source and impact before proceeding.
- If `context7` MCP is unavailable in the environment, log that constraint and continue with local codebase/source-of-truth inspection.
- On this Windows environment, Vitest may require running outside the default sandbox due `spawn EPERM`; rerun tests with broader execution permissions when this occurs.
- Keep raw `console.*` usage centralized in logger utilities; avoid direct console usage in backend routes/services to preserve structured log schema.
- Distinguish CI wiring failures from runtime evaluation failures: if config/health pass but report shows `429`, prioritize Phase 1 resilience work over workflow rewrites.
- Keep Cursor session memory aligned with available MCP servers: `exa`, `context7`, and `playwright`.
- For provider throttling resilience, centralize retries in a shared wrapper (not per-judge ad hoc logic) so event visibility and retry policy remain consistent across council and adaptive paths.
- `package-lock.json` is gitignored in this repo — always use `npm install` (not `npm ci`) in deploy scripts.
- Backend architecture (SSE streaming, in-memory state, background async processing) is incompatible with Vercel serverless. Use a long-running server platform (Render, Railway, Fly.io) instead.
- Render uses `NODE_VERSION` env var to set the Node.js runtime; always pin it explicitly when no root package.json exists.
- `backend/src/utils/auth.js` has a top-level throw for missing JWT_SECRET in production — this runs at import time, before DEMO_MODE can be checked in `start()`. Must guard with `&& !DEMO_MODE`.
