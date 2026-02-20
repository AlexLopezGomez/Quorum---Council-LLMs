import { resolve, dirname } from 'path';
import { loadConfig } from '../config/loader.js';
import { parseDataset } from '../dataset/parser.js';
import { authenticate, resolveCredentials } from '../auth.js';
import { runChunks } from '../evaluation/client.js';
import { evaluateThresholds } from '../evaluation/thresholds.js';
import { detectRegressions } from '../regression/detector.js';
import { readBaseline, writeBaseline, buildBaselinePath, findLatestBaseline } from '../regression/baseline.js';
import { printTestCaseResult, printSummary } from '../reporting/terminal.js';
import { generateMarkdown } from '../reporting/markdown.js';

function computeExitCode(overallVerdict, regressions, ciConfig) {
  if (overallVerdict === 'FAIL') return 1;
  if (overallVerdict === 'ERROR' && ciConfig.failOnError) return 1;
  if (overallVerdict === 'WARN' && ciConfig.failOnWarn) return 1;
  if (regressions.length > 0 && ciConfig.failOnRegression) return 1;
  return 0;
}

export async function runTest(options) {
  const configPath = resolve(options.config || '.quorum.yml');
  const configDir = dirname(configPath);
  const config = loadConfig(configPath);

  const { email, password } = resolveCredentials(options);
  const endpoint = options.endpoint || 'http://localhost:3000';
  const timeout = Number(options.timeout) || 120000;
  const strategy = options.strategy || config.strategy;
  const ci = Boolean(options.ci);

  let ora;
  if (!ci) ({ default: ora } = await import('ora'));

  const log = (...args) => { if (!ci) console.log(...args); };

  log('Authenticating...');
  let cookie = await authenticate(endpoint, email, password);
  log('Authenticated.\n');

  const allResults = [];

  for (const dataset of config.datasets) {
    const spinner = ora ? ora(`Loading ${dataset}...`).start() : null;
    let testCases;
    try {
      testCases = parseDataset(dataset, configDir);
    } catch (err) {
      spinner?.fail(err.message);
      throw err;
    }
    spinner?.succeed(`${dataset} — ${testCases.length} cases`);
    log(`Evaluating ${dataset}...`);

    const { results, errors } = await runChunks(endpoint, testCases, strategy, cookie, {
      timeout,
      onReauth: async () => {
        log('Session expired, re-authenticating...');
        cookie = await authenticate(endpoint, email, password);
        return cookie;
      },
      onChunkError: (chunkIndex, err) => {
        console.error(`  Chunk ${chunkIndex + 1} failed: ${err.message}`);
      },
    });

    if (errors.length > 0) log(`  ⚠ ${errors.length} chunk(s) had errors — affected cases marked ERROR`);

    const augmented = results.map((r) => ({ ...r, id: testCases[r.testCaseIndex]?.id }));
    allResults.push(...augmented);
  }

  const { results: evaluated, summary, overallVerdict } = evaluateThresholds(allResults, config.metrics);

  let regressions = [];
  if (config.ci?.baselinePath) {
    const baseDirPath = resolve(configDir, config.ci.baselinePath);
    if (!options.updateBaseline) {
      const baselineFile = findLatestBaseline(baseDirPath);
      const baseline = readBaseline(baselineFile);
      if (baseline) {
        regressions = detectRegressions(evaluated, baseline, config.ci.regressionThreshold);
        log(`Compared against baseline: ${regressions.length} regression(s) detected`);
      }
    }
  }

  const reporter = options.reporter || (ci ? 'json' : 'terminal');

  if (reporter === 'json') {
    process.stdout.write(JSON.stringify({ overallVerdict, summary, results: evaluated, regressions }, null, 2) + '\n');
  } else if (reporter === 'markdown') {
    console.log(generateMarkdown({ overallVerdict, summary, results: evaluated, regressions }));
  } else {
    for (let i = 0; i < evaluated.length; i++) printTestCaseResult(evaluated[i], i);
    printSummary(summary, overallVerdict, regressions);
  }

  if (options.updateBaseline && config.ci?.baselinePath) {
    const baseDirPath = resolve(configDir, config.ci.baselinePath);
    const baselineFile = buildBaselinePath(baseDirPath);
    writeBaseline(baselineFile, evaluated);
    log(`\nBaseline saved to: ${baselineFile}`);
  }

  return computeExitCode(overallVerdict, regressions, config.ci);
}
