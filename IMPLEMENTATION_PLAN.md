# Quorum Main Implementation Guide

Last updated: 2026-02-23 (status refresh after WP0.1/WP1.1/WP1.2)
Owner: Product + Engineering
Scope: This is the main build-and-ship guide for upcoming sessions and days.

## 1. Why this document exists

Quorum is moving from "evaluation dashboard" to "CI/CD quality gate that blocks bad AI releases".
This document defines exactly how we execute that shift without losing product focus or over-engineering too early.

This guide is the source of truth for:

- What to build first
- Why each decision is made
- How each decision affects product outcomes
- What "done" means for each phase
- How to run day-to-day implementation sessions

## 2. Current reality snapshot (as of 2026-02-23)

### 2.1 Core already implemented

- Council + adaptive orchestration backend
- Threshold evaluator and related tests
- Golden datasets + meta-eval script
- CLI package (`test`, `init`, `validate`) with tests
- GitHub Action quality gate wiring (WP0.1)
- Provider throttling resilience foundation (WP1.1 + WP1.2)

### 2.2 Pending from original plan

- Commit 6: SDK PII sanitization
- Commit 7: CI/CD documentation package

### 2.3 Structural gaps blocking enterprise readiness

- SDK and backend auth mismatch (`apiKey` in SDK, cookie-only backend auth flow)
- Missing service-to-service auth model for SDK/CLI automation
- Missing `.github` action/workflow to enforce gates in CI
- Missing PII sanitizer implementation in SDK
- Ingestion path drops important metadata (`metadata`, `capturedAt`) before evaluation
- Insecure JWT secret fallback for production path
- Plan/docs drift and broken docs links

### 2.4 Reliability incident status (updated)

- GitHub Action config-path issue is resolved (`tests/golden/.quorum.yml` is now used).
- Runtime rate limiting during evaluation (`HTTP 429`) remains a reliability risk.
- Latest PR run produced `Overall: ERROR` with 25 errored cases, primarily due to `Evaluate request failed (429)` and `Polling failed (429)`.
- Runtime resilience hardening for throttling is implemented (WP1.1 + WP1.2); next step is telemetry validation and tuning (WP1.3).

## 3. Product strategy for next sessions

We will run a dual-track strategy:

1. PMF Track (product value): keep improving quality-gate outcomes and user trust.
2. Enterprise Foundation Track (deal unblockers): implement only the enterprise features that repeatedly block adoption.

Reason:

- Product-only strategy fails when deals die at security/procurement.
- Enterprise-only strategy risks feature bloat before value scales.
- Dual track keeps delivery velocity while removing known blockers.

Product impact:

- Faster adoption in current users
- Higher conversion for mid-market and enterprise opportunities
- Lower technical debt from "bolt-on enterprise" later

## 4. Decision framework (non-negotiable)

Use this to decide what goes in scope:

1. Build if it protects release quality directly.
2. Build if it repeatedly blocks deals (>= 2-3 real opportunities).
3. Build if it materially reduces reliability incidents.
4. Do not build if it is speculative or single-customer vanity.

## 5. Original commit status (explicit)

### Completed and removed from active build queue

- Commit 1: Schemas + validation/model updates
- Commit 2: Threshold evaluator + tests
- Commit 3: Golden datasets + meta-evaluation
- Commit 4: CLI implementation + tests
- Commit 5: GitHub Action quality gate

### Active and pending

- Commit 6: SDK PII sanitization
- Commit 7: Documentation refresh and operational docs

## 6. Architecture decisions (with rationale and product effect)

This section is mandatory reference before changing architecture.

### AD-01: Keep monolith API for now, add hard boundaries by module

Decision:

- Keep current Express backend process for now.
- Enforce clear module boundaries for auth, orchestration, ingest, and policy.

Why:

- Current scale does not justify service split risk and overhead.
- Main risk today is reliability/auth/compliance, not microservice decomposition.

Product effect:

- Faster shipping in next sessions.
- Lower coordination overhead.
- Easier rollback and diagnosis during rapid iteration.

Tradeoff:

- Not horizontally optimal long-term.
- Mitigation: queue/worker path is planned in Phase 3.

---

### AD-02: Quality gate is core product, not add-on

Decision:

- GitHub Action + policy evaluation become first-class product surface.

Why:

- Business value is deployment prevention for bad AI changes.
- Dashboard-only value does not enforce behavior in engineering workflows.

Product effect:

- Direct integration with release lifecycle.
- Clear "pass/fail" decision point for teams.
- Better retention through workflow lock-in.

---

### AD-03: Dual auth model (interactive + service auth)

Decision:

- Keep cookie auth for browser UX.
- Add service auth for SDK/CLI automation (scoped API keys or OAuth client credentials).

Why:

- Current cookie-only model blocks non-browser integrations.
- CI systems and server workflows need non-interactive authentication.

Product effect:

- SDK usable in backend pipelines at scale.
- CLI and automation become enterprise-credible.
- Lower integration friction.

Risk:

- Security complexity increases.
- Mitigation: scoped keys, rotation, audit events, explicit revocation flows.

---

### AD-04: PII sanitizer default ON in SDK

Decision:

- Add SDK sanitizer with opt-out (`sanitize: false`).

Why:

- Data handling trust is central in AI evaluations.
- Most users will not configure sanitization correctly if default OFF.

Product effect:

- Better default compliance posture.
- Stronger buyer trust and procurement confidence.

Tradeoff:

- Possible false positives in replacements.
- Mitigation: document limitations and future custom patterns.

---

### AD-05: Rate-limit resilience by controlled concurrency + retry-after handling

Decision:

- Add provider-aware concurrency limits.
- Honor provider `Retry-After` and emit explicit SSE events for throttling.

Why:

- Current burst behavior can create avoidable 429 failures.
- Silent waits degrade user trust and create false failure perceptions.

Product effect:

- Higher evaluation completion rate.
- More predictable latency under load.
- Better operator visibility.

---

### AD-06: Evaluate production with sampling, not 100 percent traffic

Decision:

- Add sampled production evaluation strategy (configurable sampling rate).

Why:

- Full-traffic evaluation cost becomes prohibitive quickly.
- Teams need quality signal, not full duplication cost.

Product effect:

- Scalable monitoring economics.
- Better continuous quality visibility post-deploy.

---

### AD-07: Stage-level diagnosis over single aggregate score

Decision:

- Extend results model to include stage-level signals:
  - ingestion
  - parsing
  - chunking
  - retrieval
  - rerank
  - generation

Why:

- Many RAG failures originate before final generation.
- Aggregate score hides root cause.

Product effect:

- Faster debugging.
- Better user trust in verdict explainability.
- Lower MTTR for quality regressions.

## 7. Execution roadmap (dates, outputs, acceptance gates)

## Phase 0: Immediate unblockers
Window: 2026-02-23 to 2026-03-08
Goal: remove blockers that prevent Quorum from functioning as a credible quality gate in real teams.

### WP0.1 - Commit 5: GitHub Action quality gate (Done)
Status: Completed (2026-02-23)
Deliverables:

- `.github/actions/quorum-test/action.yml`
- `.github/workflows/quorum-example.yml`

Key decisions:

- Action fails pipeline on non-zero `quorum test` result.
- PR comment uses marker upsert (single evolving comment).
- Baseline artifact upload supported.

Product effect:

- Quality gate becomes enforceable in CI.
- Faster feedback in PR context.

Critical checks:

- Health endpoint path must be aligned (`/health` or `/api/health`, choose one and standardize).
- Secret validation and clear failure messages.

Acceptance:

- Action runs in a real PR.
- Report is posted/updated (not spammed).
- Failed evaluation blocks merge.

Status note (2026-02-23):

- Workflow/action pathing is fixed and validated in PR runs.
- Gate behavior is correct: non-zero CLI exit produces blocked merge with report comment.
- Remaining failures are evaluation runtime `429` incidents and are tracked in Phase 1 (WP1.1/WP1.2).

---

### WP0.2 - Commit 6: SDK PII sanitizer

Deliverables:

- `sdk/src/sanitizer.js`
- `sdk/tests/sanitizer.test.js`
- `sdk/tests/collector.test.js`
- SDK package test setup

Key decisions:

- Default sanitize ON.
- Preserve metadata.
- Explicit opt-out path.

Product effect:

- Better trust and legal posture for SDK adoption.

Acceptance:

- Sanitizer tests pass.
- Collector tests verify before-buffer sanitization.
- SDK exposes sanitizer functions publicly.

---

### WP0.3 - Service auth and SDK/backend contract fix

Deliverables:

- Backend supports non-cookie service auth path for ingest/evaluate.
- Key issuance, key scopes, key revocation APIs.
- Auth audit events for key usage.

Key decisions:

- Scope keys to org/project and route-level permissions.
- Do not store plaintext keys; store one-way hash and metadata.

Product effect:

- Quorum becomes automation-native.
- Removes major integration blocker for backend users.

Acceptance:

- SDK with service auth can ingest successfully without browser login.
- Revoked keys are rejected immediately.

---

### WP0.4 - Preserve ingest metadata and timestamps

Deliverables:

- Ingest mapping carries `metadata` and `capturedAt` into stored/evaluated data model.

Product effect:

- Better traceability and incident investigation.
- Enables richer analytics and governance.

Acceptance:

- End-to-end test confirms metadata arrives in persisted evaluation artifacts.

---

### WP0.5 - Security hardening and doc correction

Deliverables:

- Fail-fast startup if required production secrets are missing.
- Remove insecure JWT production fallback.
- Fix README/docs path drift and plan status drift.

Product effect:

- Lower security risk.
- Less operator confusion.

Acceptance:

- Production startup fails with clear message if secrets missing.
- Docs links are valid in CI.

---

### Phase 0 release gate

All must be true:

- [x] CI gate runs in GitHub Actions
- [x] SDK service auth works in automation
- [x] PII sanitizer implemented and tested
- [x] Ingest metadata preserved
- [x] Security startup guardrails active
- [x] Docs reflect real system state

## Phase 1: Reliability and runtime resilience
Window: 2026-03-09 to 2026-04-05
Goal: make evaluation execution predictable under provider limits and production load.

### WP1.1 - Provider concurrency control
Status: Implemented (2026-02-23), CI/runtime validation ongoing via WP1.3

Deliverables:

- Shared concurrency limiter per provider
- Configurable limits by environment

Product effect:

- Reduces burst-related provider failures.
- Stabilizes throughput.

Acceptance:

- Load tests show lower 429 rate at same workload profile.
- PR-level Quorum gate run completes without widespread `429`-driven `ERROR` outcomes under normal CI load.

---

### WP1.2 - Retry-after orchestration and throttling events
Status: Implemented (2026-02-23), CI/runtime validation ongoing via WP1.3

Deliverables:

- Retry/backoff wrapper with jitter
- Explicit SSE events: `rate_limited`, `retry_scheduled`, `retry_exhausted`

Product effect:

- Better UX transparency during waits
- Better CLI/observability integration

Acceptance:

- Integration tests validate 429 + retry flows.
- CI run telemetry/report clearly distinguishes retried throttling from terminal errors.

---

### WP1.3 - Reliability telemetry and alerts

Deliverables:

- Metrics:
  - provider_429_rate
  - evaluation_completion_rate
  - p95_evaluation_duration
  - retry_attempt_distribution

Product effect:

- Faster detection of regressions.
- Better operator confidence.

Acceptance:

- Alerting thresholds configured and exercised in staging.

---

### Phase 1 release gate

- [ ] 429-related failure rate reduced materially
- [ ] Retry behavior is deterministic and visible
- [ ] Observability dashboards exist and are actionable

## Phase 2: Enterprise IAM and governance foundation
Window: 2026-04-06 to 2026-05-03
Goal: support multi-tenant enterprise use with auditable control boundaries.

### WP2.1 - Tenant model

Deliverables:

- Organization + project model
- Data partitioning by tenant scope

Product effect:

- Safe multi-customer operation.
- Enterprise governance compatibility.

Acceptance:

- Cross-tenant access tests prove isolation.

---

### WP2.2 - RBAC enforcement

Deliverables:

- Roles: `admin`, `maintainer`, `viewer` minimum
- Route-level and operation-level authorization checks

Product effect:

- Least privilege support.
- Required security baseline for enterprise buyers.

Acceptance:

- Authorization matrix tests for key workflows.

---

### WP2.3 - Policy objects for quality gates

Deliverables:

- Versioned policy definitions:
  - thresholds
  - fail-on rules
  - strategy constraints by environment

Product effect:

- Reproducible release governance.
- Easier rollback and audit.

Acceptance:

- Policy version attached to every gate decision.

---

### WP2.4 - Baseline governance workflow

Deliverables:

- Baseline create/update approval metadata:
  - approver
  - timestamp
  - commit SHA/reference

Product effect:

- Reduces accidental drift in evaluation standards.
- Improves accountability.

Acceptance:

- Every baseline mutation is fully attributable.

---

### Phase 2 release gate

- [ ] Tenant isolation enforced
- [ ] RBAC fully active on protected flows
- [ ] Gate policies versioned and linked to decisions
- [ ] Baseline updates auditable

## Phase 3: Compliance, scale, and enterprise-grade operations
Window: 2026-05-04 to 2026-06-28
Goal: complete compliance-operational layer and scale path.

### WP3.1 - Audit and retention controls

Deliverables:

- Retention policy engine
- Immutable audit export package for gate decisions and auth events

Product effect:

- Better procurement readiness.
- Easier enterprise security reviews.

Acceptance:

- Export package passes internal compliance checklist.

---

### WP3.2 - SSO and provisioning roadmap execution start

Deliverables:

- OIDC/SAML integration path
- SCIM provisioning plan and pilot scope

Product effect:

- Unlocks enterprise IT integration expectations.

Acceptance:

- At least one SSO provider integration validated end-to-end in staging.

---

### WP3.3 - Durable execution path (if load threshold exceeded)

Trigger conditions:

- sustained concurrent jobs exceed single-process reliability envelope
- or SLO violations persist despite Phase 1 controls

Deliverables:

- Queue + worker architecture for evaluation jobs

Product effect:

- Better reliability and scale headroom.

Acceptance:

- Controlled failover/restart behavior with no job-loss for accepted tasks.

---

### WP3.4 - Enterprise analytics and reporting

Deliverables:

- Tenant/project dashboards:
  - pass/fail trend
  - regression trend
  - cost by strategy/provider

Product effect:

- Makes Quorum useful for engineering leadership and compliance stakeholders.

Acceptance:

- Reports can be exported and used in release/governance reviews.

---

### Phase 3 release gate

- [ ] Compliance evidence export ready
- [ ] Enterprise identity path validated
- [ ] Scale path available if needed
- [ ] Governance analytics available

## 8. Product features prioritized from market pain

These are prioritized because they map directly to repeated buyer pain.

### P0 features

1. CI quality gate in GitHub
2. Security review package export
3. Service auth for automation
4. PII-safe SDK defaults
5. Stage-level failure diagnosis

### P1 features

1. Sampled production evaluation policies
2. Judge reliability calibration against human reference sets
3. Baseline approval workflow

### P2 features

1. Trust center artifacts
2. SSO/SCIM end-to-end rollout
3. Advanced enterprise reporting packs

## 9. Testing strategy and mandatory gates

### Required test layers

1. Unit tests
- schema validation
- threshold evaluation
- sanitizer behavior
- auth policy logic

2. Integration tests
- service auth flow
- rate-limit retry flow
- CI gate command flow
- metadata propagation ingest -> result

3. E2E tests
- CLI against live backend
- GitHub Action happy/fail paths

### Merge gate (mandatory)

A change cannot merge unless:

- tests pass in touched packages
- no broken docs links for changed docs
- security-sensitive changes include test coverage

## 10. SLOs and KPI targets

Track weekly:

- Evaluation completion rate
- Provider 429 rate
- p95 evaluation duration
- CI gate pass/fail trend
- Regression detection precision (true vs noisy flags)
- Cost per evaluated test case

Target direction:

- Reliability up
- Cost per useful signal down
- Time to diagnose root cause down

## 11. Rollout and rollback policy

### Rollout

1. Feature behind flag where risk is medium/high.
2. Staging burn-in with synthetic and real datasets.
3. Progressive production enablement by tenant/project.

### Rollback

Every major work package must define:

- kill switch location
- rollback command/procedure
- data migration reversal strategy (if applicable)

No package is release-ready without rollback documentation.

## 12. Daily execution protocol for upcoming sessions

Use this in every implementation session:

1. Start with this file and confirm active phase/work package.
2. Define exact scope for session in 3-7 tasks.
3. Implement code + tests in same session when possible.
4. Update this document:
   - status checkboxes
   - decisions changed
   - risks discovered
5. Record what is blocked and next action.

## 13. Work package template (for future additions)

When adding new work, use this template:

### WPX.Y - Name

Status: [ ] Not started / [ ] In progress / [ ] Done
Owner:
Target date:

Problem:

Decision:

Why this decision:

Product effect:

Implementation scope:

Out of scope:

Dependencies:

Test plan:

Acceptance criteria:

Rollback plan:

## 14. Active checklist (single-page view)

### Phase 0

- [x] WP0.1 GitHub Action quality gate
- [x] WP0.2 SDK PII sanitizer
- [x] WP0.3 Service auth and contract fix
- [x] WP0.4 Ingest metadata propagation
- [x] WP0.5 Security/doc hardening

### Phase 1

- [x] WP1.1 Provider concurrency control
- [x] WP1.2 Retry-after + throttling events
- [ ] WP1.3 Reliability telemetry and alerts

### Phase 2

- [ ] WP2.1 Tenant model
- [ ] WP2.2 RBAC enforcement
- [ ] WP2.3 Versioned gate policy objects
- [ ] WP2.4 Baseline governance workflow

### Phase 3

- [ ] WP3.1 Audit + retention controls
- [ ] WP3.2 SSO/SCIM path
- [ ] WP3.3 Durable execution path (conditional)
- [ ] WP3.4 Enterprise reporting

## 15. Final note for implementers

The goal is not to "look enterprise".
The goal is to ship a product that:

- blocks bad AI releases reliably
- explains failures clearly
- integrates cleanly into real engineering workflows
- passes enterprise trust scrutiny without killing product velocity

If a task does not advance one of those outcomes, it is not priority work.
