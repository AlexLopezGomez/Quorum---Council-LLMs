# RAGScope

A production-ready RAG (Retrieval-Augmented Generation) evaluation dashboard using a Council-of-LLMs architecture with **Adaptive Orchestration**. Three independent judges from different providers evaluate RAG outputs in parallel, with an intelligent routing layer that selects the optimal evaluation strategy based on test case risk scoring — reducing cost by 60-80% for low-risk queries while maintaining full council evaluation for high-risk ones.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐ │
│  │  Upload   │  │  Strategy │  │  History  │  │     Cost      │ │
│  │   Form    │  │   Badge   │  │   View    │  │   Breakdown   │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────────┘ │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐ │
│  │ Determin. │  │  OpenAI   │  │ Anthropic │  │    Gemini     │ │
│  │  Checks   │  │   Card    │  │   Card    │  │     Card      │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────────┘ │
│                     ┌─────────────────────┐                      │
│                     │   Aggregator Card   │                      │
│                     └─────────────────────┘                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ SSE Stream
┌────────────────────────────┴────────────────────────────────────┐
│                      Backend (Express.js)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Adaptive Router                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │ │
│  │  │   Risk   │  │ Strategy │  │   Cost   │                  │ │
│  │  │  Scorer  │→ │ Selector │→ │ Tracker  │                  │ │
│  │  └──────────┘  └──────────┘  └──────────┘                  │ │
│  │         ↓              ↓             ↓                      │ │
│  │  ┌──────────┐  ┌──────────────────────────┐                 │ │
│  │  │ Determ.  │  │       Orchestrator        │                │ │
│  │  │  Checks  │  │  ┌──────┐┌──────┐┌─────┐ │                │ │
│  │  │ (0-cost) │  │  │OpenAI││Anthro││Gemin│ │                │ │
│  │  └──────────┘  │  └──────┘└──────┘└─────┘ │                │ │
│  │                │         ↓                 │                │ │
│  │                │    ┌──────────┐            │                │ │
│  │                │    │Aggregator│            │                │ │
│  │                │    └──────────┘            │                │ │
│  │                └──────────────────────────┘                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Evaluation Strategies

| Strategy | Risk Score | Judges Used | Aggregation | Cost |
|----------|-----------|-------------|-------------|------|
| **Council** | >= 0.8 (high) | OpenAI + Anthropic + Gemini | Claude Sonnet | $$$ |
| **Hybrid** | 0.4-0.8 (medium) | Deterministic checks + OpenAI | Local weighted avg | $$ |
| **Single** | < 0.4 (low) | Gemini only | Local threshold | $ |

## Judges

| Provider   | Model                 | Metric            | Evaluates                                |
|------------|-----------------------|-------------------|------------------------------------------|
| OpenAI     | gpt-4o-mini           | Faithfulness      | Unsupported claims in the output         |
| Anthropic  | claude-3-haiku        | Groundedness      | Claims traced to source passages         |
| Google     | gemini-1.5-flash      | Context Relevancy | Quality of retrieved context             |
| Anthropic  | claude-sonnet-4       | Final Verdict     | Synthesizes all judge evaluations        |

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or cloud)
- API keys for OpenAI, Anthropic, and Google AI

### Setup

1. Clone and install dependencies:

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your API keys
npm install

# Frontend
cd ../frontend
npm install
```

2. Start MongoDB:

```bash
# Using Docker
docker run -d -p 27017:27017 mongo:7

# Or use docker-compose
docker-compose up mongodb -d
```

3. Start the services:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

4. Open http://localhost:5173

### Using Docker Compose

```bash
# Set environment variables
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=...

# Start all services
docker-compose up
```

## API Endpoints

### POST /api/evaluate
Start a new evaluation job.

**Request:**
```json
{
  "testCases": [
    {
      "input": "User query",
      "actualOutput": "RAG system response",
      "expectedOutput": "Optional expected response",
      "retrievalContext": ["Context passage 1", "Context passage 2"]
    }
  ],
  "options": {
    "strategy": "auto",
    "riskOverride": 0.9
  }
}
```

**Strategy options:** `"auto"` (default) | `"single"` | `"hybrid"` | `"council"`

**Response:**
```json
{
  "jobId": "abc123xyz",
  "strategy": "auto",
  "streamUrl": "/api/stream/abc123xyz",
  "resultsUrl": "/api/results/abc123xyz"
}
```

### GET /api/stream/:jobId
SSE endpoint for real-time evaluation updates.

**Events:**
- `evaluation_start` - Evaluation began
- `risk_scored` - Risk score computed for a test case
- `strategy_selected` - Evaluation strategy chosen (includes `activeJudges` array)
- `deterministic_start` - Deterministic checks started
- `deterministic_complete` - Deterministic checks finished
- `judge_start` - A judge started evaluating
- `judge_complete` - A judge finished with results
- `judge_error` - A judge encountered an error
- `aggregator_start` - Aggregator started
- `aggregator_complete` - Final verdict ready
- `evaluation_complete` - All test cases processed

### GET /api/results/:jobId
Retrieve completed evaluation results.

### GET /api/history
Browse past evaluations with cursor-based pagination.

**Query params:** `limit` (default 20, max 50), `cursor`, `strategy`, `verdict`, `status`

### GET /api/history/:jobId/cost
Detailed cost breakdown for an evaluation, including savings vs. all-council estimate.

### GET /api/stats
Aggregated statistics across recent evaluations.

## Test Case Format

```json
{
  "input": "The user's question or query",
  "actualOutput": "The RAG system's generated response",
  "expectedOutput": "Optional: The expected/ideal response",
  "retrievalContext": [
    "First retrieved passage from your knowledge base",
    "Second retrieved passage",
    "..."
  ]
}
```

## Configuration

### Environment Variables

| Variable            | Description                          | Default                    |
|---------------------|--------------------------------------|----------------------------|
| PORT                | Backend server port                  | 3000                       |
| MONGODB_URI         | MongoDB connection string            | mongodb://localhost:27017  |
| FRONTEND_URL        | Frontend URL for CORS                | http://localhost:5173      |
| OPENAI_API_KEY      | OpenAI API key                       | Required                   |
| ANTHROPIC_API_KEY   | Anthropic API key                    | Required                   |
| GOOGLE_API_KEY      | Google AI API key                    | Required                   |
| EVALUATION_TIMEOUT  | Judge timeout in milliseconds        | 30000                      |
| ADAPTIVE_MODE       | Enable adaptive orchestration        | true                       |
| RISK_HIGH_THRESHOLD | Risk score threshold for council     | 0.8                        |
| RISK_LOW_THRESHOLD  | Risk score threshold for single      | 0.4                        |

### Limits (Demo Mode)

- Max test cases per request: 10
- Max context passages per test case: 20
- Max input length: 1,000 characters
- Max output length: 5,000 characters
- Max context passage length: 10,000 characters

## Adaptive Orchestration

The adaptive router analyzes each test case and selects the optimal evaluation strategy:

### Risk Scoring Factors
- **High-risk keywords**: medical, legal, financial, safety domains
- **Low-risk keywords**: simple factoid queries (what is, who is, capital of)
- **Output length**: Longer outputs have more claims to verify
- **Numerical claims**: Numbers with units increase verification complexity
- **Negation patterns**: Nuanced logic requires careful evaluation
- **Context count**: More context passages increase verification scope
- **Expected output**: Having a reference answer reduces risk

### Deterministic Checks (Zero-Cost)
- **Entity Match**: Verifies output entities exist in context/query
- **Freshness**: Checks for stale year references in context
- **Context Overlap**: Jaccard token similarity between output and context
- **Completeness**: Query terms addressed in the output

## Deployment

### Fly.io

```bash
fly auth login
fly launch
fly secrets set OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-... GOOGLE_API_KEY=...
fly deploy
```

## Scoring

### Individual Metrics (0-1 scale)

- **1.0**: Perfect - all criteria fully met
- **0.7-0.9**: Good - minor issues
- **0.4-0.6**: Fair - some significant issues
- **0.1-0.3**: Poor - major issues
- **0.0**: Failed - criteria not met

### Final Verdict

- **PASS**: Score >= 0.7 and no critical issues
- **WARN**: Score 0.4-0.7 or minor issues
- **FAIL**: Score < 0.4 or critical issues

## License

MIT
