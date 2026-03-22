# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Available MCP Servers

The following MCP servers are available and **MUST** be used when relevant:

- **context7** — Retrieves up-to-date library documentation and code examples. Use it before writing code that depends on any external library to get the latest API surface.
- **playwright** — Browser automation and end-to-end testing. Use it for any UI testing, scraping, or browser interaction tasks.
- **exa** — The Web Search MCP. Use it for web search, code search, and researching topics with real-time web access.

## Pre-Coding Checklist (MANDATORY)

Before planning or writing a single line of code, you **MUST** complete all of the following steps in order:

1. **Load Skills:** Read all skill files under `.claude/skills/` and apply their guidelines. These define the non-negotiable standards for code quality, scalability, readability, cleanliness, and security in this project.
2. **Consult the Agents:** Read and load the context of the `.agents` files installed in this project.
3. **Query context7:** For any external library involved in the task, call the `context7` MCP to retrieve current documentation before writing implementation code.

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

* If adaptive mode: `orchestrator/adaptiveRouter.js` scores risk → selects strategy (council/hybrid/single) → delegates
* If council mode: `services/orchestrator.js::evaluateTestCase()` runs 3 judges in parallel → `services/aggregator.js` synthesizes with Claude Sonnet

**Circular dependency (intentional):** `orchestrator.js` imports `routeTestCase` from `adaptiveRouter.js`, which imports `evaluateTestCase` from `orchestrator.js`. Safe because both are function declarations (hoisted) used only at call-time.

**Adaptive strategies:**

* **Council** (risk >= 0.8): All 3 judges + Sonnet aggregator (existing path)
* **Hybrid** (0.4-0.8): `evaluators/deterministicChecks.js` (zero-cost) + OpenAI judge → local verdict
* **Single** (< 0.4): Gemini judge only → local verdict

**SSE streaming:** `utils/sse.js` SSEManager broadcasts events per jobId. `routes/stream.js` replays stored events for late-connecting clients, then subscribes to live events. Frontend receives 17 event types including `risk_scored`, `strategy_selected`, `deterministic_start/complete`.

**Key files:**

* `models/Evaluation.js` — Mongoose schema. `judges` field is `Mixed` (supports variable judge sets). Results carry `strategy`, `riskScore`, `deterministicChecks`.
* `services/costTracker.js` — In-memory accumulator, flushed once when evaluation completes (not per-judge).
* `routes/history.js` — Cursor-based pagination (not skip/offset), mounted at `/api` in index.js.

### Frontend (`frontend/src/`, React 18, Vite 6, TailwindCSS 3)

**State management:** All in `App.jsx` via useState. No external state library. View is `'upload' | 'evaluating' | 'history'`.

**SSE integration:** `hooks/useSSE.js` opens EventSource, accumulates events array, auto-closes on `evaluation_complete`/`evaluation_error`/`replay_complete`.

**Component data flow:** `App.jsx` → `StreamingEvaluation` receives raw events → `useMemo` derives `testCaseState` (per-test-case judge statuses, strategy, risk, deterministic results) → `TestCaseResult` renders dynamic judge cards based on `activeJudges` array from `strategy_selected` event.

**Dynamic rendering:** `TestCaseResult` reads `activeJudges` from SSE events to decide which `JudgeCard`s to show. Council=3 cards, hybrid=DeterministicChecksCard+1, single=1.

### API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/evaluate` | Start evaluation (accepts `options.strategy` and `options.riskOverride`) |
| GET | `/api/stream/:jobId` | SSE stream (replays events, then live) |
| GET | `/api/results/:jobId` | Poll for results (202 while processing) |
| GET | `/api/history` | Cursor-paginated history (query: limit, cursor, strategy, verdict, status) |
| GET | `/api/history/:jobId/cost` | Cost breakdown with savings estimate |
| GET | `/api/stats` | Aggregated stats across recent evaluations |

## Design

Follow DESIGN_SYSTEM.md for all frontend components. Every component must use the patterns defined there. No freestyle styling.

## Key Conventions

* Backend uses ESM (`"type": "module"` in package.json). All imports use `.js` extensions.
* Vite proxies `/api` requests to `http://localhost:3000` in dev.
* Cost values are rounded to 6 decimal places (`Math.round(cost * 1000000) / 1000000`).
* Judge results include `judge`, `metric`, `model`, `score`, `reason`, `details`, `tokens`, `cost`, `latency`.
* Backend `.env` contains live API keys — it is gitignored. Use `.env.example` as template.
* `ADAPTIVE_MODE=false` env var bypasses the adaptive router entirely (safe rollback).

## Implementation Guidelines

When implementing features, always deliver both backend AND frontend changes together. Never submit a backend-only implementation when the task implies a user-facing feature.

## UI/Styling

Always use the existing design system palette and color variables. Never default to dark theme or introduce new color schemes unless explicitly asked.

## General Workflow

Bias toward action over planning. If exploration/planning exceeds 2-3 minutes without producing code changes, pause and ask the user if they want implementation to begin.

## Writing & Content

For content generation (emails, pitches, copy), lead with 'why it matters' not 'what it is'. Focus on impact and value proposition first.

## Code Quality

When editing YAML files, validate syntax carefully — check for duplicate keys, correct nesting, and proper list formatting before committing.

## Debugging

After implementing UI changes, verify the running app serves the latest code. Stale builds/servers are a common source of 'it doesn't work' bugs.

---

## Plan Mode

When instructed to review a plan or enter "Plan Mode", you **MUST** read and strictly adhere to the workflow, review stages, and engineering preferences defined in `PLAN_MODE.md`.

---

## Docker & Deployment Rules

**Base images — NEVER use `node:XX-alpine` official images:**
- `node:XX.X-alpine` bundles npm outside Alpine's APK database; Docker Scout reports CVEs per-layer even after `npm install -g npm@newer` (the old layer remains visible to the scanner)
- ALWAYS use `FROM alpine:X.XX` + `RUN apk upgrade --no-cache && apk add --no-cache nodejs npm` for all Node build/runtime stages
- On Alpine 3.23, the Node.js package name is `nodejs` — NOT `nodejs-20` (does not exist), NOT `node`

**Lock files — tracked in git, use npm install in Docker:**
- `frontend/package-lock.json`, `backend/package-lock.json`, `demo/rag-chatbot/package-lock.json` are committed — `.gitignore` has explicit `!` exceptions for them; never remove these files from git
- NEVER use `npm ci` in Dockerfiles — lock files generated on Windows lack Linux platform-specific optional packages (`@esbuild/linux-*`, `@rollup/rollup-linux-*`); always use `npm install` (or `npm install --omit=dev`) instead
- IF "Missing: @esbuild/linux-* from lock file" → lock file generated on non-Linux; switch `npm ci` to `npm install`
- IF "npm ci can only install with an existing package-lock.json" → lock file not committed; check `.gitignore` exceptions

**Layer cache invalidation:**
- Changing any `FROM` line invalidates ALL subsequent layer caches on Render; any previously-hidden issue (missing build-arg env vars, missing files in git) will surface on the next fresh build

## Firebase Auth Rules

**Architecture (fixed — do not change):**
- ALWAYS use `signInWithPopup` — NEVER `signInWithRedirect` (Chrome 115+ storage partitioning permanently broke redirect auth)
- COOP header must be `same-origin-allow-popups` — set in `backend/src/index.js` via Helmet; do not change it

**Environment variables (Vite bakes these at build time):**
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` must exist in Render's environment variables panel BEFORE triggering a deploy
- If these vars are absent at build time, Firebase initializes with empty strings and `signInWithPopup` silently fails with `auth/popup-closed-by-user` (popup opens to malformed URL, closes immediately)
- IF `auth/popup-closed-by-user` on a fresh deploy → first check: are the three `VITE_FIREBASE_*` vars set in Render?

**New deployment checklist (every new domain/service):**
1. Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` in Render environment
2. Add the deployment URL to Firebase Console → Authentication → Settings → Authorized domains

**Error code reference:**
- `auth/popup-closed-by-user` = popup failed internally (check env vars + authorized domains) OR user closed it
- `auth/unauthorized-domain` = deployment URL missing from Firebase authorized domains → add it to Firebase Console
- `auth/popup-blocked` = browser blocked popup → user must allow popups for the site
- `auth/cancelled-popup-request` = two popups opened simultaneously → silently ignore (already handled)

**Code contract (do not regress):**
- `AuthContext.loginWithProvider` must `throw new Error(cleanMessage)` — NOT `throw err` — so callers receive readable text, not raw Firebase SDK strings
- `SocialAuth.jsx` checks `firebaseConfigured` (from `frontend/src/config/firebase.js`) and shows "Social sign-in is not configured." when Firebase vars are absent

## gstack

Use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.
If gstack skills aren't working, run `cd ~/.claude/skills/gstack && ./setup` to build the binary and register skills.

Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/autoplan, /design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark,
/browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro,
/investigate, /document-release, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade.

