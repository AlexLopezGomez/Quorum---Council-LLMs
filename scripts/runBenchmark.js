#!/usr/bin/env node
/**
 * Standalone CLI benchmark runner.
 * No Express, no MongoDB, no SSE — just judges + JSON output.
 *
 * Usage:
 *   node scripts/runBenchmark.js                        # full 5000-case run
 *   node scripts/runBenchmark.js --dataset path.json    # custom dataset
 *   node scripts/runBenchmark.js --limit 100            # first N cases
 *   node scripts/runBenchmark.js --resume               # resume from checkpoint (auto-enabled if checkpoint exists)
 *
 * Outputs:
 *   paper/data/benchmark_results.csv
 *   paper/data/aggregate_stats.json
 *   paper/data/checkpoint.json (incremental, deleted on completion)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../backend/.env') });

import { evaluateFaithfulness } from '../backend/src/services/judges/openai.js';
import { evaluateGroundedness } from '../backend/src/services/judges/anthropic.js';
import { evaluateContextRelevancy } from '../backend/src/services/judges/gemini.js';
import { aggregateResults } from '../backend/src/services/aggregator.js';
import { executeWithProviderResilience } from '../backend/src/services/providerResilience.js';

const PAPER_DIR = join(__dirname, '../paper/data');
const DEFAULT_DATASET = join(__dirname, '../backend/data/benchmark_5000.json');
const CHECKPOINT_PATH = join(PAPER_DIR, 'checkpoint.json');
const CONCURRENCY = 3;
const CHECKPOINT_INTERVAL = 15;

// ── CLI args ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dataset: DEFAULT_DATASET, limit: Infinity, resume: false, concurrency: CONCURRENCY };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dataset' && args[i + 1]) opts.dataset = args[i + 1];
    if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[i + 1]);
    if (args[i] === '--concurrency' && args[i + 1]) opts.concurrency = parseInt(args[i + 1]);
    if (args[i] === '--resume') opts.resume = true;
  }
  return opts;
}

// ── Pure stat helpers (from benchmarkRunner.js) ─────────────────────────────

function scoreToVerdict(score) {
  if (score === null || score === undefined) return 'ERROR';
  if (score >= 0.7) return 'PASS';
  if (score >= 0.4) return 'WARN';
  return 'FAIL';
}

function isCorrect(evaluatorVerdict, humanVerdict) {
  return (evaluatorVerdict === 'PASS' ? 'PASS' : 'FAIL') === humanVerdict;
}

function round2(n) { return Math.round(n * 100) / 100; }

function wilsonCI95(successes, total) {
  if (total === 0) return { lower: 0, upper: 1 };
  const z = 1.96;
  const p = successes / total;
  const denom = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denom;
  const margin = (z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total))) / denom;
  return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

function computeStats(caseResults, evaluatorKey) {
  const preds = caseResults.map(r => r[evaluatorKey].verdict === 'PASS' ? 'PASS' : 'FAIL');
  const ground = caseResults.map(r => r.humanVerdict);
  const n = caseResults.length;

  const tp = preds.filter((p, i) => p === 'PASS' && ground[i] === 'PASS').length;
  const tn = preds.filter((p, i) => p === 'FAIL' && ground[i] === 'FAIL').length;
  const fp = preds.filter((p, i) => p === 'PASS' && ground[i] === 'FAIL').length;
  const fn = preds.filter((p, i) => p === 'FAIL' && ground[i] === 'PASS').length;

  const accuracy = (tp + tn) / n;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const humanFails = fp + tn;
  const fnr = humanFails > 0 ? fp / humanFails : 0;

  const Po = accuracy;
  const pPosPred = (tp + fp) / n;
  const pPosTrue = (tp + fn) / n;
  const pNegPred = (tn + fn) / n;
  const pNegTrue = (tn + fp) / n;
  const Pe = pPosPred * pPosTrue + pNegPred * pNegTrue;
  const cohensKappa = Pe < 1 ? (Po - Pe) / (1 - Pe) : 1;

  const { lower, upper } = wilsonCI95(tp + tn, n);
  const avgCost = caseResults.reduce((s, r) => s + (r[evaluatorKey].cost || 0), 0) / n;
  const avgLatency = caseResults.reduce((s, r) => s + (r[evaluatorKey].latency || 0), 0) / n;

  const brierScore = caseResults.reduce((s, r) => {
    const score = r[evaluatorKey].score;
    const label = r.humanVerdict === 'PASS' ? 1 : 0;
    if (score == null) return s;
    return s + Math.pow(score - label, 2);
  }, 0) / n;

  const domains = [...new Set(caseResults.map(r => r.domain))];
  const perDomain = {};
  for (const domain of domains) {
    const dc = caseResults.filter(r => r.domain === domain);
    const correct = dc.filter(r => r[evaluatorKey].correct).length;
    perDomain[domain] = { total: dc.length, correct, accuracy: correct / dc.length };
  }

  return {
    accuracy: round2(accuracy), precision: round2(precision), recall: round2(recall),
    f1: round2(f1), fnr: round2(fnr), brierScore: round2(brierScore),
    cohensKappa: round2(cohensKappa), kappaCI95: { lower: round2(lower), upper: round2(upper) },
    avgCost: Math.round(avgCost * 1000000) / 1000000,
    avgLatency: Math.round(avgLatency),
    perDomain,
  };
}

function mcnemarTest(caseResults, key1, key2) {
  let b = 0, c = 0;
  for (const r of caseResults) {
    const c1 = r[key1].correct, c2 = r[key2].correct;
    if (c1 && !c2) b++;
    if (!c1 && c2) c++;
  }
  if (b + c === 0) return 1;
  const chiSq = Math.pow(Math.abs(b - c) - 1, 2) / (b + c);
  return chiSq > 3.84 ? 0.01 : chiSq > 2.71 ? 0.10 : 0.50;
}

// ── Evaluation helpers ──────────────────────────────────────────────────────

const noop = () => {};

async function runCouncilEval(testCase) {
  const start = Date.now();
  const judges = [
    { name: 'openai', provider: 'openai', fn: () => evaluateFaithfulness(testCase) },
    { name: 'anthropic', provider: 'anthropic', fn: () => evaluateGroundedness(testCase) },
    { name: 'gemini', provider: 'gemini', fn: () => evaluateContextRelevancy(testCase) },
  ];

  const judgeResults = {};
  const results = await Promise.allSettled(
    judges.map(async ({ name, provider, fn }) => {
      const result = await executeWithProviderResilience({
        provider,
        operation: `council_${name}`,
        run: fn,
        emitEvent: noop,
      });
      judgeResults[name] = result;
      return result;
    })
  );

  for (let i = 0; i < judges.length; i++) {
    if (results[i].status === 'rejected') {
      judgeResults[judges[i].name] = { score: null, error: results[i].reason?.message };
    }
  }

  const aggResult = await aggregateResults(testCase, judgeResults);
  return {
    judges: judgeResults,
    aggregator: aggResult,
    latency: Date.now() - start,
  };
}

async function runSingleOpenai(testCase) {
  return executeWithProviderResilience({
    provider: 'openai',
    operation: 'faithfulness_baseline',
    run: () => evaluateFaithfulness(testCase),
    emitEvent: noop,
  });
}

async function runSingleGemini(testCase) {
  return executeWithProviderResilience({
    provider: 'gemini',
    operation: 'relevancy_baseline',
    run: () => evaluateContextRelevancy(testCase),
    emitEvent: noop,
  });
}

function sumCost(councilResult) {
  const judgeCosts = Object.values(councilResult.judges || {})
    .reduce((s, j) => s + (j?.cost || 0), 0);
  return Math.round((judgeCosts + (councilResult.aggregator?.cost || 0)) * 1000000) / 1000000;
}

// ── Progress display ────────────────────────────────────────────────────────

function progressBar(current, total, startTime) {
  const pct = Math.round(current / total * 100);
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = current / elapsed;
  const remaining = rate > 0 ? Math.round((total - current) / rate) : 0;
  const eta = remaining > 3600
    ? `${Math.floor(remaining / 3600)}h${Math.floor((remaining % 3600) / 60)}m`
    : remaining > 60
      ? `${Math.floor(remaining / 60)}m${remaining % 60}s`
      : `${remaining}s`;

  const barWidth = 30;
  const filled = Math.round(barWidth * current / total);
  const bar = '#'.repeat(filled) + '-'.repeat(barWidth - filled);

  return `[${bar}] ${current}/${total} (${pct}%) ETA: ${eta}`;
}

// ── Checkpoint ──────────────────────────────────────────────────────────────

function saveCheckpoint(results, datasetPath) {
  writeFileSync(CHECKPOINT_PATH, JSON.stringify({
    datasetPath,
    processedCount: results.length,
    results,
    savedAt: new Date().toISOString(),
  }, null, 2));
}

function loadCheckpoint(datasetPath) {
  if (!existsSync(CHECKPOINT_PATH)) return null;
  try {
    const data = JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf-8'));
    if (data.datasetPath !== datasetPath) {
      console.log('  Checkpoint is for a different dataset, ignoring.');
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// ── Export ───────────────────────────────────────────────────────────────────

function exportCSV(results, path) {
  const headers = [
    'caseId', 'domain', 'difficulty', 'source', 'humanVerdict', 'failureMode',
    'councilVerdict', 'councilScore', 'councilCorrect', 'councilCost', 'councilLatency',
    'openaiVerdict', 'openaiScore', 'openaiCorrect', 'openaiCost', 'openaiLatency',
    'geminiVerdict', 'geminiScore', 'geminiCorrect', 'geminiCost', 'geminiLatency',
  ];

  const rows = results.map(r => [
    r.caseId, r.domain, r.difficulty, r.source || '', r.humanVerdict, r.failureMode,
    r.council.verdict, r.council.score, r.council.correct, r.council.cost, r.council.latency,
    r.singleOpenai.verdict, r.singleOpenai.score, r.singleOpenai.correct, r.singleOpenai.cost, r.singleOpenai.latency,
    r.singleGemini.verdict, r.singleGemini.score, r.singleGemini.correct, r.singleGemini.cost, r.singleGemini.latency,
  ].join(','));

  writeFileSync(path, [headers.join(','), ...rows].join('\n'));
}

function exportStats(caseResults, path) {
  const stats = {
    council: computeStats(caseResults, 'council'),
    singleOpenai: computeStats(caseResults, 'singleOpenai'),
    singleGemini: computeStats(caseResults, 'singleGemini'),
    totalCases: caseResults.length,
    passCases: caseResults.filter(r => r.humanVerdict === 'PASS').length,
    failCases: caseResults.filter(r => r.humanVerdict === 'FAIL').length,
  };

  stats.councilVsSingleOpenaiDelta = round2(stats.council.accuracy - stats.singleOpenai.accuracy);
  stats.councilVsSingleGeminiDelta = round2(stats.council.accuracy - stats.singleGemini.accuracy);
  stats.councilVsSingleOpenaiFnrDelta = round2(stats.singleOpenai.fnr - stats.council.fnr);
  stats.mcnemarPValueVsOpenai = mcnemarTest(caseResults, 'council', 'singleOpenai');
  stats.mcnemarPValueVsGemini = mcnemarTest(caseResults, 'council', 'singleGemini');
  stats.statisticallySignificantVsOpenai = stats.mcnemarPValueVsOpenai < 0.05;
  stats.statisticallySignificantVsGemini = stats.mcnemarPValueVsGemini < 0.05;
  stats.completedAt = new Date().toISOString();

  writeFileSync(path, JSON.stringify({ statistics: stats }, null, 2));
  return stats;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  mkdirSync(PAPER_DIR, { recursive: true });

  console.log('Quorum Benchmark Runner (CLI)');
  console.log('=============================\n');

  // Verify API keys
  const keys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'];
  for (const k of keys) {
    if (!process.env[k]) { console.error(`Missing ${k} in .env`); process.exit(1); }
  }
  console.log('API keys: OK');

  // Load dataset
  const dataset = JSON.parse(readFileSync(opts.dataset, 'utf-8'));
  const cases = dataset.slice(0, opts.limit);
  console.log(`Dataset: ${opts.dataset}`);
  console.log(`Cases: ${cases.length}${opts.limit < Infinity ? ` (limited from ${dataset.length})` : ''}`);
  console.log(`Concurrency: ${opts.concurrency} cases in parallel\n`);

  // Resume from checkpoint
  let caseResults = [];
  let startIdx = 0;
  if (opts.resume) {
    const cp = loadCheckpoint(opts.dataset);
    if (cp) {
      caseResults = cp.results;
      startIdx = cp.processedCount;
      console.log(`Resuming from checkpoint: ${startIdx} cases already processed.\n`);
    } else {
      console.log('No valid checkpoint found, starting fresh.\n');
    }
  }

  const startTime = Date.now();
  let errors = 0;
  let completed = caseResults.length;

  async function evaluateCase(tc) {
    const testCase = {
      input: tc.input,
      actualOutput: tc.actualOutput,
      retrievalContext: tc.retrievalContext,
      expectedOutput: tc.expectedOutput || null,
    };

    const [councilResult, openaiResult, geminiResult] = await Promise.all([
      runCouncilEval(testCase).catch(e => ({ error: e.message, judges: {}, aggregator: { verdict: 'ERROR', finalScore: null } })),
      runSingleOpenai(testCase).catch(e => ({ error: e.message, score: null })),
      runSingleGemini(testCase).catch(e => ({ error: e.message, score: null })),
    ]);

    const councilVerdict = councilResult.aggregator?.verdict || 'ERROR';
    const councilScore = councilResult.aggregator?.finalScore ?? null;
    const openaiScore = openaiResult?.score ?? null;
    const openaiVerdict = scoreToVerdict(openaiScore);
    const geminiScore = geminiResult?.score ?? null;
    const geminiVerdict = scoreToVerdict(geminiScore);

    const hasError = councilVerdict === 'ERROR' && openaiVerdict === 'ERROR' && geminiVerdict === 'ERROR';

    return {
      caseId: tc.id,
      domain: tc.domain,
      difficulty: tc.difficulty,
      source: tc.source || '',
      input: tc.input,
      humanVerdict: tc.humanVerdict,
      failureMode: tc.failureMode,
      council: {
        verdict: councilVerdict,
        score: councilScore,
        correct: isCorrect(councilVerdict, tc.humanVerdict),
        cost: sumCost(councilResult),
        latency: councilResult.latency || 0,
      },
      singleOpenai: {
        verdict: openaiVerdict,
        score: openaiScore,
        correct: isCorrect(openaiVerdict, tc.humanVerdict),
        cost: openaiResult?.cost || 0,
        latency: openaiResult?.latency || 0,
      },
      singleGemini: {
        verdict: geminiVerdict,
        score: geminiScore,
        correct: isCorrect(geminiVerdict, tc.humanVerdict),
        cost: geminiResult?.cost || 0,
        latency: geminiResult?.latency || 0,
      },
      _hasError: hasError,
    };
  }

  // Concurrent pool: process N cases at a time
  const poolSize = opts.concurrency;
  const remaining = cases.slice(startIdx);
  for (let batchStart = 0; batchStart < remaining.length; batchStart += poolSize) {
    const batch = remaining.slice(batchStart, batchStart + poolSize);
    const globalIdx = startIdx + batchStart;

    process.stdout.write(`\r${progressBar(completed, cases.length, startTime)} | cases ${globalIdx + 1}-${globalIdx + batch.length}...`);

    const batchResults = await Promise.allSettled(
      batch.map(tc => evaluateCase(tc))
    );

    for (let j = 0; j < batchResults.length; j++) {
      if (batchResults[j].status === 'fulfilled') {
        const result = batchResults[j].value;
        if (result._hasError) errors++;
        delete result._hasError;
        caseResults.push(result);
      } else {
        errors++;
        const tc = batch[j];
        console.log(`\n  [ERROR] Case ${globalIdx + j + 1}: ${batchResults[j].reason?.message}`);
        caseResults.push({
          caseId: tc.id, domain: tc.domain, difficulty: tc.difficulty, source: tc.source || '',
          input: tc.input, humanVerdict: tc.humanVerdict, failureMode: tc.failureMode,
          council: { verdict: 'ERROR', score: null, correct: false, cost: 0, latency: 0 },
          singleOpenai: { verdict: 'ERROR', score: null, correct: false, cost: 0, latency: 0 },
          singleGemini: { verdict: 'ERROR', score: null, correct: false, cost: 0, latency: 0 },
        });
      }
    }

    completed = caseResults.length;

    if (completed % CHECKPOINT_INTERVAL < poolSize) {
      saveCheckpoint(caseResults, opts.dataset);
    }
  }

  process.stdout.write(`\r${progressBar(cases.length, cases.length, startTime)}                              \n\n`);

  // Export results
  console.log('Exporting results...');
  const csvPath = join(PAPER_DIR, 'benchmark_results.csv');
  const statsPath = join(PAPER_DIR, 'aggregate_stats.json');
  exportCSV(caseResults, csvPath);
  const stats = exportStats(caseResults, statsPath);

  // Clean up checkpoint
  if (existsSync(CHECKPOINT_PATH)) unlinkSync(CHECKPOINT_PATH);

  // Print summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const elapsedStr = elapsed > 3600
    ? `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`
    : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  console.log(`\n=== Benchmark Complete ===`);
  console.log(`Cases: ${caseResults.length} | Errors: ${errors} | Time: ${elapsedStr}`);
  console.log(`\nCouncil:       accuracy=${stats.council.accuracy} F1=${stats.council.f1} FNR=${stats.council.fnr} cost=$${stats.council.avgCost}/case`);
  console.log(`Single OpenAI: accuracy=${stats.singleOpenai.accuracy} F1=${stats.singleOpenai.f1} FNR=${stats.singleOpenai.fnr} cost=$${stats.singleOpenai.avgCost}/case`);
  console.log(`Single Gemini: accuracy=${stats.singleGemini.accuracy} F1=${stats.singleGemini.f1} FNR=${stats.singleGemini.fnr} cost=$${stats.singleGemini.avgCost}/case`);
  console.log(`\nDelta (council - OpenAI):  ${stats.councilVsSingleOpenaiDelta > 0 ? '+' : ''}${stats.councilVsSingleOpenaiDelta}`);
  console.log(`Delta (council - Gemini):  ${stats.councilVsSingleGeminiDelta > 0 ? '+' : ''}${stats.councilVsSingleGeminiDelta}`);
  console.log(`McNemar vs OpenAI: p=${stats.mcnemarPValueVsOpenai} ${stats.statisticallySignificantVsOpenai ? '(significant)' : '(not significant)'}`);
  console.log(`McNemar vs Gemini: p=${stats.mcnemarPValueVsGemini} ${stats.statisticallySignificantVsGemini ? '(significant)' : '(not significant)'}`);
  console.log(`\nResults: ${csvPath}`);
  console.log(`Stats:   ${statsPath}`);
  console.log(`\nDone. Run: python paper/analysis/generate_figures.py`);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
