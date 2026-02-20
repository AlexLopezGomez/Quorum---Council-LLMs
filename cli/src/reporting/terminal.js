import chalk from 'chalk';

const VERDICT_COLOR = {
  PASS: chalk.green,
  WARN: chalk.yellow,
  FAIL: chalk.red,
  ERROR: chalk.red.bold,
  SKIP: chalk.gray,
};

export function colorVerdict(verdict) {
  return (VERDICT_COLOR[verdict] ?? chalk.white)(verdict);
}

export function formatScore(score) {
  return score !== null && score !== undefined ? score.toFixed(2) : chalk.gray('n/a');
}

export function printTestCaseResult(result, index) {
  const id = result.id ? `[${result.id}]` : `[#${index}]`;
  const strategy = chalk.dim(`(${result.strategy || '?'})`);
  console.log(`  ${colorVerdict(result.overallVerdict)} ${id} ${strategy}`);
  for (const mv of result.metricVerdicts || []) {
    console.log(`    ${mv.metric}: ${colorVerdict(mv.verdict)} ${formatScore(mv.score)}`);
  }
}

export function printSummary(summary, overallVerdict, regressions = []) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Overall: ${colorVerdict(overallVerdict)}`);
  console.log(
    `Results: ${chalk.green(`${summary.passed} passed`)}, ` +
      `${chalk.yellow(`${summary.warned} warned`)}, ` +
      `${chalk.red(`${summary.failed} failed`)}, ` +
      `${chalk.red(`${summary.errored} errored`)}, ` +
      `${chalk.gray(`${summary.skipped} skipped`)}`
  );
  console.log(`Pass rate: ${summary.passRate}%`);

  if (regressions.length > 0) {
    console.log(chalk.yellow(`\nRegressions: ${regressions.length} detected`));
    for (const r of regressions) {
      console.log(
        chalk.yellow(`  ${r.testCaseId} / ${r.metric}: ${r.previous.toFixed(2)} → ${r.current.toFixed(2)} (Δ${r.delta.toFixed(2)})`)
      );
    }
  } else {
    console.log(chalk.green('No regressions detected'));
  }
}
