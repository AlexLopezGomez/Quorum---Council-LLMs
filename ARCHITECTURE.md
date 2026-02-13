# Architecture

## System Overview

```mermaid
graph TB
    subgraph Client
        SDK["@ragscope/sdk"]
        Dashboard["React Dashboard"]
    end

    subgraph Backend["Express Backend"]
        API["REST API"]
        SSE["SSE Manager"]
        Router["Adaptive Router"]
        Orchestrator["Orchestrator"]
        Webhooks["Webhook Service"]
    end

    subgraph Judges
        OpenAI["OpenAI<br/>gpt-4o-mini<br/>Faithfulness"]
        Anthropic["Anthropic<br/>claude-3-haiku<br/>Groundedness"]
        Gemini["Google<br/>gemini-1.5-flash<br/>Relevancy"]
    end

    subgraph Aggregator
        Sonnet["Claude Sonnet<br/>Final Verdict"]
    end

    subgraph Storage
        MongoDB[(MongoDB)]
    end

    SDK -->|POST /api/ingest| API
    Dashboard -->|POST /api/evaluate| API
    Dashboard -->|GET /api/stream/:id| SSE
    API --> Router
    Router -->|risk >= 0.8| Orchestrator
    Router -->|0.4-0.8| Orchestrator
    Router -->|< 0.4| Orchestrator
    Orchestrator --> OpenAI
    Orchestrator --> Anthropic
    Orchestrator --> Gemini
    Orchestrator --> Sonnet
    Orchestrator --> MongoDB
    Orchestrator --> SSE
    Orchestrator --> Webhooks
    SSE -->|17 event types| Dashboard
    Webhooks -->|POST| External["Slack / Webhook.site"]
```

## Adaptive Orchestration Flow

```mermaid
flowchart TD
    Start["New Test Case"] --> Score["Score Risk"]
    Score --> Decision{Risk Score?}

    Decision -->|>= 0.8| Council["Council Strategy"]
    Decision -->|0.4 - 0.8| Hybrid["Hybrid Strategy"]
    Decision -->|< 0.4| Single["Single Strategy"]

    Council --> J1["OpenAI Judge"]
    Council --> J2["Anthropic Judge"]
    Council --> J3["Gemini Judge"]
    J1 & J2 & J3 --> Agg["Claude Sonnet Aggregator"]
    Agg --> Result["Final Verdict"]

    Hybrid --> Det["Deterministic Checks<br/>(zero cost)"]
    Hybrid --> J4["OpenAI Judge"]
    Det & J4 --> Local1["Local Weighted Avg"]
    Local1 --> Result

    Single --> J5["Gemini Judge"]
    J5 --> Local2["Local Threshold"]
    Local2 --> Result
```

## SDK Data Flow

```mermaid
sequenceDiagram
    participant App as Your Application
    participant SDK as @ragscope/sdk
    participant API as RAGScope Backend
    participant Eval as Evaluation Pipeline

    App->>SDK: ragscope.capture(payload)
    Note over SDK: Buffers in memory
    SDK->>SDK: Buffer >= batchSize?
    alt Buffer full or interval fires
        SDK->>API: POST /api/ingest (batch)
        API->>Eval: runEvaluation(testCases)
        API-->>SDK: { jobId, streamUrl }
    end
    Note over Eval: Judges evaluate in parallel
    Eval-->>API: Results saved to MongoDB
```

## SSE Event Protocol

| Event | Direction | Data | When |
|-------|-----------|------|------|
| `connected` | Server → Client | `{ jobId, status }` | On SSE connection |
| `evaluation_start` | Server → Client | `{ jobId, totalTestCases, strategy }` | Evaluation begins |
| `test_case_start` | Server → Client | `{ testCaseIndex, total }` | Each test case begins |
| `risk_scored` | Server → Client | `{ riskScore, riskFactors, selectedStrategy }` | After risk analysis |
| `strategy_selected` | Server → Client | `{ strategy, activeJudges }` | Strategy chosen |
| `deterministic_start` | Server → Client | `{ testCaseIndex }` | Heuristic checks begin |
| `deterministic_complete` | Server → Client | `{ results, avgScore }` | Heuristic checks done |
| `judge_start` | Server → Client | `{ judge, metric }` | Judge begins evaluating |
| `judge_complete` | Server → Client | `{ judge, result }` | Judge returns result |
| `judge_error` | Server → Client | `{ judge, error }` | Judge failed |
| `aggregator_start` | Server → Client | `{ judgeCount }` | Aggregation begins |
| `aggregator_complete` | Server → Client | `{ result }` | Final verdict ready |
| `aggregator_error` | Server → Client | `{ error }` | Aggregation failed |
| `test_case_complete` | Server → Client | `{ testCaseIndex }` | Test case done |
| `evaluation_complete` | Server → Client | `{ summary }` | All test cases done |
| `evaluation_error` | Server → Client | `{ error }` | Fatal error |
| `replay_complete` | Server → Client | `{ status }` | Late-connect replay done |

## Cost Model

| Strategy | Components | Approximate Cost per Test Case |
|----------|-----------|-------------------------------|
| Council | 3 judges + Sonnet aggregator | ~$0.0035 |
| Hybrid | Deterministic (free) + 1 judge | ~$0.0008 |
| Single | 1 judge only | ~$0.0003 |

Cost savings with adaptive routing: **60-80%** for workloads with mixed risk levels.
