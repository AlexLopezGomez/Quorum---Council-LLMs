# Quorum CI/CD Quality Gate — Implementation Plan

## Context

Quorum is pivoting from "evaluation dashboard you look at" to "CI/CD quality gate that blocks bad deployments." The core evaluation engine (Council-of-LLMs, adaptive orchestration, deterministic checks) stays untouched. We're building new layers on top: configurable thresholds, a CLI tool, a GitHub Action, a golden dataset for meta-evaluation, and a PII sanitization stub in the SDK.

**Execution**: 7 commits, one at a time. Each commit has a checkpoint with verification steps.

---

## Key Constraints (Verified Against Codebase)

| Constraint | Source | Detail |
|------------|--------|--------|
| 10-case limit per request | `backend/src/utils/validation.js:4` | CLI must chunk datasets into batches of 10 |
| Cookie-based auth | `backend/src/routes/results.js:30` | `/api/results/:jobId` filters by `userId`; CLI must login first |
| Strategy override | `orchestrator.js:135`, `adaptiveRouter.js:164-184` | `council` bypasses adaptive router entirely; `hybrid`/`single` skip risk scoring |
| Cost in API response | `adaptiveRouter.js:239`, `results.js:52-61` | `summary.totalCost` + per-result `strategyCost` available |
| ESM everywhere | `backend/package.json`, `sdk/package.json` | `"type": "module"`, all imports use `.js` extensions |
| Vitest v4.0.18 | `backend/package.json` devDependencies | `"test": "vitest run"`, no config file (defaults) |
| No existing CLI, tests/, .github/ | Verified via glob | All are new directories |

---

## Commit 1: Zod Schemas + testCaseSchema Update

### Status: [ ] Not Started

### New Files

**`backend/src/schemas/testSuiteConfig.js`** (~60 lines)
- Zod schema for `.quorum.yml` config format
- `metricThresholdSchema`: `{ pass: number(0-1), warn: number(0-1) }` with `.refine(d => d.warn <= d.pass)`
- `metricsConfigSchema`: optional keys for `faithfulness`, `groundedness`, `contextRelevancy`, `finalScore`; `.refine()` ensures at least one metric defined
- `ciOptionsSchema`: `failOnWarn` (default false), `failOnError` (true), `failOnRegression` (false), `regressionThreshold` (0.05), `baselinePath` (optional string)
- `testSuiteConfigSchema`: `version: z.literal(1)`, `datasets: z.array(z.string()).min(1)`, `metrics`, `strategy` (auto|single|hybrid|council, default auto), `ci` (optional with defaults)
- Export `testSuiteConfigSchema` and `parseConfig(rawObject)` helper

**`backend/src/schemas/testRunResult.js`** (~70 lines)
- Zod schema for CLI output (the `TestRunResult` contract)
- `metricVerdictSchema`: `{ metric: string, score: number|null, verdict: PASS|WARN|FAIL|SKIP, threshold?: {pass, warn} }`
- `testCaseResultSchema`: `{ index: number, id?: string, metricVerdicts[], overallVerdict, strategy: string, riskScore?: number, metadata?: record }`
- `regressionSchema`: `{ metric: string, previous: number, current: number, delta: number, testCaseId?: string }`
- `testRunResultSchema`: `{ runId, timestamp, config, dataset, strategyDistribution: record<number>, results[], summary, regressions[], overallVerdict }`
- Summary: `{ total, passed, warned, failed, errored, skipped, passRate, avgScores: record<number|null>, totalCost }`

### Modified Files

**`backend/src/utils/validation.js`** (lines 9-28)
```diff
 export const testCaseSchema = z.object({
+  id: z.string().max(100).optional(),
   input: z.string().min(1).max(MAX_INPUT_LENGTH),
   actualOutput: z.string().min(1).max(MAX_OUTPUT_LENGTH),
   expectedOutput: z.string().max(MAX_OUTPUT_LENGTH).optional(),
   retrievalContext: z.array(z.string().max(MAX_CONTEXT_LENGTH)).min(1).max(MAX_CONTEXT_PASSAGES),
+  metadata: z.record(z.unknown()).optional(),
 });
```

**`backend/src/models/Evaluation.js`** (testCase sub-schema, ~line 4-12)
```diff
 const testCaseSchema = new mongoose.Schema({
+  id: { type: String },
   input: { type: String, required: true },
   actualOutput: { type: String, required: true },
   expectedOutput: { type: String },
   retrievalContext: [{ type: String }],
+  metadata: { type: mongoose.Schema.Types.Mixed },
 }, { _id: false });
```

### Tests

**`backend/tests/schemas/testSuiteConfig.test.js`**
1. Valid minimal config (version + 1 dataset + 1 metric) -> passes
2. Valid full config with all fields -> passes
3. Missing version -> fails
4. Wrong version (2) -> fails
5. Empty datasets array -> fails
6. No metrics defined (empty object) -> fails (refine guard)
7. Metric with warn > pass -> fails (refine guard)
8. Metric with warn === pass -> passes
9. ci defaults applied when omitted -> correct defaults
10. regressionThreshold out of range -> fails

**`backend/tests/schemas/testRunResult.test.js`**
1. Valid complete run result -> passes
2. Missing required summary.total -> fails
3. Invalid overallVerdict enum value -> fails
4. Empty results array -> passes (zero cases is valid edge)
5. Regression with negative delta -> passes (schema allows it)

**`backend/tests/utils/validation.test.js`**
1. testCaseSchema with `id` -> passes
2. testCaseSchema without `id` -> passes (backwards compat)
3. testCaseSchema with `metadata: { domain: 'coliving' }` -> passes
4. testCaseSchema with `id` exceeding 100 chars -> fails
5. evaluateRequestSchema still works with existing payloads -> passes

### Checkpoint 1

```bash
cd backend && npm test
```

- [ ] All 20+ new tests pass
- [ ] Existing `gemini.test.js` (10 tests) still passes
- [ ] Manual: POST to `/api/evaluate` with `{ id: "test-1", metadata: { domain: "coliving" } }` in a test case -> 202 accepted
- [ ] Manual: POST without `id`/`metadata` -> still works (backwards compat)

---

## Commit 2: Threshold Evaluator + Tests

### Status: [ ] Not Started

### New Files

**`backend/src/evaluators/thresholdEvaluator.js`** (~120 lines)

Lives in backend so meta-eval script (Commit 3) can import directly. CLI duplicates later (Commit 4). Backend copy also enables future threshold-based webhooks.

```js
// Key constants and functions:

const METRIC_JUDGE_MAP = {
  faithfulness: 'openai',
  groundedness: 'anthropic',
  contextRelevancy: 'gemini',
};
// Matches hardcoded judge names in orchestrator.js:237-247

export function evaluateThresholds(results, thresholdConfig)
// -> { results: evaluatedResults[], summary, overallVerdict }

// Internal helpers (not exported):
function evaluateMetrics(result, thresholdConfig)     // per-result metric verdicts
function evaluateSingleMetric(metric, score, config)  // score >= pass -> PASS, >= warn -> WARN, else FAIL, null -> SKIP
function computeOverallVerdict(metricVerdicts, result) // worst non-SKIP verdict; ERROR from aggregator
function computeRunVerdict(evaluated)                  // worst across all cases
function computeSummary(evaluated)                     // { total, passed, warned, failed, errored, skipped, passRate }
```

**passRate denominator**: SKIPs are **excluded** from the denominator. If 10 cases produce 6 PASS, 2 FAIL, 2 SKIP → `passRate = 6 / (6+2) = 75%`, not `6/10 = 60%`. Rationale: SKIP means "metric not evaluated" (e.g., `single` strategy has no faithfulness judge), penalizing for missing data would make `auto` strategy always score worse than `council`.

Pattern to follow: `deterministicChecks.js` — standalone exported functions, no classes, simple return objects.

### Edge Cases (Must All Have Tests)

| Case | Input | Expected |
|------|-------|----------|
| All judges error | `aggregator.verdict === 'ERROR'`, all scores null | Overall: ERROR (not FAIL) |
| Hybrid strategy | Only `openai` judge present | Missing metrics: SKIP (not FAIL) |
| Single strategy | Only `gemini` judge present | faithfulness/groundedness: SKIP |
| Boundary: score === pass | 0.7 with pass threshold 0.7 | PASS (uses `>=`) |
| Boundary: score just below | 0.699 with pass 0.7, warn 0.4 | WARN |
| Score of 0 | 0.0 with any threshold > 0 | FAIL |
| Score of 1 | 1.0 with any threshold | PASS |
| Empty results | `[]` | overall SKIP, passRate 0 |
| finalScore metric | From `result.aggregator.finalScore` | Evaluated like any metric |
| Null score without error | Judge returned `score: null` but no error | SKIP |

### Tests

**`backend/tests/evaluators/thresholdEvaluator.test.js`** (~25 cases)

```
describe('evaluateThresholds')
  describe('evaluateSingleMetric')
    - score above pass threshold -> PASS
    - score between warn and pass -> WARN
    - score below warn threshold -> FAIL
    - score exactly at pass boundary -> PASS
    - score exactly at warn boundary -> WARN
    - null score -> SKIP
    - undefined score -> SKIP

  describe('per-test-case overall verdict')
    - all metrics PASS -> PASS
    - one FAIL, rest PASS -> FAIL (worst-of)
    - one WARN, rest PASS -> WARN
    - all SKIP -> SKIP
    - ERROR aggregator -> ERROR regardless of metric scores

  describe('strategy-specific handling')
    - council result: all 3 judges present -> all metrics evaluated
    - hybrid result: only openai present -> anthropic/gemini SKIP
    - single result: only gemini present -> faithfulness/groundedness SKIP

  describe('run-level verdict')
    - all test cases PASS -> PASS
    - one FAIL -> overall FAIL
    - one ERROR, no FAIL -> overall ERROR
    - one WARN, no FAIL/ERROR -> overall WARN
    - empty results -> overall SKIP

  describe('summary computation')
    - mixed verdicts: correct counts
    - passRate: 2/5 = 40 (only non-SKIP in denominator)
    - passRate with SKIPs excluded: 3 PASS, 1 FAIL, 2 SKIP → 3/4 = 75%
    - zero test cases: passRate 0
    - all SKIP: passRate 0 (0/0 guarded to 0)

  describe('finalScore metric')
    - finalScore from aggregator evaluated when threshold configured
    - null finalScore -> SKIP
    - finalScore passes/warns/fails at correct boundaries
```

### Checkpoint 2

```bash
cd backend && npm test
```

- [ ] All ~25 new threshold evaluator tests pass
- [ ] All previous tests still pass (Commit 1 + existing Gemini tests)
- [ ] No file exceeds 250 lines

---

## Commit 3: Golden Dataset + Meta-Evaluation

### Status: [ ] Not Started

### Key Design: expectedScoreRange (NOT expectedVerdict)

Golden dataset stores `metadata.expectedScoreRange` instead of `metadata.expectedVerdict`. This decouples test expectations from threshold configuration.

**Why**: If thresholds change, `expectedVerdict` becomes wrong. A case with faithfulness 0.72 is FAIL at 0.85 but PASS at 0.70. Score ranges are stable.

```json
// Hallucination case:
{ "expectedScoreRange": { "faithfulness": { "max": 0.5 }, "groundedness": { "max": 0.5 } } }

// Good answer:
{ "expectedScoreRange": { "faithfulness": { "min": 0.85 }, "groundedness": { "min": 0.80 } } }

// Edge case:
{ "expectedScoreRange": { "faithfulness": { "min": 0.4, "max": 0.8 } } }
```

### New Files

**`tests/golden/coliving-factual.jsonl`** — 10 well-grounded coliving Q&A

Each line is a JSON object. Domain: coliving/student housing.

Topics to cover:
1. Monthly rent for shared room (exact match from context)
2. Lease notice period (direct from policy doc)
3. Included amenities list (all from context)
4. Neighborhood location description (faithful to context)
5. Booking/move-in process (step-by-step from docs)
6. Comparison between two room types (both from context)
7. "I don't know" response (context genuinely doesn't cover query)
8. Community event schedule (from context)
9. Utility cost breakdown (from context)
10. Pet policy details (verbatim from policy)

All: `expectedScoreRange: { faithfulness: { min: 0.85 }, groundedness: { min: 0.80 }, contextRelevancy: { min: 0.80 } }`

**`tests/golden/coliving-hallucinations.jsonl`** — 10 cases where bot invents facts

1. Context about Building A, bot responds with Building B's pricing
2. Context says "no availability", bot says "2 units available"
3. No parking mentioned, bot invents parking details
4. Bot adds specific move-in dates not in context
5. Bot cites a "community policy" that doesn't exist
6. Context is studio, bot describes 2-bedroom
7. Bot invents amenities not in context
8. Context has last month's pricing, bot presents as current without caveat
9. Bot fabricates a resident testimonial
10. Bot combines info from 2 different buildings into one

All: `expectedScoreRange: { faithfulness: { max: 0.5 }, groundedness: { max: 0.5 } }`

**`tests/golden/coliving-edge.jsonl`** — 10 subtle edge cases

1. Mostly correct but one wrong detail buried in response
2. Correct info from a context chunk about a DIFFERENT query
3. Answer technically in context but misleadingly presented
4. Bot hedges appropriately on incomplete context
5. Contradictory context chunks, bot picks one
6. Response is grounded but doesn't answer the question asked
7. Bot paraphrases correctly but loses critical nuance
8. Correct answer but context is stale (freshness, not faithfulness)
9. Bot refuses to answer but context DOES have the answer
10. Multiple chunks combined correctly but combination is misleading

All: `expectedScoreRange` varies per case with min/max ranges

**`tests/golden/.quorum.yml`**
```yaml
version: 1
datasets:
  - coliving-factual.jsonl
  - coliving-hallucinations.jsonl
  - coliving-edge.jsonl
metrics:
  faithfulness:
    pass: 0.7
    warn: 0.4
  groundedness:
    pass: 0.7
    warn: 0.4
  contextRelevancy:
    pass: 0.6
    warn: 0.3
  finalScore:
    pass: 0.65
    warn: 0.4
strategy: auto
ci:
  failOnWarn: false
  failOnError: true
  failOnRegression: true
  regressionThreshold: 0.05
  baselinePath: ../baselines/
```

**`tests/baselines/.gitkeep`** — Populated after first run

**`tests/meta-eval/runMetaEval.js`** (~150 lines)
- Standalone Node script: `node tests/meta-eval/runMetaEval.js --endpoint http://localhost:3000 --email user@test.com --password pass`
- Accepts `--endpoint`, `--email`, `--password`, `--strategy` (auto|council|single|hybrid|all)
- Auth: POST `/api/auth/login`, extract `quorum_token` from `set-cookie` header
- Loads all 3 JSONL files from `tests/golden/`
- For each dataset: chunk by 10 -> POST `/api/evaluate` -> poll `/api/results/:jobId` (2s interval, 120s timeout)
- **Imports `evaluateThresholds` from `../../backend/src/evaluators/thresholdEvaluator.js`** (not duplicated)
- Compares each judge's raw score against `metadata.expectedScoreRange` (min/max bounds per metric)
- When `--strategy all`: runs each dataset through all 4 strategies for comparison
- **Cost warning**: `--strategy all` multiplies API cost ×4. Single strategy run ≈ $0.10 (30 cases × 4 LLM calls). `--strategy all` ≈ $0.40 per run. Script prints estimated cost before starting and requires `--confirm-cost` flag (or `--yes`) to proceed.
- Output format:
  ```
  === Quorum Meta-Evaluation Report ===

  Strategy: council
  Category: coliving-hallucinations (10 cases)
    Scores in expected range: 9/10 (90%)
    Out-of-range:
      hall-07: faithfulness 0.62 (expected max 0.5)
    Cost: $0.035

  Category: coliving-factual (10 cases)
    Scores in expected range: 10/10 (100%)
    Cost: $0.032

  Category: coliving-edge (10 cases)
    Scores in expected range: 7/10 (70%)
    Cost: $0.034

  Overall agreement: 87% (26/30)
  Total cost: $0.101
  ```
- Saves full results to `tests/baselines/meta-eval-{strategy}-{timestamp}.json`

**Low agreement handling**: If overall agreement drops below 70%, the script:
1. Flags out-of-range cases with `⚠ REVIEW NEEDED` in the report
2. Suggests widening `expectedScoreRange` for borderline cases (scores within 0.1 of the boundary)
3. Does NOT auto-fail — low agreement often means the golden case expectations need tuning, not that the judges are wrong
4. Saves a `review-needed.json` with only the out-of-range cases for manual inspection

### Checkpoint 3

```bash
# Prerequisites: backend running with MongoDB, user account created
cd backend && npm run dev

# In another terminal, run meta-eval
node tests/meta-eval/runMetaEval.js \
  --endpoint http://localhost:3000 \
  --email <your-email> \
  --password <your-password> \
  --strategy council
```

- [ ] Script authenticates successfully
- [ ] All 30 cases process without errors
- [ ] Hallucination cases: judges score faithfulness/groundedness < 0.5 for majority (>7/10)
- [ ] Factual cases: judges score > 0.80 for majority (>8/10)
- [ ] Edge cases: mixed results (expected)
- [ ] Baseline JSON saved to `tests/baselines/`
- [ ] Dashboard still works (navigate to frontend, paste sample JSON, run eval)

---

## Commit 4: CLI Tool

### Status: [ ] Not Started

### New Package: `cli/`

**`cli/package.json`**
```json
{
  "name": "@quorum/cli",
  "version": "0.1.0",
  "description": "Quorum CLI - adaptive AI evaluation for CI/CD",
  "type": "module",
  "bin": { "quorum": "./bin/quorum.js" },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "js-yaml": "^4.1.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "vitest": "^4.0.18"
  },
  "engines": { "node": ">=20.0.0" },
  "scripts": { "test": "vitest run" }
}
```

### File Tree

```
cli/
  package.json
  bin/
    quorum.js              # Entry point with #!/usr/bin/env node
  src/
    commands/
      test.js                # Main: load config -> auth -> evaluate -> threshold -> report
      init.js                # Scaffold .quorum.yml + tests/ dir
      validate.js            # Validate config + dataset files
    config/
      loader.js              # Find + parse .quorum.yml (YAML -> Zod)
      schema.js              # Duplicated testSuiteConfigSchema (~40 lines)
    dataset/
      parser.js              # JSONL/JSON dataset loader
    evaluation/
      client.js              # HTTP: postEvaluation, pollResults, chunkArray
      thresholds.js          # Duplicated thresholdEvaluator (~100 lines)
    regression/
      detector.js            # Compare current vs baseline by test case id
      baseline.js            # Read/write baseline JSON files
    reporting/
      terminal.js            # chalk + ora terminal reporter
      markdown.js            # GitHub markdown for PR comments
    auth.js                  # Login via /api/auth/login, cookie extraction
  templates/
    quorum.yml             # Default config for `quorum init`
    example.jsonl            # 3 example test cases
  tests/
    config/loader.test.js
    dataset/parser.test.js
    evaluation/thresholds.test.js
    regression/detector.test.js
    auth.test.js
```

### Command: `quorum test`

```
quorum test [options]

Options:
  -c, --config <path>       Path to .quorum.yml (default: .quorum.yml)
  -e, --endpoint <url>      Quorum backend URL (default: http://localhost:3000)
  --ci                      CI mode: JSON output, no colors/spinners
  --reporter <type>         terminal | markdown | json (default: terminal)
  --update-baseline         Save this run as new baseline
  --strategy <strategy>     Override strategy from config
  --timeout <ms>            Per-evaluation timeout (default: 120000)
  --email <email>           Auth email (or QUORUM_EMAIL env)
  --password <password>     Auth password (or QUORUM_PASSWORD env)
```

**Flow**:
1. `loadConfig(configPath)` -> parse YAML, validate with Zod, apply defaults
2. `authenticate(endpoint, email, password)` -> POST `/api/auth/login`, extract `quorum_token` cookie
3. For each dataset in `config.datasets`:
   a. `parseDataset(path, configDir)` -> load JSONL/JSON, return test case array (handles UTF-8 BOM via `text.replace(/^\uFEFF/, '')`)
   b. `chunkArray(testCases, 10)` -> split for the 10-case API limit
   c. For each chunk: `postEvaluation(endpoint, chunk, strategy, cookie)` -> get `jobId`
      - **On 401 during chunk**: re-authenticate once and retry the chunk. If re-auth fails, abort with descriptive error.
   d. `pollResults(endpoint, jobId, timeout, cookie)` -> poll every 2s until 200 or timeout
   e. Merge all chunk results into single array
   f. **On chunk failure (non-auth)**: log error with chunk index + test case range, continue with remaining chunks, mark failed chunk cases as `verdict: ERROR` in results
4. `evaluateThresholds(mergedResults, config.metrics)` -> per-metric verdicts
5. If baseline exists: `detectRegressions(current, baseline, config.ci.regressionThreshold)`
6. Report with selected reporter (report includes partial failure warnings if any chunks errored)
7. If `--update-baseline`: write current results as baseline JSON
8. Exit code: 0 if PASS (or WARN when `failOnWarn: false`), 1 otherwise

**Global timeout**: In addition to per-evaluation `--timeout`, enforce a global timeout of `--timeout × number_of_chunks × 1.5`. For 30 cases (3 chunks) with 120s timeout: global = `120 × 3 × 1.5 = 540s`. If global timeout is reached, report partial results and exit 1.

### Duplicated Modules (Keep In Sync)

Both have header comment: `// Synced from backend/src/... — keep in sync manually`

| CLI File | Backend Source | Lines |
|----------|---------------|-------|
| `cli/src/config/schema.js` | `backend/src/schemas/testSuiteConfig.js` | ~40 |
| `cli/src/evaluation/thresholds.js` | `backend/src/evaluators/thresholdEvaluator.js` | ~100 |

### Tests

**`cli/tests/config/loader.test.js`** (~8 cases)
- Valid YAML parsed correctly
- Missing file throws descriptive error
- Invalid YAML syntax throws
- Schema validation errors include field paths
- Defaults applied for omitted optional fields

**`cli/tests/dataset/parser.test.js`** (~10 cases)
- Valid JSONL: 3 lines -> 3 objects
- JSONL with empty lines: skipped
- JSONL with malformed line: error with line number
- JSON array format: `[{...}, {...}]`
- JSON wrapped format: `{ testCases: [{...}] }`
- Unsupported file extension (.csv): descriptive error
- UTF-8 BOM: file with BOM prefix parsed correctly (BOM stripped)
- UTF-8 with special characters (accents, emojis): preserved correctly

**`cli/tests/evaluation/thresholds.test.js`** (~15 cases)
- Mirror key tests from backend `thresholdEvaluator.test.js` to ensure parity
- Same fixtures, same expected outputs

**`cli/tests/regression/detector.test.js`** (~8 cases)
- Regression detected: score dropped by > threshold
- No regression: score stable
- Score improved: not flagged
- Missing baseline: returns empty array
- Test case without `id`: skipped (graceful degradation)
- New test case not in baseline: not flagged
- Multiple regressions across different metrics

**`cli/tests/auth.test.js`** (~7 cases)
- Successful login: cookie extracted from set-cookie header
- Failed login (401): descriptive error thrown
- Missing credentials: error mentions env vars
- Env var fallback: `QUORUM_EMAIL` and `QUORUM_PASSWORD` used
- Re-auth on 401 mid-run: `authenticate()` called again, new cookie used for retry
- Re-auth failure: descriptive error with "session expired" message

**`cli/tests/evaluation/client.test.js`** (~5 cases)
- Partial chunk failure: chunk 2 of 3 fails → results contain ERROR entries for failed chunk
- Global timeout reached: partial results reported, exit code 1
- All chunks fail: descriptive aggregate error, exit code 1
- Network error (ECONNREFUSED): error message includes endpoint URL and "is the backend running?" hint
- Polling 401 mid-run: triggers re-auth flow

### Checkpoint 4

```bash
# Install CLI dependencies
cd cli && npm install

# Run CLI tests
npm test

# Test init command
node bin/quorum.js init
# -> Creates .quorum.yml and tests/ in current dir

# Test validate command
node bin/quorum.js validate --config tests/golden/.quorum.yml
# -> "Config valid. 3 datasets found."

# Test full evaluation (backend must be running)
node bin/quorum.js test \
  --config ../tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email <email> \
  --password <password>
# -> Colored terminal output with PASS/WARN/FAIL per case

# Test CI mode
node bin/quorum.js test \
  --config ../tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email <email> \
  --password <password> \
  --ci
# -> JSON output only, exit code 0 or 1

# Test baseline save + regression detection
node bin/quorum.js test \
  --config ../tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email <email> \
  --password <password> \
  --update-baseline
# -> Baseline saved

node bin/quorum.js test \
  --config ../tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email <email> \
  --password <password>
# -> "Compared against baseline: 0 regressions detected"
```

- [ ] All ~44 CLI tests pass
- [ ] `quorum init` creates valid config + example dataset
- [ ] `quorum validate` catches invalid configs
- [ ] `quorum test` processes all 30 golden cases (chunked by 10)
- [ ] Terminal output shows colored PASS/WARN/FAIL
- [ ] `--ci` produces valid JSON, no ANSI codes
- [ ] Exit code 0 when all pass, 1 when any fail
- [ ] `--update-baseline` writes file, subsequent run compares against it
- [ ] Dashboard still works (no regressions)

---

## Commit 5: GitHub Action

### Status: [ ] Not Started

### New Files

**`.github/actions/quorum-test/action.yml`**
```yaml
name: 'Quorum Test'
description: 'Run Quorum evaluation as a CI quality gate'
inputs:
  config:
    description: 'Path to .quorum.yml'
    required: false
    default: '.quorum.yml'
  endpoint:
    description: 'Quorum backend URL'
    required: true
  email:
    description: 'Quorum auth email'
    required: true
  password:
    description: 'Quorum auth password'
    required: true
  strategy:
    description: 'Override evaluation strategy'
    required: false
  update-baseline:
    description: 'Update baseline after run'
    required: false
    default: 'false'
  node-version:
    description: 'Node.js version'
    required: false
    default: '20'
runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}

    - name: Validate required secrets
      shell: bash
      run: |
        missing=""
        [ -z "${{ inputs.endpoint }}" ] && missing="$missing QUORUM_ENDPOINT"
        [ -z "${{ inputs.email }}" ] && missing="$missing QUORUM_EMAIL"
        [ -z "${{ inputs.password }}" ] && missing="$missing QUORUM_PASSWORD"
        if [ -n "$missing" ]; then
          echo "::error::Missing required secrets:$missing. Configure them in Settings > Secrets."
          exit 1
        fi

    - name: Verify backend connectivity
      shell: bash
      run: |
        if ! curl -sf --max-time 10 "${{ inputs.endpoint }}/api/health" > /dev/null 2>&1; then
          echo "::error::Cannot reach Quorum backend at ${{ inputs.endpoint }}. Ensure the backend is deployed and accessible from GitHub Actions runners (not localhost)."
          exit 1
        fi

    - name: Install Quorum CLI
      shell: bash
      run: cd cli && npm ci

    - name: Run Quorum tests
      shell: bash
      id: test
      continue-on-error: true
      run: |
        node cli/bin/quorum.js test \
          --config "${{ inputs.config }}" \
          --endpoint "${{ inputs.endpoint }}" \
          --email "${{ inputs.email }}" \
          --password "${{ inputs.password }}" \
          --reporter markdown \
          --ci \
          ${{ inputs.strategy && format('--strategy {0}', inputs.strategy) || '' }} \
          ${{ inputs.update-baseline == 'true' && '--update-baseline' || '' }} \
          > quorum-report.md 2>&1
        echo "exit_code=$?" >> $GITHUB_OUTPUT

    - name: Comment on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const report = fs.readFileSync('quorum-report.md', 'utf8');
          // Use HTML comment as hidden marker for upsert — resilient to heading changes
          const MARKER = '<!-- quorum-eval-report -->';
          const { data: comments } = await github.rest.issues.listComments({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
          });
          const existing = comments.find(c =>
            c.body.includes(MARKER)
          );
          const body = MARKER + '\n' + (report || '## Quorum Evaluation Report\n\nNo output captured.');
          if (existing) {
            await github.rest.issues.updateComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: existing.id,
              body,
            });
          } else {
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body,
            });
          }

    - name: Upload baseline as artifact
      if: inputs.update-baseline == 'true'
      uses: actions/upload-artifact@v4
      with:
        name: quorum-baseline-${{ github.sha }}
        path: tests/baselines/
        retention-days: 90

    - name: Fail if tests failed
      if: steps.test.outputs.exit_code != '0'
      shell: bash
      run: exit 1
```

**`.github/workflows/quorum-example.yml`**
```yaml
name: Quorum Quality Gate
on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'knowledge-base/**'
      - 'tests/golden/**'

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/quorum-test
        with:
          endpoint: ${{ secrets.QUORUM_ENDPOINT }}
          email: ${{ secrets.QUORUM_EMAIL }}
          password: ${{ secrets.QUORUM_PASSWORD }}
          config: 'tests/golden/.quorum.yml'
```

### Networking Requirement

The GitHub Action runner must be able to reach the Quorum backend over the network. `localhost` will **not** work — the backend must be deployed at a public URL (e.g., Fly.io, Railway, or a VPS). The `Verify backend connectivity` step checks this upfront with a curl to `/api/health` and fails fast with a clear error message if unreachable.

### Baseline Persistence

GitHub Actions runners are ephemeral — baselines saved to the filesystem are lost after the job ends. Two strategies:
1. **GitHub Artifacts** (implemented above): `actions/upload-artifact@v4` saves baselines with 90-day retention. Users download and commit them to the repo.
2. **Auto-commit** (documented in `docs/ci-cd-guide.md`): Users can add a workflow step to commit baseline changes to a `quorum-baselines` branch.

### Checkpoint 5

- [ ] `action.yml` is valid YAML (linter passes)
- [ ] Example workflow references correct action path
- [ ] PR comment uses upsert pattern with HTML marker (updates existing comment, doesn't spam)
- [ ] Comment upsert works even if heading text changes (marker-based, not heading-based)
- [ ] Action fails CI run when exit code != 0
- [ ] Missing secrets → clear error message listing which secrets are missing
- [ ] Unreachable backend → clear error message before any evaluation starts
- [ ] Baseline uploaded as GitHub Artifact when `update-baseline: true`

E2E test (if GitHub Actions access available):
```bash
# Create a test branch, push, open PR
git checkout -b test-github-action
echo "test" >> prompts/test.txt
git add . && git commit -m "Test action"
git push origin test-github-action
# Open PR -> action should trigger -> comment should appear
```

---

## Commit 6: PII Sanitization Stub

### Status: [ ] Not Started

### New Files

**`sdk/src/sanitizer.js`** (~50 lines)
```js
const PATTERNS = [
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  { name: 'phone', regex: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[PHONE]' },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { name: 'creditCard', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[CREDIT_CARD]' },
];

export function sanitize(text) { /* replace PII, return string */ }
export function sanitizePayload(payload) { /* sanitize input, actualOutput, expectedOutput, retrievalContext[] */ }
```

### Known Limitations (Document in SDK README)

This is a **stub** — a baseline defense, not a production PII filter. Known gaps:

| Limitation | Detail | Mitigation |
|-----------|--------|------------|
| US-only phone format | `+34 612 345 678` (Spain) not matched | Document: users with EU data should add custom patterns via future `customPatterns` config |
| No Spanish ID (DNI/NIE) | `12345678Z` or `X1234567A` not matched | Same as above — pluggable pattern system planned |
| False positives | 10-digit IDs, order numbers matching phone regex | Acceptable for a stub — prefer false positives over leaked PII |
| Replacement tokens in LLM context | `[EMAIL]` as literal text may confuse judges | Tested: judges handle placeholder tokens correctly for scoring faithfulness (they evaluate structure, not literal text). Add note in `docs/ci-cd-guide.md` |
| No address detection | Street addresses not covered | Out of scope for regex — would need NER model |

**Future**: Replace regex stub with a pluggable `sanitizerConfig` in the SDK constructor that accepts custom patterns:
```js
const rs = new Quorum({
  sanitize: true,
  sanitizerPatterns: [
    { name: 'dniNie', regex: /\b[XYZ]?\d{7,8}[A-Z]\b/gi, replacement: '[DNI]' },
    { name: 'esPhone', regex: /(\+34[\s.-]?)?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/g, replacement: '[PHONE]' },
  ],
});
```
This is NOT part of Commit 6 — document as roadmap in SDK README.

### Modified Files

**`sdk/src/collector.js`** — 3 changes:
1. Import: `import { sanitizePayload } from './sanitizer.js';`
2. Constructor: `this._sanitize = config.sanitize !== false;` (ON by default)
3. `capture()`: `const processed = this._sanitize ? sanitizePayload(payload) : payload;`

**`sdk/src/index.js`** — Add exports: `export { sanitize, sanitizePayload } from './sanitizer.js';`

**`sdk/src/types.js`** — Add JSDoc: `@property {boolean} [sanitize=true] - Sanitize PII before sending`

**`sdk/package.json`** — Add devDependencies + test script:
```json
{
  "devDependencies": { "vitest": "^4.0.18" },
  "scripts": { "test": "vitest run" }
}
```

### Tests

**`sdk/tests/sanitizer.test.js`** (~12 cases)
1. Email: `user@example.com` -> `[EMAIL]`
2. Phone: `(555) 123-4567` -> `[PHONE]`
3. Phone: `+1 555-123-4567` -> `[PHONE]`
4. SSN: `123-45-6789` -> `[SSN]`
5. Credit card: `4111 1111 1111 1111` -> `[CREDIT_CARD]`
6. Credit card with dashes: `4111-1111-1111-1111` -> `[CREDIT_CARD]`
7. Multiple PII in one string: all replaced
8. No PII: string unchanged
9. Non-string input (number, null): returned unchanged
10. `sanitizePayload`: all text fields sanitized
11. `sanitizePayload`: metadata preserved unchanged
12. `sanitizePayload`: undefined `expectedOutput` stays undefined

**`sdk/tests/collector.test.js`** (~3 cases)
1. Default `sanitize: true`: captured payload has PII replaced
2. `sanitize: false`: captured payload has PII intact
3. Sanitization happens before buffering (verify buffer contents)

### Checkpoint 6

```bash
cd sdk && npm install && npm test
```

- [ ] All ~15 sanitizer/collector tests pass
- [ ] Manual test:
  ```js
  import { Quorum } from './src/index.js';
  const rs = new Quorum({ endpoint: 'http://localhost:3000' });
  rs.capture({
    input: 'My email is test@example.com and SSN 123-45-6789',
    actualOutput: 'Call us at (555) 123-4567',
    retrievalContext: ['Card: 4111 1111 1111 1111'],
  });
  // Verify buffer contains [EMAIL], [SSN], [PHONE], [CREDIT_CARD] replacements
  ```
- [ ] `sanitize: false` config skips all sanitization
- [ ] Backend still accepts sanitized payloads (no validation issues)

---

## Commit 7: Documentation

### Status: [ ] Not Started

### Files

**`docs/ci-cd-guide.md`** — Full guide
- Quick Start (5 minutes)
- Writing Test Datasets (JSONL format, schema)
- Configuring `.quorum.yml` (all options documented)
- Understanding Threshold Evaluation (how scores become verdicts)
- Regression Detection (baselines, delta thresholds)
- GitHub Actions Setup (secrets, workflow triggers)
- Troubleshooting (common errors, timeout tuning)

**`cli/README.md`** — CLI reference
- Installation
- Commands: `test`, `init`, `validate`
- All flags with descriptions
- Examples

**`README.md`** — Update root readme
- Add "CI/CD Quality Gate" section
- Show `quorum test` example
- Link to `docs/ci-cd-guide.md` and `cli/README.md`

### Checkpoint 7

- [ ] All links in docs resolve correctly
- [ ] Code examples in docs are accurate
- [ ] `quorum --help` output matches README

---

## End-to-End Integration Test

After all 7 commits, run this full E2E sequence:

```bash
# 1. Start infrastructure
docker run -d -p 27017:27017 mongo:7
cd backend && npm run dev  # Terminal 1

# 2. Create a test user (if not exists)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@quorum.dev","password":"testpass123","username":"tester"}'

# 3. Run all backend tests
cd backend && npm test
# Expected: 60+ tests pass (Gemini 10 + schemas 20 + threshold 25 + validation 5)

# 4. Run SDK tests
cd sdk && npm test
# Expected: ~15 tests pass

# 5. Run CLI tests
cd cli && npm test
# Expected: ~44 tests pass

# 6. Test CLI init
mkdir /tmp/quorum-test && cd /tmp/quorum-test
node <project>/cli/bin/quorum.js init
# -> .quorum.yml + tests/example.jsonl created

# 7. Test CLI validate
node <project>/cli/bin/quorum.js validate
# -> "Config valid. 1 dataset found."

# 8. Run golden dataset via CLI
cd <project>
node cli/bin/quorum.js test \
  --config tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email test@quorum.dev \
  --password testpass123
# -> Colored terminal output: 30 cases evaluated with verdicts

# 9. Run with --ci --reporter json
node cli/bin/quorum.js test \
  --config tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email test@quorum.dev \
  --password testpass123 \
  --ci --reporter json > /tmp/results.json
echo $?  # Should be 0 or 1
cat /tmp/results.json | python3 -m json.tool  # Valid JSON

# 10. Save baseline + check regression
node cli/bin/quorum.js test \
  --config tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email test@quorum.dev \
  --password testpass123 \
  --update-baseline
# -> "Baseline saved to tests/baselines/..."

node cli/bin/quorum.js test \
  --config tests/golden/.quorum.yml \
  --endpoint http://localhost:3000 \
  --email test@quorum.dev \
  --password testpass123
# -> "Compared against baseline: X regressions detected"

# 11. Run meta-evaluation
node tests/meta-eval/runMetaEval.js \
  --endpoint http://localhost:3000 \
  --email test@quorum.dev \
  --password testpass123 \
  --strategy council
# -> Agreement report + baseline saved

# 12. Test SDK PII sanitization
node -e "
  import { Quorum } from './sdk/src/index.js';
  const rs = new Quorum({ endpoint: 'http://localhost:3000' });
  rs.capture({ input: 'email: user@test.com', actualOutput: 'Call (555) 123-4567', retrievalContext: ['SSN: 123-45-6789'] });
  console.log(rs._buffer[0].input);  // Should show [EMAIL]
  console.log(rs._buffer[0].actualOutput);  // Should show [PHONE]
  console.log(rs._buffer[0].retrievalContext[0]);  // Should show [SSN]
  rs.close();
"

# 13. Dashboard still works
# Open http://localhost:5173, paste test JSON, run evaluation
# -> Should stream results with judge cards as before
```

### Success Criteria

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | `quorum init` creates working config + example dataset | E2E step 6 |
| 2 | `quorum test` evaluates and outputs colored verdicts | E2E step 8 |
| 3 | `quorum test --ci` outputs JSON with exit code 0/1 | E2E step 9 |
| 4 | GitHub Action posts markdown comment on PR | Checkpoint 5 |
| 5 | Meta-eval validates judges catch hallucinations (>80% agreement) | E2E step 11 |
| 6 | SDK sanitizes PII before sending | E2E step 12 |
| 7 | Dashboard works exactly as before | E2E step 13 |
| 8 | Every new file has tests | Test counts per commit |
| 9 | No file exceeds 250 lines | Manual check |
| 10 | All ~120+ tests pass across backend/sdk/cli | E2E steps 3-5 |

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ThresholdEvaluator location | Backend first, duplicate to CLI | Meta-eval imports from backend; enables future webhook thresholds |
| Schema duplication | ~40 lines in CLI | Separate package; shared workspace overkill |
| Golden dataset expectations | `expectedScoreRange` not `expectedVerdict` | Decoupled from threshold config changes |
| YAML parsing | CLI only | Backend receives JSON over HTTP |
| Auth | Cookie-based via login | Reuses existing auth system |
| Dataset batching | Chunk by 10 | Backend Zod limit (`validation.js:4`) |
| Polling | 2s interval, 120s timeout | Council on 10 cases takes 30-60s |
| PII default | ON (opt-out) | Security-first |
| Test framework | Vitest everywhere | Backend already uses it |
| Regression matching | By test case `id` | Graceful degradation when absent |

---

## What This Does NOT Change

- Evaluation engine (judges, orchestrator, aggregator, adaptive router)
- Frontend dashboard
- Existing API contracts (backwards-compatible `id`/`metadata` additions only)
- Webhook system
- SSE streaming
- Cost tracker
