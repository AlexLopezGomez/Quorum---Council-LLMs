# Architectural Decision Records

## ADR-001: Council-of-LLMs vs Single Evaluator

**Context:** RAG evaluation requires assessing multiple quality dimensions (faithfulness, groundedness, context relevancy). A single model may have blind spots or biases.

**Decision:** Use three independent judges from different providers (OpenAI, Anthropic, Google) evaluating orthogonal metrics, synthesized by a separate aggregator (Claude Sonnet).

**Rationale:** Provider diversity eliminates single-model bias. Each judge specializes in one metric, reducing prompt complexity and improving accuracy. The aggregator provides a holistic verdict considering all perspectives.

**Trade-offs:** Higher cost (~$0.0035/case vs ~$0.0003 for single) and latency (~3s vs ~1s). Mitigated by adaptive routing.

---

## ADR-002: Adaptive Strategy Selection

**Context:** Not all test cases warrant full council evaluation. Simple factoid queries don't need 3 judges + aggregator.

**Decision:** Risk-based routing with three tiers: council (risk >= 0.8), hybrid (0.4-0.8), single (< 0.4). Rule-based risk scoring analyzes query complexity, domain sensitivity, output length, and claim density.

**Rationale:** Reduces cost by 60-80% for mixed workloads while maintaining full evaluation for high-stakes queries. The deterministic checks in hybrid mode add signal at zero API cost.

**Trade-offs:** Rule-based scoring may misclassify edge cases. Mitigated by `riskOverride` parameter and `ADAPTIVE_MODE=false` killswitch.

---

## ADR-003: SSE vs WebSocket for Real-Time Updates

**Context:** The frontend needs real-time evaluation progress (judge starts, completions, verdicts).

**Decision:** Server-Sent Events (SSE) over WebSocket.

**Rationale:** Evaluation streaming is unidirectional (server → client). SSE is simpler (native browser `EventSource`), works through HTTP proxies, auto-reconnects, and requires no additional libraries. WebSocket's bidirectional capability is unnecessary overhead.

**Trade-offs:** No client-to-server messaging (not needed). Limited to ~6 concurrent connections per domain in HTTP/1.1 (adequate for dashboard use).

---

## ADR-004: Cursor-Based vs Offset Pagination

**Context:** The history endpoint needs pagination for potentially large evaluation collections.

**Decision:** Cursor-based pagination using MongoDB `_id` as cursor.

**Rationale:** Stable results when new evaluations are inserted during browsing (offset pagination skips/duplicates items). O(1) performance regardless of page depth (offset pagination degrades at high offsets). Natural fit with MongoDB's `_id` ordering.

**Trade-offs:** Can't jump to arbitrary pages (acceptable for timeline-style UI). Slightly more complex client implementation.

---

## ADR-005: Intentional Circular Dependency

**Context:** `orchestrator.js` needs `adaptiveRouter.js` for strategy routing, and `adaptiveRouter.js` needs `evaluateTestCase` from `orchestrator.js` for the council strategy path.

**Decision:** Accept the circular import. Both are function declarations (hoisted), used only at call-time, never at import-time.

**Rationale:** Extracting `evaluateTestCase` to a third file would fragment the orchestration logic without improving clarity. The circular dependency is safe because JavaScript function declarations are hoisted — the functions exist by the time they're called, regardless of import order.

**Trade-offs:** May surprise developers unfamiliar with the pattern. Documented in CLAUDE.md.

---

## ADR-006: Fire-and-Forget Webhooks

**Context:** Webhook delivery should not block evaluation completion or SSE event emission.

**Decision:** `fireWebhooks()` is called with `.catch(() => {})` — completely fire-and-forget. Individual webhook failures are logged and tracked (auto-disable after 5 consecutive failures) but never propagate.

**Rationale:** Evaluation is the primary concern. A failing Slack webhook should never delay results delivery to the dashboard. The webhook service handles its own retry/disable logic independently.

**Trade-offs:** No delivery guarantee. Acceptable for alerting (vs. transactional webhooks). Users can check `failureCount` in the webhook management UI.

---

## ADR-007: SDK Non-Blocking Design

**Context:** The SDK runs inside customer applications. It must never degrade host app performance or crash on failures.

**Decision:** `capture()` is synchronous (buffer push), `flush()` is async with flushing lock, transport has 3-retry exponential backoff with 5s timeout, all errors caught and logged (never thrown).

**Rationale:** A monitoring SDK that crashes the monitored app defeats its purpose. The buffer + interval pattern decouples capture frequency from network I/O. The flushing lock prevents duplicate sends under high load.

**Trade-offs:** Data can be lost if the process crashes before flush. Acceptable for evaluation telemetry (not financial transactions).

---

## ADR-008: MongoDB vs PostgreSQL

**Context:** Need a database for evaluation results, events, and webhooks.

**Decision:** MongoDB with Mongoose ODM.

**Rationale:** Evaluation results have variable structure (different judge sets per strategy, mixed schema for deterministic checks). MongoDB's flexible schema (`Mixed` type) handles this naturally. The event log (append-heavy, read-once for replay) fits document model well. Single-collection queries (no joins needed) simplify the data layer.

**Trade-offs:** No ACID transactions across collections (not needed — one evaluation = one document). Less tooling for complex analytics (acceptable for an evaluation platform).

---

## ADR-009: Express vs Fastify

**Context:** Need a Node.js HTTP framework for the backend API.

**Decision:** Express 4.x.

**Rationale:** Express has the largest ecosystem, most middleware options, and lowest learning curve. Quorum's bottleneck is LLM API latency (1-3s per judge), not request handling throughput. Express's performance (~15k req/s) is orders of magnitude above our needs.

**Trade-offs:** No built-in schema validation (we use Zod), no built-in TypeScript support (we use JSDoc). Fastify's performance advantages are irrelevant at our scale.

---

## ADR-010: Rule-Based Risk Scoring vs ML

**Context:** Need to classify test case risk to select evaluation strategy.

**Decision:** Hand-crafted rule-based scoring with keyword matching, pattern detection, and heuristic factors.

**Rationale:** Interpretable — each risk factor is visible in the SSE stream and dashboard. No training data needed. No additional model inference cost. Fast (<1ms). Easy to tune thresholds via environment variables. For an evaluation platform, the risk scoring doesn't need to be perfect — it just needs to be directionally correct (save cost on obviously simple queries, go full council on complex ones).

**Trade-offs:** Won't catch subtle risk signals that ML could learn. May need periodic keyword list updates. Acceptable because misclassification cost is bounded (worst case: slightly over/under-evaluating some queries).
