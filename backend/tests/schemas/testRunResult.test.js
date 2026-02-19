import { describe, it, expect } from 'vitest';
import { testRunResultSchema } from '../../src/schemas/testRunResult.js';

function makeValidRunResult() {
  return {
    runId: 'run-001',
    timestamp: new Date().toISOString(),
    config: {
      version: 1,
      metrics: { faithfulness: { pass: 0.7, warn: 0.4 } },
    },
    dataset: 'coliving-factual.jsonl',
    strategyDistribution: { council: 8, hybrid: 1, single: 1 },
    results: [
      {
        index: 0,
        id: 'case-001',
        metricVerdicts: [
          {
            metric: 'faithfulness',
            score: 0.9,
            verdict: 'PASS',
            threshold: { pass: 0.7, warn: 0.4 },
          },
        ],
        overallVerdict: 'PASS',
        strategy: 'council',
        riskScore: 0.88,
        metadata: { domain: 'coliving' },
      },
    ],
    summary: {
      total: 1,
      passed: 1,
      warned: 0,
      failed: 0,
      errored: 0,
      skipped: 0,
      passRate: 100,
      avgScores: { faithfulness: 0.9, groundedness: null },
      totalCost: 0.012345,
    },
    regressions: [
      { metric: 'faithfulness', previous: 0.92, current: 0.9, delta: -0.02, testCaseId: 'case-001' },
    ],
    overallVerdict: 'PASS',
  };
}

describe('testRunResultSchema', () => {
  it('passes for a valid complete run result', () => {
    const result = testRunResultSchema.safeParse(makeValidRunResult());
    expect(result.success).toBe(true);
  });

  it('fails when summary.total is missing', () => {
    const payload = makeValidRunResult();
    delete payload.summary.total;

    const result = testRunResultSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('fails for invalid overallVerdict value', () => {
    const payload = makeValidRunResult();
    payload.overallVerdict = 'PARTIAL';

    const result = testRunResultSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('passes when results array is empty', () => {
    const payload = makeValidRunResult();
    payload.results = [];
    payload.summary.total = 0;
    payload.summary.passed = 0;
    payload.summary.passRate = 0;

    const result = testRunResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('passes when regression delta is negative', () => {
    const payload = makeValidRunResult();
    payload.regressions = [{ metric: 'finalScore', previous: 0.8, current: 0.7, delta: -0.1 }];

    const result = testRunResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
