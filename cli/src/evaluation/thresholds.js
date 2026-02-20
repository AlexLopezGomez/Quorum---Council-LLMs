// Synced from backend/src/evaluators/thresholdEvaluator.js — keep in sync manually
const METRIC_JUDGE_MAP = {
  faithfulness: 'openai',
  groundedness: 'anthropic',
  contextRelevancy: 'gemini',
};

function getMetricScore(result, metric) {
  if (metric === 'finalScore') return result?.aggregator?.finalScore ?? null;
  const judgeName = METRIC_JUDGE_MAP[metric];
  if (!judgeName) return null;
  return result?.judges?.[judgeName]?.score ?? null;
}

function evaluateSingleMetric(metric, score, config) {
  if (score === null || score === undefined) return { metric, score: null, verdict: 'SKIP', threshold: config };
  if (score >= config.pass) return { metric, score, verdict: 'PASS', threshold: config };
  if (score >= config.warn) return { metric, score, verdict: 'WARN', threshold: config };
  return { metric, score, verdict: 'FAIL', threshold: config };
}

function evaluateMetrics(result, thresholdConfig) {
  return Object.entries(thresholdConfig || {}).map(([metric, config]) =>
    evaluateSingleMetric(metric, getMetricScore(result, metric), config)
  );
}

function computeOverallVerdict(metricVerdicts, result) {
  if (result?.aggregator?.verdict === 'ERROR') return 'ERROR';
  const nonSkip = metricVerdicts.map((v) => v.verdict).filter((v) => v !== 'SKIP');
  if (nonSkip.length === 0) return 'SKIP';
  if (nonSkip.includes('FAIL')) return 'FAIL';
  if (nonSkip.includes('WARN')) return 'WARN';
  return 'PASS';
}

function computeRunVerdict(evaluated) {
  if (evaluated.length === 0) return 'SKIP';
  const verdicts = evaluated.map((r) => r.overallVerdict);
  if (verdicts.includes('FAIL')) return 'FAIL';
  if (verdicts.includes('ERROR')) return 'ERROR';
  if (verdicts.includes('WARN')) return 'WARN';
  if (verdicts.includes('PASS')) return 'PASS';
  return 'SKIP';
}

function computeSummary(evaluated) {
  const s = { total: evaluated.length, passed: 0, warned: 0, failed: 0, errored: 0, skipped: 0, passRate: 0 };
  for (const r of evaluated) {
    if (r.overallVerdict === 'PASS') s.passed++;
    else if (r.overallVerdict === 'WARN') s.warned++;
    else if (r.overallVerdict === 'FAIL') s.failed++;
    else if (r.overallVerdict === 'ERROR') s.errored++;
    else s.skipped++;
  }
  const denom = s.total - s.skipped;
  s.passRate = denom > 0 ? Math.round((s.passed / denom) * 10000) / 100 : 0;
  return s;
}

export function evaluateThresholds(results, thresholdConfig) {
  const evaluated = (results || []).map((result) => {
    const metricVerdicts = evaluateMetrics(result, thresholdConfig);
    return { ...result, metricVerdicts, overallVerdict: computeOverallVerdict(metricVerdicts, result) };
  });
  return { results: evaluated, summary: computeSummary(evaluated), overallVerdict: computeRunVerdict(evaluated) };
}
