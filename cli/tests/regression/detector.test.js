import { describe, it, expect } from 'vitest';
import { detectRegressions } from '../../src/regression/detector.js';

function result(id, verdicts) {
  return { id, metricVerdicts: verdicts.map(([metric, score]) => ({ metric, score, verdict: 'PASS' })) };
}

describe('detectRegressions', () => {
  it('detects regression when score drops by more than threshold', () => {
    const current = [result('tc-1', [['faithfulness', 0.5]])];
    const baseline = [result('tc-1', [['faithfulness', 0.8]])];
    const regressions = detectRegressions(current, baseline, 0.05);
    expect(regressions).toHaveLength(1);
    expect(regressions[0].metric).toBe('faithfulness');
    expect(regressions[0].delta).toBeCloseTo(-0.3);
    expect(regressions[0].testCaseId).toBe('tc-1');
  });

  it('does not flag stable scores', () => {
    const current = [result('tc-1', [['faithfulness', 0.8]])];
    const baseline = [result('tc-1', [['faithfulness', 0.8]])];
    expect(detectRegressions(current, baseline, 0.05)).toHaveLength(0);
  });

  it('does not flag score improvements', () => {
    const current = [result('tc-1', [['faithfulness', 0.9]])];
    const baseline = [result('tc-1', [['faithfulness', 0.7]])];
    expect(detectRegressions(current, baseline, 0.05)).toHaveLength(0);
  });

  it('returns empty array when baseline is null', () => {
    const current = [result('tc-1', [['faithfulness', 0.5]])];
    expect(detectRegressions(current, null, 0.05)).toHaveLength(0);
  });

  it('returns empty array for empty baseline', () => {
    const current = [result('tc-1', [['faithfulness', 0.5]])];
    expect(detectRegressions(current, [], 0.05)).toHaveLength(0);
  });

  it('skips test cases without id (graceful degradation)', () => {
    const current = [{ id: null, metricVerdicts: [{ metric: 'faithfulness', score: 0.1, verdict: 'FAIL' }] }];
    const baseline = [{ id: null, metricVerdicts: [{ metric: 'faithfulness', score: 0.9, verdict: 'PASS' }] }];
    expect(detectRegressions(current, baseline, 0.05)).toHaveLength(0);
  });

  it('does not flag new test cases not in baseline', () => {
    const current = [result('new-case', [['faithfulness', 0.5]])];
    const baseline = [result('old-case', [['faithfulness', 0.9]])];
    expect(detectRegressions(current, baseline, 0.05)).toHaveLength(0);
  });

  it('detects multiple regressions across different metrics', () => {
    const current = [result('tc-1', [['faithfulness', 0.4], ['groundedness', 0.3]])];
    const baseline = [result('tc-1', [['faithfulness', 0.9], ['groundedness', 0.9]])];
    const regressions = detectRegressions(current, baseline, 0.05);
    expect(regressions).toHaveLength(2);
    const metrics = regressions.map((r) => r.metric);
    expect(metrics).toContain('faithfulness');
    expect(metrics).toContain('groundedness');
  });
});
