# RAGScope Production Elevation Plan

## Context

RAGScope is a working RAG evaluation platform with Council-of-LLMs architecture, adaptive orchestration, SSE streaming, and a React dashboard. The goal is to elevate it from "works as a demo" to "production-grade portfolio piece" by adding an SDK, realistic demo scenarios, webhook alerting, frontend polish, API docs, Docker deployment, and documentation. This targets AI Engineer / FDE roles at startups in AI observability and evaluation.

---

## Phase 1: SDK & Ingest Endpoint

### 1.1 Create `sdk/` package

**New files:**
- `sdk/package.json` — `@ragscope/sdk`, type: module, zero dependencies
- `sdk/src/index.js` — Re-exports RAGScope class + middleware
- `sdk/src/collector.js` — `RAGScope` class with `capture()`, `flush()`, `close()`
  - Constructor: `{ endpoint, apiKey, defaultStrategy, batchSize (10), flushInterval (5000), onError }`
  - `capture()` pushes to internal buffer, returns void (non-blocking)
  - Auto-flush when buffer >= batchSize or flushInterval timer fires
  - `flush()` sends POST to `${endpoint}/api/ingest` via native `fetch`
- `sdk/src/transport.js` — HTTP transport with retry logic
  - Exponential backoff: 3 attempts, 1s/2s/4s delays
  - On failure: call `onError` callback, `console.warn`, drop (never crash host app)
  - 5s request timeout via `AbortController`
  - **Flushing lock:** boolean `_flushing` flag prevents duplicate sends — if `flush()` is called while a previous flush is in-flight, skip (next interval catches it)
- `sdk/src/types.js` — JSDoc `@typedef` definitions for CapturePayload, SDKConfig, etc.
- `sdk/examples/basic-usage.js` — 3-line quickstart
- `sdk/examples/express-middleware.js` — Middleware wrapping `res.json()`
- `sdk/examples/langchain-callback.js` — LangChain BaseCallbackHandler subclass example
- `sdk/README.md` — 30-second quickstart, 3 integration patterns, config table, data flow diagram

**Reuse:** Pattern from `backend/src/routes/evaluate.js:10-81` (the create→save→runEvaluation→202 flow)

### 1.2 Create `POST /api/ingest` endpoint

**New file:** `backend/src/routes/ingest.js`

- Zod schema for batch captures (1-50 items, each with input/actualOutput/retrievalContext/metadata/capturedAt)
- Reuses `createValidationMiddleware` from `backend/src/utils/validation.js:41`
- Maps captures to testCases format (strips metadata, keeps core fields)
- Creates Evaluation document + calls `runEvaluation()` — same pattern as `evaluate.js:10-81`
- Returns `{ jobId, captureCount, streamUrl }`

**Modify:** `backend/src/index.js` — Add import (after line 9) and mount `app.use('/api/ingest', ingestRouter)` (after line 38)

---

## Phase 2: Demo Scenario

### 2.1 Create `demo/rag-chatbot/`

**New files:**
- `demo/rag-chatbot/package.json` — type: module, depends on express + `"@ragscope/sdk": "file:../../sdk"` (file dependency, works in both local and Docker)
- `demo/rag-chatbot/knowledge-base.json` — 3 coliving buildings:
  - Casa Malasaña (Madrid, studios €850, 2-bed €1450, coworking/rooftop/gym)
  - Vive Chueca (Madrid, studios €900, 2-bed €1500, coworking/cinema)
  - Cotown Eixample (Barcelona, studios €800, 1-bed €1100, coworking/pool/bikes)
  - Each with `lastUpdated` dates (Eixample intentionally stale: 2025-12-15)
- `demo/rag-chatbot/server.js` (~80 lines) — Express on port 4000
  - `retrieve(query)` — naive keyword matching, intentionally imperfect
  - `generate(query, context)` — template-based response, no LLM needed
  - POST `/chat` — retrieve→generate→`ragscope.capture()`→respond
  - Imports SDK via `@ragscope/sdk` (resolved by file dependency in package.json)

### 2.2 Create scenario files

- `demo/scenarios/happy-path.json` — 5 test cases that should PASS
- `demo/scenarios/silent-failures.json` — 8 test cases, each a specific failure type:
  1. Wrong building retrieved (asks Malasaña, gets Chueca context)
  2. Stale data (Eixample lastUpdated Dec 2025)
  3. Hallucinated availability (says 3 available, context shows 0)
  4. Wrong unit type (asks 2-bed, responds about studios)
  5. Confident wrong price (€750 vs €850)
  6. City confusion (mixes Madrid/Barcelona)
  7. Missing context (pet policy, no relevant context)
  8. Cross-entity contamination (pool for Madrid building)
- `demo/scenarios/mixed-risk.json` — 10 test cases spanning all risk tiers

Each test case includes: input, actualOutput, expectedOutput, retrievalContext, metadata (buildingId, sessionId, queryType)

### 2.3 Create run script

- `demo/run-scenario.js` — reads scenario JSON, POSTs each to localhost:4000/chat
- `demo/run-demo.sh` — starts chatbot, runs scenario, reports jobId

---

## Phase 3: Webhooks & Alerting

### 3.1 Webhook model

**New file:** `backend/src/models/Webhook.js`
- Schema: name, url, secret (HMAC), events[] (enum), config (scoreThreshold, costSpikeMultiplier), active, lastTriggered, failureCount, createdAt
- Index on `{ active: 1 }`
- **Also add index** `{ status: 1, completedAt: -1 }` to `Evaluation` model for fast cost_spike average queries

### 3.2 Webhook service

**New file:** `backend/src/services/webhookService.js`
- `fireWebhooks(evaluation)` — fetch active webhooks, check conditions, fire matching
- Alert conditions:
  - `verdict_fail` — any result has verdict === 'FAIL'
  - `score_below_threshold` — avgFinalScore < webhook.config.scoreThreshold
  - `high_risk_fail` — riskScore >= 0.8 AND verdict === 'FAIL'
  - `cost_spike` — totalCost > average of last 10 evals × costSpikeMultiplier
  - `evaluation_complete` — always fires
- `sendWebhook(webhook, payload)` — fetch with 3s timeout, HMAC signature if secret set
- Auto-disable after 5 consecutive failures
- Slack detection: if URL contains `hooks.slack.com`, format as Block Kit message
- `formatSlackPayload()` — header + fields (strategy/score/risk/cost) + query summary + dashboard button

### 3.3 Integration point

**Modify:** `backend/src/services/orchestrator.js`
- Add import at top: `import { fireWebhooks } from './webhookService.js';`
- **Integration by pattern** (not line number): After the `updateDocument` call that sets `status: 'complete'`, before the `emitEvent('evaluation_complete')` call:
  ```js
  fireWebhooks({ jobId, testCases, results: allResults, summary, config: options }).catch(() => {});
  ```
- Fire-and-forget: never blocks evaluation completion or SSE

### 3.4 Webhook routes

**New file:** `backend/src/routes/webhooks.js`
- `POST /api/webhooks` — create (Zod validated)
- `GET /api/webhooks` — list all
- `PATCH /api/webhooks/:id` — update
- `DELETE /api/webhooks/:id` — remove
- `POST /api/webhooks/:id/test` — send sample payload

**Modify:** `backend/src/index.js` — Add import and mount `app.use('/api/webhooks', webhooksRouter)` after line 38

---

## Phase 4: Frontend Elevation

### 4.1 Install lucide-react

```bash
cd frontend && npm install lucide-react
```

### 4.2 Update sidebar in `frontend/src/App.jsx`

- Import icons: `LayoutDashboard, History, Bell` from lucide-react
- Add icon field to NAV_ITEMS, add `{ key: 'webhooks', label: 'Webhooks', icon: Bell }`
- Render `<item.icon size={18} />` in nav buttons (line 76-83)
- Add view routing: `{view === 'webhooks' && <WebhookManager />}`
- **Evaluation-in-progress indicator:** When `jobId` is set and `sseStatus` is 'connecting' or 'connected', show a pulsing dot next to "Evaluate" nav item so user knows to go back to the live view if they navigated away mid-evaluation

### 4.3 Create `frontend/src/components/PageHeader.jsx`

Reusable component: title (text-2xl font-semibold), subtitle (text-sm text-text-secondary), optional action button slot. Replace duplicated header patterns in TestCaseUpload, EvaluationHistory, StreamingEvaluation.

### 4.4 Create `frontend/src/components/WebhookManager.jsx`

CRUD interface following DESIGN_SYSTEM.md:
- Webhook list with cards (name, URL truncated, active toggle, event badges, last triggered)
- Add form: name, URL, secret, event checkboxes, threshold config
- Test button, delete with confirmation
- Uses new API functions in `frontend/src/lib/api.js`

### 4.5 Add API functions to `frontend/src/lib/api.js`

5 new functions: `getWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`, `testWebhook`

### 4.6 Create `frontend/src/components/Skeleton.jsx`

SkeletonCard + SkeletonRow components using `animate-pulse` pattern from DESIGN_SYSTEM.md. Replace "Loading..." text in EvaluationHistory with skeleton rows.

### 4.7 Add icons to existing components

- `JudgeCard.jsx` — Brain (OpenAI), Sparkles (Anthropic), Gem (Gemini) in headers
- `AggregatorCard.jsx` — CheckCircle2/AlertTriangle/XCircle for verdict badges
- `TestCaseUpload.jsx` — Upload icon, Play icon on submit button
- `EvaluationHistory.jsx` — Filter icon, Clock for timestamps
- `CostBreakdown.jsx` — BarChart3 in header

### 4.8 Refine stat cards in `StreamingEvaluation.jsx`

Current 6-column grid → 4-column grid (Final Score, Pass Rate, Total Cost, Strategy Distribution). Move per-metric averages to secondary section below.

---

## Phase 5: API Documentation

### 5.1 Install dependencies

```bash
cd backend && npm install swagger-jsdoc swagger-ui-express
```

### 5.2 Create `backend/src/utils/openapi.js`

OpenAPI 3.0 spec via swagger-jsdoc: info, servers, component schemas (TestCase, EvaluationResult, Webhook, Error). Scans `./src/routes/*.js` for @openapi annotations.

### 5.3 Mount Swagger UI

**Modify:** `backend/src/index.js` — Import swagger-ui-express + spec. **Mount order matters:** place `/api/docs` after CORS/JSON middleware but BEFORE the API routes (before `app.use('/api/evaluate', ...)`). If mounted after routes, Express may try to match `/api/docs` against route handlers.

### 5.4 Annotate all routes

Add `@openapi` JSDoc to every route handler across 7 route files (12 endpoints total): evaluate, stream, results, history (3 endpoints), ingest, webhooks (5 endpoints).

---

## Phase 6: Docker & Deployment

### 6.1 Create `frontend/Dockerfile`

Multi-stage: Node 20 Alpine build → nginx:alpine serve. Include `frontend/nginx.conf` for SPA fallback + `/api` proxy to `http://backend:3000` (Docker service name, NOT localhost).

### 6.2 Create `demo/rag-chatbot/Dockerfile`

Node 20 Alpine. **COPY `sdk/` directory first** (for the file dependency resolution), then copy demo source. Expose 4000.

### 6.3 Update `docker-compose.yml`

Add services: frontend (nginx on :8080), demo-chatbot (on :4000). Add healthchecks. Update backend FRONTEND_URL.

### 6.4 Create `Makefile`

Targets: `dev` (local backend+frontend), `up` (docker-compose), `down`, `demo` (full stack + scenario), `logs`, `clean`.

---

## Phase 7: Documentation

### 7.1 Rewrite `README.md`

Hook → Why This Exists → Key Features → Quick Start (3 commands) → Architecture (Mermaid) → SDK Usage → Demo → API Reference → Config → Tech Stack → License

### 7.2 Create `ARCHITECTURE.md`

Mermaid diagrams: system overview, adaptive orchestration flow, SDK data flow, SSE event protocol table, cost model.

### 7.3 Create `DECISIONS.md`

ADRs for: Council-of-LLMs vs single evaluator, adaptive strategy selection, SSE vs WebSocket, cursor vs offset pagination, intentional circular dependency, fire-and-forget webhooks, SDK non-blocking design, MongoDB vs PostgreSQL, Express vs Fastify, rule-based risk scoring vs ML.

---

## Implementation Order

```
Phase 1 (SDK + Ingest) → Phase 2 (Demo, uses SDK)
Phase 3 (Webhooks)     → Phase 4 (Frontend, adds Webhook UI)
Phase 5 (API Docs)     → needs all routes from Phase 1 + 3
Phase 6 (Docker)       → needs all services from Phase 2
Phase 7 (Docs)         → last, references everything
```

Recommended sequence: **3 → 1 → 4 → 2 → 5 → 6 → 7**
- Phase 3 first: backend-only, no dependencies
- Phase 1 next: SDK + ingest, backend-only
- Phase 4: frontend updates (can start after 3, references webhook routes)
- Phase 2: demo (needs SDK from 1)
- Phase 5: API docs (needs all routes)
- Phase 6: Docker (needs all services)
- Phase 7: docs last

## Files Summary

**New files (31):** sdk/ (9 files: package.json, README.md, src/index.js, src/collector.js, src/transport.js, src/types.js, examples/basic-usage.js, examples/express-middleware.js, examples/langchain-callback.js), demo/ (8 files: rag-chatbot/package.json, rag-chatbot/server.js, rag-chatbot/knowledge-base.json, scenarios/happy-path.json, scenarios/silent-failures.json, scenarios/mixed-risk.json, run-scenario.js, run-demo.sh), backend (5 files: routes/ingest.js, routes/webhooks.js, models/Webhook.js, services/webhookService.js, utils/openapi.js), frontend (3 files: components/PageHeader.jsx, components/WebhookManager.jsx, components/Skeleton.jsx), infra (4 files: frontend/Dockerfile, frontend/nginx.conf, demo/rag-chatbot/Dockerfile, Makefile), docs (2 files: ARCHITECTURE.md, DECISIONS.md)

**Modified files (8):** `backend/src/index.js` (mount routes + swagger), `backend/src/services/orchestrator.js` (webhook hook), `backend/package.json` (swagger deps), `frontend/package.json` (lucide-react), `frontend/src/App.jsx` (nav + webhook view), `frontend/src/lib/api.js` (webhook API fns), `docker-compose.yml` (new services), `README.md` (rewrite)

**Files with JSDoc additions (7):** All route files get @openapi annotations

**Files with icon/skeleton refinements (6):** JudgeCard, AggregatorCard, TestCaseUpload, EvaluationHistory, StreamingEvaluation, CostBreakdown

## Verification

After each phase:
1. **Phase 1:** SDK example sends captures → `/api/ingest` receives → evaluation runs → SSE streams
2. **Phase 2:** `demo/run-demo.sh` starts chatbot, runs silent-failures → dashboard shows FAIL verdicts
3. **Phase 3:** Create webhook → run eval with FAIL → webhook fires (test with webhook.site)
4. **Phase 4:** Sidebar has icons + Webhooks nav, all components match DESIGN_SYSTEM.md, skeletons load
5. **Phase 5:** `/api/docs` shows interactive Swagger UI with all 12 endpoints
6. **Phase 6:** `docker-compose up --build` brings up all 4 services, frontend proxies to backend
7. **Phase 7:** README tells compelling story, DECISIONS.md has 10 ADRs
