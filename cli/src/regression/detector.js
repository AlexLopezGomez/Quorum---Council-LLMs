export function detectRegressions(currentResults, baselineResults, threshold = 0.05) {
  if (!baselineResults || baselineResults.length === 0) return [];

  const baselineById = new Map(
    baselineResults.filter((r) => r.id).map((r) => [r.id, r])
  );

  const regressions = [];
  for (const current of currentResults) {
    if (!current.id) continue;
    const baseline = baselineById.get(current.id);
    if (!baseline) continue;

    for (const mv of current.metricVerdicts || []) {
      const baselineMv = (baseline.metricVerdicts || []).find((m) => m.metric === mv.metric);
      if (!baselineMv || mv.score === null || baselineMv.score === null) continue;
      const delta = mv.score - baselineMv.score;
      if (delta < -threshold) {
        regressions.push({
          metric: mv.metric,
          previous: baselineMv.score,
          current: mv.score,
          delta,
          testCaseId: current.id,
        });
      }
    }
  }

  return regressions;
}
