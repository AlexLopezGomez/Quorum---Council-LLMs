# Quorum

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Node 20+](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**Adaptive RAG evaluation with a Council-of-LLMs — route each test case to the optimal strategy based on risk.**

> **[Live Demo](https://quorum.onrender.com)** — zero setup, no API keys needed. Click "Run Demo" and watch adaptive orchestration in real time.

## The Problem

RAG systems fail silently. The retriever fetches wrong documents, the generator hallucinates, stale data gets served as truth — and nothing breaks. No error, no alert, just bad information reaching users.

Evaluating every query with a full multi-judge panel costs ~$0.0035/case. At scale, this becomes prohibitively expensive — but using a single cheap judge misses subtle failures on high-stakes queries.

## The Solution

Quorum scores each test case for **risk** and routes it to the optimal evaluation strategy:

```
                    ┌──────────────────┐
                    │   Risk Scorer    │
                    │  (real analysis) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         risk ≥ 0.8    0.4 ≤ risk < 0.8  risk < 0.4
              │              │              │
     ┌────────┴────────┐  ┌──┴───┐    ┌────┴────┐
     │    Council       │  │Hybrid│    │ Single  │
     │ 3 judges + agg.  │  │det + │    │ Gemini  │
     │ ~$0.0035/case    │  │1 judge│   │~$0.00005│
     └─────────────────┘  └──────┘    └─────────┘
```

**Cost reduction: up to 70x cheaper** on low-risk cases vs. full council, with no quality loss on high-risk queries.

### Council Mode (High Risk)
Medical dosages, legal requirements, safety procedures — queries where errors have real consequences get the full treatment: OpenAI (faithfulness) + Anthropic (groundedness) + Gemini (context relevancy), synthesized by Claude Sonnet 4.

### Hybrid Mode (Medium Risk)
Technical explanations, financial advice — zero-cost deterministic checks (Jaccard similarity, entity matching, freshness, completeness) run first, then a single LLM judge validates. Local verdict computation, no aggregator needed.

### Single Mode (Low Risk)
"What is the capital of Japan?" — one Gemini call, done. No wasted spend on trivial factoid queries.

## Real-Time Streaming

17 SSE event types stream the entire evaluation lifecycle:

```
risk_scored → strategy_selected → judge_start → judge_complete → aggregator_start → ...
```

The frontend renders judges appearing staggered with live score animations — council shows 3 judge cards, hybrid shows deterministic checks + 1 judge, single shows 1 judge. All driven by SSE events, not hardcoded layouts.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                       │
│  Upload → Strategy Select → Live Streaming → History → Costs    │
└────────────────────────────────┬────────────────────────────────┘
                                 │ SSE + REST
┌────────────────────────────────┴────────────────────────────────┐
│                     Backend (Express + MongoDB)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Adaptive Router                        │   │
│  │  Risk Scorer → Strategy Selector → Cost Tracker          │   │
│  │       ↓               ↓                ↓                 │   │
│  │  ┌─────────┐  ┌──────────────────────────┐               │   │
│  │  │Determin.│  │      Orchestrator         │              │   │
│  │  │ Checks  │  │  OpenAI │ Anthropic │ Gem │              │   │
│  │  │(0-cost) │  │         ↓                 │              │   │
│  │  └─────────┘  │      Aggregator           │              │   │
│  │               └──────────────────────────┘               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│                    Webhook Service → Slack / HTTP                │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Demo Mode (no dependencies)

```bash
git clone https://github.com/your-org/quorum.git && cd quorum
cd frontend && npm ci && npm run build && cd ..
cd backend && npm ci
DEMO_MODE=true node src/index.js
```

Open **http://localhost:3000** — click "Run Demo" to launch a 10-case adaptive evaluation.

No MongoDB, no API keys, no Docker. The demo runs the real orchestration engine with mocked judge I/O at the boundary.

### Full Mode (with API keys)

```bash
cd backend && cp .env.example .env  # Add OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY
docker run -d -p 27017:27017 mongo:7
npm run dev &
cd ../frontend && npm run dev &
```

Open **http://localhost:5173**.

### Docker (Full Stack)

```bash
docker-compose up --build
# Open http://localhost:8080
```

## SDK

Zero-dependency ESM module for capturing RAG interactions:

```js
import { Quorum } from '@quorum/sdk';

const quorum = new Quorum({ endpoint: 'http://localhost:3000' });

quorum.capture({
  input: 'What is the capital of France?',
  actualOutput: 'The capital of France is Paris.',
  retrievalContext: ['Paris is the capital and largest city of France.'],
});

await quorum.close();
```

Batched transport with exponential backoff, PII sanitization on by default. See [sdk/README.md](./sdk/README.md).

## CLI

```bash
npx quorum test --file test-cases.json    # Run evaluation
npx quorum init                            # Scaffold config
npx quorum validate                        # Validate test case format
```

## API

Interactive docs at `/api/docs` (Swagger UI).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/evaluate` | Start evaluation (accepts strategy + riskOverride) |
| GET | `/api/stream/:jobId` | SSE stream (replays + live) |
| GET | `/api/results/:jobId` | Poll for results |
| GET | `/api/history` | Cursor-paginated history |
| GET | `/api/history/:jobId/cost` | Cost breakdown with savings estimate |
| GET | `/api/stats` | Aggregated statistics |

## Tech Stack

**Backend:** Node.js 20+, Express, MongoDB/Mongoose, Zod, SSE
**Frontend:** React 18, Vite 6, TailwindCSS 3, Lucide React
**SDK:** Zero-dependency ESM with native fetch
**LLM Providers:** OpenAI (gpt-4o-mini), Anthropic (claude-3-haiku, claude-sonnet-4), Google (gemini-2.5-flash)

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System diagrams, data flow, SSE protocol
- [DECISIONS.md](./docs/DECISIONS.md) — Architectural decision records
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — Frontend component patterns
- [sdk/README.md](./sdk/README.md) — SDK integration guide

## Research & Benchmarks

- Public benchmark results: [`/benchmarks`](https://quorum.onrender.com/benchmarks)
- Research assets: [paper/README.md](./paper/README.md)
- Preprint source: [paper/main_publish.tex](./paper/main_publish.tex)
- Blog post draft: [paper/blog_post.md](./paper/blog_post.md)

## Contributing

Community contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md)
for local setup, architecture notes, and pull request expectations.

## License

[MIT](./LICENSE)
