const METRIC_JUDGE_MAP = {
  faithfulness: 'openai',
  groundedness: 'anthropic',
  contextRelevancy: 'gemini',
};

function getMetricScore(result, metric) {
  if (metric === 'finalScore') {
    return result?.aggregator?.finalScore ?? null;
  }

  const judgeName = METRIC_JUDGE_MAP[metric];
  if (!judgeName) return null;

  return result?.judges?.[judgeName]?.score ?? null;
}

function evaluateSingleMetric(metric, score, config) {
  if (score === null || score === undefined) {
    return {
      metric,
      score: null,
      verdict: 'SKIP',
      threshold: config,
    };
  }

  if (score >= config.pass) {
    return { metric, score, verdict: 'PASS', threshold: config };
  }

  if (score >= config.warn) {
    return { metric, score, verdict: 'WARN', threshold: config };
  }

  return { metric, score, verdict: 'FAIL', threshold: config };
}

function evaluateMetrics(result, thresholdConfig) {
  return Object.entries(thresholdConfig || {}).map(([metric, config]) => {
    const score = getMetricScore(result, metric);
    return evaluateSingleMetric(metric, score, config);
  });
}

function computeOverallVerdict(metricVerdicts, result) {
  if (result?.aggregator?.verdict === 'ERROR') {
    return 'ERROR';
  }

  const nonSkipVerdicts = metricVerdicts
    .map((v) => v.verdict)
    .filter((v) => v !== 'SKIP');

  if (nonSkipVerdicts.length === 0) return 'SKIP';
  if (nonSkipVerdicts.includes('FAIL')) return 'FAIL';
  if (nonSkipVerdicts.includes('WARN')) return 'WARN';
  return 'PASS';
}

function computeRunVerdict(evaluatedResults) {
  if (evaluatedResults.length === 0) return 'SKIP';

  const verdicts = evaluatedResults.map((result) => result.overallVerdict);
  if (verdicts.includes('FAIL')) return 'FAIL';
  if (verdicts.includes('ERROR')) return 'ERROR';
  if (verdicts.includes('WARN')) return 'WARN';
  if (verdicts.includes('PASS')) return 'PASS';
  return 'SKIP';
}

function computeSummary(evaluatedResults) {
  const summary = {
    total: evaluatedResults.length,
    passed: 0,
    warned: 0,
    failed: 0,
    errored: 0,
    skipped: 0,
    passRate: 0,
  };

  for (const result of evaluatedResults) {
    switch (result.overallVerdict) {
      case 'PASS':
        summary.passed += 1;
        break;
      case 'WARN':
        summary.warned += 1;
        break;
      case 'FAIL':
        summary.failed += 1;
        break;
      case 'ERROR':
        summary.errored += 1;
        break;
      default:
        summary.skipped += 1;
        break;
    }
  }

  const denominator = summary.total - summary.skipped;
  summary.passRate = denominator > 0 ? Math.round((summary.passed / denominator) * 10000) / 100 : 0;

  return summary;
}

export function evaluateThresholds(results, thresholdConfig) {
  const evaluatedResults = (results || []).map((result) => {
    const metricVerdicts = evaluateMetrics(result, thresholdConfig);
    const overallVerdict = computeOverallVerdict(metricVerdicts, result);

    return {
      ...result,
      metricVerdicts,
      overallVerdict,
    };
  });

  return {
    results: evaluatedResults,
    summary: computeSummary(evaluatedResults),
    overallVerdict: computeRunVerdict(evaluatedResults),
  };
}
