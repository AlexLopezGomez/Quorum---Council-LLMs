import { describe, it, expect } from 'vitest';
import { evaluateThresholds } from '../../src/evaluators/thresholdEvaluator.js';

const THRESHOLDS = {
  faithfulness: { pass: 0.7, warn: 0.4 },
  groundedness: { pass: 0.7, warn: 0.4 },
  contextRelevancy: { pass: 0.6, warn: 0.3 },
  finalScore: { pass: 0.65, warn: 0.4 },
};

function makeResult({
  index = 0,
  strategy = 'council',
  judges = {},
  aggregator = { verdict: 'PASS', finalScore: 0.8 },
} = {}) {
  return {
    testCaseIndex: index,
    strategy,
    judges,
    aggregator,
  };
}

describe('evaluateThresholds', () => {
  describe('metric threshold evaluation', () => {
    it('returns PASS when score is above pass threshold', () => {
      const input = [makeResult({ judges: { openai: { score: 0.9 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('PASS');
    });

    it('returns WARN when score is between warn and pass', () => {
      const input = [makeResult({ judges: { openai: { score: 0.5 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('WARN');
    });

    it('returns FAIL when score is below warn threshold', () => {
      const input = [makeResult({ judges: { openai: { score: 0.2 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('FAIL');
    });

    it('returns PASS at exact pass boundary', () => {
      const input = [makeResult({ judges: { openai: { score: 0.7 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('PASS');
    });

    it('returns WARN at exact warn boundary', () => {
      const input = [makeResult({ judges: { openai: { score: 0.4 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('WARN');
    });

    it('returns WARN just below pass boundary', () => {
      const input = [makeResult({ judges: { openai: { score: 0.699 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('WARN');
    });

    it('returns FAIL for score of 0', () => {
      const input = [makeResult({ judges: { openai: { score: 0 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('FAIL');
    });

    it('returns PASS for score of 1', () => {
      const input = [makeResult({ judges: { openai: { score: 1 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('PASS');
    });

    it('returns SKIP for null and undefined score', () => {
      const nullCase = [makeResult({ judges: { openai: { score: null } } })];
      const undefinedCase = [makeResult({ judges: { openai: {} } })];

      const nullOutput = evaluateThresholds(nullCase, { faithfulness: THRESHOLDS.faithfulness });
      const undefinedOutput = evaluateThresholds(undefinedCase, { faithfulness: THRESHOLDS.faithfulness });

      expect(nullOutput.results[0].metricVerdicts[0].verdict).toBe('SKIP');
      expect(undefinedOutput.results[0].metricVerdicts[0].verdict).toBe('SKIP');
    });
  });

  describe('per-test-case overall verdict', () => {
    it('returns PASS when all configured metrics pass', () => {
      const input = [
        makeResult({
          judges: {
            openai: { score: 0.9 },
            anthropic: { score: 0.9 },
            gemini: { score: 0.9 },
          },
        }),
      ];

      const output = evaluateThresholds(input, {
        faithfulness: THRESHOLDS.faithfulness,
        groundedness: THRESHOLDS.groundedness,
        contextRelevancy: THRESHOLDS.contextRelevancy,
      });

      expect(output.results[0].overallVerdict).toBe('PASS');
    });

    it('returns FAIL when any metric fails', () => {
      const input = [
        makeResult({
          judges: {
            openai: { score: 0.2 },
            anthropic: { score: 0.9 },
          },
        }),
      ];

      const output = evaluateThresholds(input, {
        faithfulness: THRESHOLDS.faithfulness,
        groundedness: THRESHOLDS.groundedness,
      });

      expect(output.results[0].overallVerdict).toBe('FAIL');
    });

    it('returns WARN when no fail but at least one warning', () => {
      const input = [makeResult({ judges: { openai: { score: 0.5 } } })];
      const output = evaluateThresholds(input, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.results[0].overallVerdict).toBe('WARN');
    });

    it('returns SKIP when all configured metrics skip', () => {
      const input = [makeResult({ judges: {} })];
      const output = evaluateThresholds(input, {
        faithfulness: THRESHOLDS.faithfulness,
        groundedness: THRESHOLDS.groundedness,
      });
      expect(output.results[0].overallVerdict).toBe('SKIP');
    });

    it('returns ERROR when aggregator verdict is ERROR', () => {
      const input = [
        makeResult({
          judges: { openai: { score: 0.9 }, anthropic: { score: 0.9 } },
          aggregator: { verdict: 'ERROR', finalScore: null },
        }),
      ];

      const output = evaluateThresholds(input, {
        faithfulness: THRESHOLDS.faithfulness,
        groundedness: THRESHOLDS.groundedness,
      });

      expect(output.results[0].overallVerdict).toBe('ERROR');
    });
  });

  describe('strategy-specific handling', () => {
    it('council evaluates all three judges when present', () => {
      const input = [
        makeResult({
          strategy: 'council',
          judges: {
            openai: { score: 0.8 },
            anthropic: { score: 0.8 },
            gemini: { score: 0.8 },
          },
        }),
      ];

      const output = evaluateThresholds(input, {
        faithfulness: THRESHOLDS.faithfulness,
        groundedness: THRESHOLDS.groundedness,
        contextRelevancy: THRESHOLDS.contextRelevancy,
      });

      expect(output.results[0].metricVerdicts.map((v) => v.verdict)).toEqual(['PASS', 'PASS', 'PASS']);
    });

    it('hybrid marks missing anthropic and gemini metrics as SKIP', () => {
      const input = [
        makeResult({
          strategy: 'hybrid',
          judges: {
            openai: { score: 0.8 },
          },
        }),
      ];

      const output = evaluateThresholds(input, {
        faithfulness: THRESHOLDS.faithfulness,
        groundedness: THRESHOLDS.groundedness,
        contextRelevancy: THRESHOLDS.contextRelevancy,
      });

      const verdictByMetric = Object.fromEntries(output.results[0].metricVerdicts.map((v) => [v.metric, v.verdict]));
      expect(verdictByMetric.faithfulness).toBe('PASS');
      expect(verdictByMetric.groundedness).toBe('SKIP');
      expect(verdictByMetric.contextRelevancy).toBe('SKIP');
    });

    it('single marks faithfulness and groundedness as SKIP', () => {
      const input = [
        makeResult({
          strategy: 'single',
          judges: { gemini: { score: 0.8 } },
        }),
      ];

      const output = evaluateThresholds(input, {
        faithfulness: THRESHOLDS.faithfulness,
        groundedness: THRESHOLDS.groundedness,
        contextRelevancy: THRESHOLDS.contextRelevancy,
      });

      const verdictByMetric = Object.fromEntries(output.results[0].metricVerdicts.map((v) => [v.metric, v.verdict]));
      expect(verdictByMetric.faithfulness).toBe('SKIP');
      expect(verdictByMetric.groundedness).toBe('SKIP');
      expect(verdictByMetric.contextRelevancy).toBe('PASS');
    });
  });

  describe('run-level verdict', () => {
    it('returns PASS when all test cases pass', () => {
      const results = [makeResult({ judges: { openai: { score: 0.9 } } }), makeResult({ judges: { openai: { score: 0.95 } } })];
      const output = evaluateThresholds(results, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.overallVerdict).toBe('PASS');
    });

    it('returns FAIL when any test case fails', () => {
      const results = [makeResult({ judges: { openai: { score: 0.2 } } }), makeResult({ judges: { openai: { score: 0.95 } } })];
      const output = evaluateThresholds(results, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.overallVerdict).toBe('FAIL');
    });

    it('returns ERROR when there is an error and no fails', () => {
      const results = [
        makeResult({
          judges: { openai: { score: 0.95 } },
          aggregator: { verdict: 'ERROR', finalScore: null },
        }),
      ];
      const output = evaluateThresholds(results, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.overallVerdict).toBe('ERROR');
    });

    it('returns WARN when there is a warning and no fail/error', () => {
      const results = [makeResult({ judges: { openai: { score: 0.5 } } })];
      const output = evaluateThresholds(results, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.overallVerdict).toBe('WARN');
    });

    it('returns SKIP for empty results array', () => {
      const output = evaluateThresholds([], { faithfulness: THRESHOLDS.faithfulness });
      expect(output.overallVerdict).toBe('SKIP');
    });
  });

  describe('summary computation', () => {
    it('computes mixed verdict counts correctly', () => {
      const results = [
        makeResult({ judges: { openai: { score: 0.9 } } }),
        makeResult({ judges: { openai: { score: 0.5 } } }),
        makeResult({ judges: { openai: { score: 0.2 } } }),
        makeResult({ judges: {}, aggregator: { verdict: 'PASS', finalScore: null } }),
        makeResult({ judges: { openai: { score: 0.95 } }, aggregator: { verdict: 'ERROR', finalScore: null } }),
      ];

      const output = evaluateThresholds(results, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.summary).toMatchObject({
        total: 5,
        passed: 1,
        warned: 1,
        failed: 1,
        skipped: 1,
        errored: 1,
      });
    });

    it('computes passRate excluding SKIP cases', () => {
      const results = [
        makeResult({ judges: { openai: { score: 0.9 } } }),
        makeResult({ judges: { openai: { score: 0.9 } } }),
        makeResult({ judges: { openai: { score: 0.2 } } }),
        makeResult({ judges: { openai: { score: 0.2 } } }),
        makeResult({ judges: {}, aggregator: { verdict: 'PASS', finalScore: null } }),
      ];

      const output = evaluateThresholds(results, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.summary.passRate).toBe(50);
    });

    it('computes passRate with skips excluded (3 PASS, 1 FAIL, 2 SKIP => 75)', () => {
      const results = [
        makeResult({ judges: { openai: { score: 0.9 } } }),
        makeResult({ judges: { openai: { score: 0.9 } } }),
        makeResult({ judges: { openai: { score: 0.9 } } }),
        makeResult({ judges: { openai: { score: 0.2 } } }),
        makeResult({ judges: {}, aggregator: { verdict: 'PASS', finalScore: null } }),
        makeResult({ judges: {}, aggregator: { verdict: 'PASS', finalScore: null } }),
      ];

      const output = evaluateThresholds(results, { faithfulness: THRESHOLDS.faithfulness });
      expect(output.summary.passRate).toBe(75);
    });

    it('returns passRate 0 for empty result set and all-SKIP runs', () => {
      const empty = evaluateThresholds([], { faithfulness: THRESHOLDS.faithfulness });
      expect(empty.summary.passRate).toBe(0);

      const allSkip = evaluateThresholds(
        [makeResult({ judges: {}, aggregator: { verdict: 'PASS', finalScore: null } })],
        { faithfulness: THRESHOLDS.faithfulness }
      );
      expect(allSkip.summary.passRate).toBe(0);
    });
  });

  describe('finalScore metric', () => {
    it('evaluates finalScore from aggregator data', () => {
      const input = [makeResult({ aggregator: { verdict: 'PASS', finalScore: 0.8 } })];
      const output = evaluateThresholds(input, { finalScore: THRESHOLDS.finalScore });
      expect(output.results[0].metricVerdicts[0]).toMatchObject({
        metric: 'finalScore',
        score: 0.8,
        verdict: 'PASS',
      });
    });

    it('returns SKIP when finalScore is null', () => {
      const input = [makeResult({ aggregator: { verdict: 'PASS', finalScore: null } })];
      const output = evaluateThresholds(input, { finalScore: THRESHOLDS.finalScore });
      expect(output.results[0].metricVerdicts[0].verdict).toBe('SKIP');
    });

    it('handles finalScore pass/warn/fail boundaries', () => {
      const pass = evaluateThresholds(
        [makeResult({ aggregator: { verdict: 'PASS', finalScore: 0.65 } })],
        { finalScore: THRESHOLDS.finalScore }
      );
      const warn = evaluateThresholds(
        [makeResult({ aggregator: { verdict: 'PASS', finalScore: 0.4 } })],
        { finalScore: THRESHOLDS.finalScore }
      );
      const fail = evaluateThresholds(
        [makeResult({ aggregator: { verdict: 'PASS', finalScore: 0.2 } })],
        { finalScore: THRESHOLDS.finalScore }
      );

      expect(pass.results[0].metricVerdicts[0].verdict).toBe('PASS');
      expect(warn.results[0].metricVerdicts[0].verdict).toBe('WARN');
      expect(fail.results[0].metricVerdicts[0].verdict).toBe('FAIL');
    });
  });
});
