# Quorum

**Catch silent RAG failures before your users do.**

Quorum is an evaluation platform that uses a Council-of-LLMs to evaluate RAG system outputs across multiple quality dimensions — faithfulness, groundedness, and context relevancy — with an adaptive orchestration layer that routes each test case to the optimal evaluation strategy based on risk scoring.

## Why This Exists

RAG systems fail silently. The retriever fetches the wrong documents, the generator hallucinates confident answers, stale data gets served as truth — and nothing breaks. No error, no alert, just a user getting bad information.

Quorum catches these failures by:

- **Multi-perspective evaluation** — 3 judges from different LLM providers, each checking a different quality dimension
- **Adaptive cost control** — Not every query needs $0.003 of evaluation. Simple factoid queries get a single judge, complex medical/legal queries get the full council
- **Real-time streaming** — Watch evaluations happen live with 17 SSE event types
- **SDK integration** — Drop a 3-line SDK into your RAG pipeline and capture interactions automatically
- **Webhook alerting** — Get Slack notifications when evaluations fail, scores drop, or costs spike

## Key Features

| Feature | Description |
|---------|-------------|
| Council-of-LLMs | OpenAI + Anthropic + Gemini judges with Claude Sonnet aggregator |
| Adaptive Routing | Risk-based strategy selection — council, hybrid, or single judge |
| Deterministic Checks | Zero-cost heuristic evaluation (entity match, freshness, overlap, completeness) |
| SSE Streaming | 17 event types for real-time evaluation progress |
| SDK | Zero-dependency capture SDK with batching and retry |
| Webhooks | Configurable alerts for failures, score drops, and cost spikes |
| API Documentation | Interactive Swagger UI at `/api/docs` |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/quorum.git
cd quorum
cd backend && cp .env.example .env  # Add your API keys
npm install && cd ../frontend && npm install && cd ..

# 2. Start MongoDB
docker run -d -p 27017:27017 mongo:7

# 3. Run
cd backend && npm run dev &
cd frontend && npm run dev &
```

Open **http://localhost:5173** — load sample data and run an evaluation.

### Docker (Full Stack)

```bash
docker-compose up --build
# Open http://localhost:8080
```

### With Demo Chatbot

```bash
docker-compose --profile demo up --build
# Chatbot at :4000, Dashboard at :8080, API at :3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                       │
│  Upload → Strategy Select → Live Streaming → History → Webhooks │
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

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for Mermaid diagrams and the full SSE event protocol.

## SDK Usage

```bash
cd sdk && npm link  # or use file dependency
```

```js
import { Quorum } from '@quorum/sdk';

const quorum = new Quorum({ endpoint: 'http://localhost:3000' });

// After each RAG interaction
quorum.capture({
  input: 'What is the capital of France?',
  actualOutput: 'The capital of France is Paris.',
  retrievalContext: ['Paris is the capital and largest city of France.'],
});

// On shutdown
await quorum.close();
```

The SDK batches captures and sends them to `/api/ingest`. Zero dependencies, non-blocking, with exponential backoff retry.

See [sdk/README.md](./sdk/README.md) for Express middleware and LangChain callback examples.

## Demo

The demo simulates a coliving platform chatbot with intentional RAG failures:

```bash
cd demo/rag-chatbot && npm install
node server.js &          # Starts chatbot on :4000
cd .. && node run-scenario.js scenarios/silent-failures.json
```

**Scenario files:**
- `happy-path.json` — 5 test cases that should PASS
- `silent-failures.json` — 8 specific failure types (wrong retrieval, stale data, hallucination, price errors, city confusion, missing context, cross-entity contamination)
- `mixed-risk.json` — 10 test cases spanning all risk tiers

## API Reference

Interactive docs at **http://localhost:3000/api/docs** (Swagger UI).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/evaluate` | Start evaluation (1-10 test cases) |
| POST | `/api/ingest` | SDK batch capture (1-50 items) |
| GET | `/api/stream/:jobId` | SSE real-time stream |
| GET | `/api/results/:jobId` | Poll for results |
| GET | `/api/history` | Cursor-paginated history |
| GET | `/api/history/:jobId/cost` | Cost breakdown |
| GET | `/api/stats` | Aggregated statistics |
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks` | List webhooks |
| PATCH | `/api/webhooks/:id` | Update webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |
| POST | `/api/webhooks/:id/test` | Test webhook delivery |
| GET | `/api/observability/search` | Search logs/audit by `requestId` or `jobId` |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `ANTHROPIC_API_KEY` | Anthropic API key | Required |
| `GOOGLE_API_KEY` | Google AI API key | Required |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/quorum` |
| `PORT` | Backend port | `3000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `ADAPTIVE_MODE` | Enable adaptive routing | `true` |
| `RISK_HIGH_THRESHOLD` | Council threshold | `0.8` |
| `RISK_LOW_THRESHOLD` | Single threshold | `0.4` |
| `EVALUATION_TIMEOUT` | Judge timeout (ms) | `30000` |
| `LOG_PERSIST` | Persist structured logs/audits in Mongo | `false` |
| `APP_LOG_TTL_DAYS` | Retention for app logs | `30` |
| `AUDIT_TTL_DAYS` | Retention for audit events | `180` |

## Evaluation Strategies

| Strategy | Risk | Judges | Cost |
|----------|------|--------|------|
| **Council** | >= 0.8 | OpenAI + Anthropic + Gemini + Sonnet | ~$0.0035 |
| **Hybrid** | 0.4-0.8 | Deterministic + OpenAI | ~$0.0008 |
| **Single** | < 0.4 | Gemini only | ~$0.0003 |

## Tech Stack

**Backend:** Node.js 20+, Express, MongoDB/Mongoose, Zod, SSE, Swagger
**Frontend:** React 18, Vite 6, TailwindCSS 3, Lucide React
**SDK:** Zero-dependency ESM module with native fetch
**LLM Providers:** OpenAI (gpt-4o-mini), Anthropic (claude-3-haiku, claude-sonnet-4), Google (gemini-1.5-flash)
**Infrastructure:** Docker Compose, nginx

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System diagrams, data flow, SSE protocol, cost model
- [DECISIONS.md](./docs/DECISIONS.md) — 10 architectural decision records
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — Frontend component patterns and styling guide
- [sdk/README.md](./sdk/README.md) — SDK quickstart and integration patterns
- [docs/observability-audit.md](./docs/observability-audit.md) — Correlation IDs, audit events, retention, and incident runbook

## License

MIT
 
 