# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (from backend/)
npm run dev          # Start with --watch (auto-restart on changes)
npm start            # Production start

# Frontend (from frontend/)
npm run dev          # Vite dev server on :5173, proxies /api to :3000
npm run build        # Production build to dist/
npm run preview      # Preview production build

# MongoDB (required for backend)
docker run -d -p 27017:27017 mongo:7

# Full stack via Docker
docker-compose up
```

No test framework is configured. No linter is configured.

## Architecture

This is a RAG evaluation platform with a Council-of-LLMs architecture and an Adaptive Orchestration layer.

### Backend (`backend/src/`, ESM modules, Node 20+)

**Request flow:** `routes/evaluate.js` validates with Zod → creates Evaluation document → fires async `runEvaluation()` → returns 202 with jobId.

**Orchestration:** `services/orchestrator.js` loops through test cases sequentially. For each test case:
- If adaptive mode: `orchestrator/adaptiveRouter.js` scores risk → selects strategy (council/hybrid/single) → delegates
- If council mode: `services/orchestrator.js::evaluateTestCase()` runs 3 judges in parallel → `services/aggregator.js` synthesizes with Claude Sonnet

**Circular dependency (intentional):** `orchestrator.js` imports `routeTestCase` from `adaptiveRouter.js`, which imports `evaluateTestCase` from `orchestrator.js`. Safe because both are function declarations (hoisted) used only at call-time.

**Adaptive strategies:**
- **Council** (risk >= 0.8): All 3 judges + Sonnet aggregator (existing path)
- **Hybrid** (0.4-0.8): `evaluators/deterministicChecks.js` (zero-cost) + OpenAI judge → local verdict
- **Single** (< 0.4): Gemini judge only → local verdict

**SSE streaming:** `utils/sse.js` SSEManager broadcasts events per jobId. `routes/stream.js` replays stored events for late-connecting clients, then subscribes to live events. Frontend receives 17 event types including `risk_scored`, `strategy_selected`, `deterministic_start/complete`.

**Key files:**
- `models/Evaluation.js` — Mongoose schema. `judges` field is `Mixed` (supports variable judge sets). Results carry `strategy`, `riskScore`, `deterministicChecks`.
- `services/costTracker.js` — In-memory accumulator, flushed once when evaluation completes (not per-judge).
- `routes/history.js` — Cursor-based pagination (not skip/offset), mounted at `/api` in index.js.

### Frontend (`frontend/src/`, React 18, Vite 6, TailwindCSS 3)

**State management:** All in `App.jsx` via useState. No external state library. View is `'upload' | 'evaluating' | 'history'`.

**SSE integration:** `hooks/useSSE.js` opens EventSource, accumulates events array, auto-closes on `evaluation_complete`/`evaluation_error`/`replay_complete`.

**Component data flow:** `App.jsx` → `StreamingEvaluation` receives raw events → `useMemo` derives `testCaseState` (per-test-case judge statuses, strategy, risk, deterministic results) → `TestCaseResult` renders dynamic judge cards based on `activeJudges` array from `strategy_selected` event.

**Dynamic rendering:** `TestCaseResult` reads `activeJudges` from SSE events to decide which `JudgeCard`s to show. Council=3 cards, hybrid=DeterministicChecksCard+1, single=1.

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/evaluate` | Start evaluation (accepts `options.strategy` and `options.riskOverride`) |
| GET | `/api/stream/:jobId` | SSE stream (replays events, then live) |
| GET | `/api/results/:jobId` | Poll for results (202 while processing) |
| GET | `/api/history` | Cursor-paginated history (query: limit, cursor, strategy, verdict, status) |
| GET | `/api/history/:jobId/cost` | Cost breakdown with savings estimate |
| GET | `/api/stats` | Aggregated stats across recent evaluations |

## Design

Follow DESIGN_SYSTEM.md for all frontend components. Every component must use the patterns defined there. No freestyle styling.

## Key Conventions

- Backend uses ESM (`"type": "module"` in package.json). All imports use `.js` extensions.
- Vite proxies `/api` requests to `http://localhost:3000` in dev.
- Cost values are rounded to 6 decimal places (`Math.round(cost * 1000000) / 1000000`).
- Judge results include `judge`, `metric`, `model`, `score`, `reason`, `details`, `tokens`, `cost`, `latency`.
- Backend `.env` contains live API keys — it is gitignored. Use `.env.example` as template.
- `ADAPTIVE_MODE=false` env var bypasses the adaptive router entirely (safe rollback).
