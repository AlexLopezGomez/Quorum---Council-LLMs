const VERDICT_ICON = { PASS: '✅', WARN: '⚠️', FAIL: '❌', ERROR: '🔴', SKIP: '⏭️' };

function icon(verdict) { return VERDICT_ICON[verdict] ?? '❓'; }
function score(s) { return s !== null && s !== undefined ? s.toFixed(2) : 'n/a'; }

export function generateMarkdown(runResult) {
  const { results, summary, overallVerdict, regressions = [] } = runResult;

  const metrics = results.length > 0
    ? [...new Set(results.flatMap((r) => (r.metricVerdicts || []).map((mv) => mv.metric)))]
    : [];

  const header = `| Test Case | ${metrics.join(' | ')} | Overall |`;
  const divider = `|${'---|'.repeat(metrics.length + 2)}`;

  const rows = results.map((r) => {
    const id = r.id || `#${r.testCaseIndex ?? '?'}`;
    const cells = metrics.map((m) => {
      const mv = (r.metricVerdicts || []).find((v) => v.metric === m);
      return mv ? `${icon(mv.verdict)} ${score(mv.score)}` : '-';
    });
    return `| ${id} | ${cells.join(' | ')} | ${icon(r.overallVerdict)} ${r.overallVerdict} |`;
  });

  const lines = [
    '## Quorum Evaluation Report',
    '',
    header,
    divider,
    ...rows,
    '',
    `**Overall**: ${icon(overallVerdict)} ${overallVerdict}  `,
    `**Pass rate**: ${summary.passRate}% (${summary.passed}/${summary.total - summary.skipped} non-skipped)  `,
    `**Results**: ${summary.passed} passed, ${summary.warned} warned, ${summary.failed} failed, ${summary.errored} errored`,
  ];

  if (regressions.length > 0) {
    lines.push('', `**Regressions**: ${regressions.length} detected`);
    for (const r of regressions) {
      lines.push(`- \`${r.testCaseId}\` / ${r.metric}: ${r.previous.toFixed(2)} → ${r.current.toFixed(2)} (Δ${r.delta.toFixed(2)})`);
    }
  }

  return lines.join('\n');
}
