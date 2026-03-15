# Contributing to Quorum

## Prerequisites

- Node.js 20+
- Docker (for MongoDB)
- API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`

## Local Setup

```bash
# MongoDB
docker run -d -p 27017:27017 mongo:7

# Backend
cd backend
cp .env.example .env   # add your API keys
npm run dev            # starts on :3000 with --watch

# Frontend (separate terminal)
cd frontend
npm run dev            # Vite dev server on :5173, proxies /api to :3000
```

Open `http://localhost:5173`.

## Architecture Overview

**Request flow:**
1. `POST /api/evaluate` validates with Zod, creates an Evaluation document, returns 202 with `jobId`
2. `services/orchestrator.js` loops through test cases sequentially
3. If adaptive mode: `orchestrator/adaptiveRouter.js` scores risk → selects strategy (council/hybrid/single)
4. SSE events stream to frontend via `utils/sse.js` SSEManager

**Strategies:**
- **Council** (risk ≥ 0.8): OpenAI + Anthropic + Gemini judges, aggregated by Claude Sonnet
- **Hybrid** (0.4–0.8): Deterministic checks + one LLM judge, local verdict
- **Single** (< 0.4): Gemini judge only

## How to Add a New Judge

1. Create `backend/src/services/judges/<provider>.js` — export an async `runJudge(testCase)` function returning `{ score, reason, details, tokens, cost, latency }`
2. Register it in `services/orchestrator.js` inside `evaluateTestCase()`
3. Add the provider's color token to `tailwind.config.js` and a `JudgeCard` variant in the frontend
4. Update `.env.example` with the new API key variable

## Code Style

- **Backend:** ESM modules (`"type": "module"`). All imports use `.js` extensions.
- **Comments:** Only for complex logic — sparse by default.
- **Tests:** Run `npm test` in `backend/` (vitest). No frontend tests exist yet.
- Cost values round to 6 decimal places: `Math.round(cost * 1000000) / 1000000`

## Pull Request Process

1. Branch from `main` with a descriptive name: `feature/...`, `fix/...`, `docs/...`
2. Open a PR with a clear title and description (what changed and why)
3. Update `CHANGELOG.md` under `[Unreleased]`
4. Ensure the dev stack runs without errors

## Good First Issues

Issues labeled `good first issue` are scoped, self-contained, and documented with enough context to get started without deep system knowledge. Check the [issue tracker](https://github.com/AlexLopezGomez/Quorum---Council-LLMs/issues) for open ones.

## Questions

Open a [GitHub Discussion](https://github.com/AlexLopezGomez/Quorum---Council-LLMs/discussions) for anything that isn't a bug or feature request.
