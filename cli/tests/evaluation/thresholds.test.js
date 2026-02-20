import { describe, it, expect } from 'vitest';
import { evaluateThresholds } from '../../src/evaluation/thresholds.js';

const T = {
  faithfulness: { pass: 0.7, warn: 0.4 },
  groundedness: { pass: 0.7, warn: 0.4 },
  finalScore: { pass: 0.65, warn: 0.4 },
};

function makeResult(judges = {}, aggregator = { verdict: 'PASS', finalScore: 0.8 }) {
  return { testCaseIndex: 0, strategy: 'council', judges, aggregator };
}

describe('evaluateThresholds — CLI copy parity with backend', () => {
  it('PASS when score exceeds pass threshold', () => {
    const out = evaluateThresholds([makeResult({ openai: { score: 0.9 } })], { faithfulness: T.faithfulness });
    expect(out.results[0].metricVerdicts[0].verdict).toBe('PASS');
  });

  it('WARN when score is between warn and pass', () => {
    const out = evaluateThresholds([makeResult({ openai: { score: 0.5 } })], { faithfulness: T.faithfulness });
    expect(out.results[0].metricVerdicts[0].verdict).toBe('WARN');
  });

  it('FAIL when score is below warn threshold', () => {
    const out = evaluateThresholds([makeResult({ openai: { score: 0.2 } })], { faithfulness: T.faithfulness });
    expect(out.results[0].metricVerdicts[0].verdict).toBe('FAIL');
  });

  it('PASS at exact pass boundary (>=)', () => {
    const out = evaluateThresholds([makeResult({ openai: { score: 0.7 } })], { faithfulness: T.faithfulness });
    expect(out.results[0].metricVerdicts[0].verdict).toBe('PASS');
  });

  it('WARN at exact warn boundary', () => {
    const out = evaluateThresholds([makeResult({ openai: { score: 0.4 } })], { faithfulness: T.faithfulness });
    expect(out.results[0].metricVerdicts[0].verdict).toBe('WARN');
  });

  it('SKIP for null score', () => {
    const out = evaluateThresholds([makeResult({ openai: { score: null } })], { faithfulness: T.faithfulness });
    expect(out.results[0].metricVerdicts[0].verdict).toBe('SKIP');
  });

  it('SKIP when judge is absent', () => {
    const out = evaluateThresholds([makeResult({})], { faithfulness: T.faithfulness });
    expect(out.results[0].metricVerdicts[0].verdict).toBe('SKIP');
  });

  it('ERROR propagates when aggregator verdict is ERROR', () => {
    const out = evaluateThresholds(
      [makeResult({ openai: { score: 0.9 } }, { verdict: 'ERROR', finalScore: null })],
      { faithfulness: T.faithfulness }
    );
    expect(out.results[0].overallVerdict).toBe('ERROR');
  });

  it('run-level PASS when all cases pass', () => {
    const out = evaluateThresholds(
      [makeResult({ openai: { score: 0.9 } }), makeResult({ openai: { score: 0.95 } })],
      { faithfulness: T.faithfulness }
    );
    expect(out.overallVerdict).toBe('PASS');
  });

  it('run-level FAIL when any case fails', () => {
    const out = evaluateThresholds(
      [makeResult({ openai: { score: 0.9 } }), makeResult({ openai: { score: 0.1 } })],
      { faithfulness: T.faithfulness }
    );
    expect(out.overallVerdict).toBe('FAIL');
  });

  it('passRate excludes SKIP cases from denominator', () => {
    const out = evaluateThresholds(
      [makeResult({ openai: { score: 0.9 } }), makeResult({ openai: { score: 0.9 } }), makeResult({})],
      { faithfulness: T.faithfulness }
    );
    expect(out.summary.passRate).toBe(100);
    expect(out.summary.skipped).toBe(1);
  });

  it('SKIP verdict and passRate 0 for empty results', () => {
    const out = evaluateThresholds([], T);
    expect(out.overallVerdict).toBe('SKIP');
    expect(out.summary.passRate).toBe(0);
  });

  it('hybrid result: only openai present → groundedness SKIP', () => {
    const out = evaluateThresholds(
      [makeResult({ openai: { score: 0.8 } })],
      { faithfulness: T.faithfulness, groundedness: T.groundedness }
    );
    const map = Object.fromEntries(out.results[0].metricVerdicts.map((v) => [v.metric, v.verdict]));
    expect(map.faithfulness).toBe('PASS');
    expect(map.groundedness).toBe('SKIP');
  });

  it('finalScore is read from aggregator', () => {
    const out = evaluateThresholds(
      [makeResult({}, { verdict: 'PASS', finalScore: 0.75 })],
      { finalScore: T.finalScore }
    );
    expect(out.results[0].metricVerdicts[0].score).toBe(0.75);
    expect(out.results[0].metricVerdicts[0].verdict).toBe('PASS');
  });

  it('summary counts are correct for mixed verdicts', () => {
    const out = evaluateThresholds(
      [
        makeResult({ openai: { score: 0.9 } }),
        makeResult({ openai: { score: 0.5 } }),
        makeResult({ openai: { score: 0.1 } }),
      ],
      { faithfulness: T.faithfulness }
    );
    expect(out.summary.passed).toBe(1);
    expect(out.summary.warned).toBe(1);
    expect(out.summary.failed).toBe(1);
  });
});
