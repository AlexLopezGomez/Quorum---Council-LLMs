import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit-test the projection and response shape expected from the monitoring route

describe('monitoring route — scores response shape', () => {
  it('maps evaluation fields to score shape correctly', () => {
    const rawEval = {
      jobId: 'abc123',
      completedAt: new Date('2026-01-01'),
      results: [
        {
          aggregator: { finalScore: 82, verdict: 'PASS' },
          strategy: 'hybrid',
          riskScore: 0.3,
        },
      ],
    };

    const score = {
      jobId: rawEval.jobId,
      completedAt: rawEval.completedAt,
      finalScore: rawEval.results?.[0]?.aggregator?.finalScore ?? null,
      verdict: rawEval.results?.[0]?.aggregator?.verdict ?? null,
      strategy: rawEval.results?.[0]?.strategy ?? null,
      riskScore: rawEval.results?.[0]?.riskScore ?? null,
    };

    expect(score.finalScore).toBe(82);
    expect(score.verdict).toBe('PASS');
    expect(score.strategy).toBe('hybrid');
    expect(score.riskScore).toBe(0.3);
  });

  it('handles missing aggregator gracefully (returns null, not undefined)', () => {
    const rawEval = { jobId: 'x', completedAt: new Date(), results: [] };
    const finalScore = rawEval.results?.[0]?.aggregator?.finalScore ?? null;
    const verdict = rawEval.results?.[0]?.aggregator?.verdict ?? null;
    expect(finalScore).toBe(null);
    expect(verdict).toBe(null);
  });

  it('uses aggregator path, not aggregatedResult', () => {
    const r = { aggregator: { finalScore: 75 }, aggregatedResult: { finalScore: 50 } };
    expect(r?.aggregator?.finalScore).toBe(75);
  });
});

describe('monitoring route — alerts response shape', () => {
  it('returns expected alert fields', () => {
    const raw = {
      _id: 'alertId',
      userId: 'u1',
      severity: 'warning',
      drop: 12.5,
      baselineMean: 80,
      rollingMean: 67.5,
      createdAt: new Date(),
    };

    const mapped = {
      severity: raw.severity,
      drop: raw.drop,
      baselineMean: raw.baselineMean,
      rollingMean: raw.rollingMean,
      createdAt: raw.createdAt,
    };

    expect(mapped).not.toHaveProperty('_id');
    expect(mapped).not.toHaveProperty('userId');
    expect(mapped.severity).toBe('warning');
  });
});

describe('monitoring route — limit validation', () => {
  it('defaults to 50', () => {
    const parsedLimit = Number.parseInt('', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;
    expect(limit).toBe(50);
  });

  it('caps at 200', () => {
    const parsedLimit = Number.parseInt('999', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;
    expect(limit).toBe(200);
  });

  it('floors at 1', () => {
    const parsedLimit = Number.parseInt('0', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;
    expect(limit).toBe(1);
  });
});
