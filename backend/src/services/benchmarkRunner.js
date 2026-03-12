import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { nanoid } from 'nanoid';
import { evaluateFaithfulness } from './judges/openai.js';
import { evaluateContextRelevancy } from './judges/gemini.js';
import { evaluateTestCase } from './orchestrator.js';
import { BenchmarkRun } from '../models/BenchmarkRun.js';
import { sseManager } from '../utils/sse.js';
import { executeWithProviderResilience } from './providerResilience.js';
import { logger } from '../utils/logger.js';
import { submitAll } from './batchSubmitter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET_PATH = join(__dirname, '../../data/benchmark_dataset.json');
const DATASET_MINI_PATH = join(__dirname, '../../data/benchmark_mini.json');
const DATASET_VERSION = '2.0';
const DATASET_MINI_VERSION = '2.0-mini';

export function loadDataset(mini = false) {
  const raw = readFileSync(mini ? DATASET_MINI_PATH : DATASET_PATH, 'utf-8');
  return JSON.parse(raw);
}

function scoreToVerdict(score) {
  if (score === null || score === undefined) return 'ERROR';
  if (score >= 0.7) return 'PASS';
  if (score >= 0.4) return 'WARN';
  return 'FAIL';
}

function isCorrect(evaluatorVerdict, humanVerdict) {
  const predicted = evaluatorVerdict === 'PASS' ? 'PASS' : 'FAIL';
  return predicted === humanVerdict;
}

function computeStats(caseResults, evaluatorKey) {
  const predictions = caseResults.map(r => r[evaluatorKey].verdict === 'PASS' ? 'PASS' : 'FAIL');
  const ground = caseResults.map(r => r.humanVerdict);

  const tp = predictions.filter((p, i) => p === 'PASS' && ground[i] === 'PASS').length;
  const tn = predictions.filter((p, i) => p === 'FAIL' && ground[i] === 'FAIL').length;
  const fp = predictions.filter((p, i) => p === 'PASS' && ground[i] === 'FAIL').length;
  const fn = predictions.filter((p, i) => p === 'FAIL' && ground[i] === 'PASS').length;

  const n = caseResults.length;
  const accuracy = (tp + tn) / n;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

  // FNR: of all human FAIL cases, how many did we miss (said PASS)?
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
    perDomain[domain] = {
      total: dc.length,
      correct,
      accuracy: correct / dc.length,
    };
  }

  return {
    accuracy: round2(accuracy),
    precision: round2(precision),
    recall: round2(recall),
    f1: round2(f1),
    fnr: round2(fnr),
    brierScore: round2(brierScore),
    cohensKappa: round2(cohensKappa),
    kappaCI95: { lower: round2(lower), upper: round2(upper) },
    avgCost: Math.round(avgCost * 1000000) / 1000000,
    avgLatency: Math.round(avgLatency),
    perDomain,
  };
}

function mcnemarTest(caseResults, key1, key2) {
  let b = 0;
  let c = 0;
  for (const r of caseResults) {
    const c1 = r[key1].correct;
    const c2 = r[key2].correct;
    if (c1 && !c2) b++;
    if (!c1 && c2) c++;
  }
  if (b + c === 0) return 1;
  const chiSquared = Math.pow(Math.abs(b - c) - 1, 2) / (b + c);
  return chiSquared > 3.84 ? 0.01 : chiSquared > 2.71 ? 0.10 : 0.50;
}

function wilsonCI95(successes, total) {
  if (total === 0) return { lower: 0, upper: 1 };
  const z = 1.96;
  const p = successes / total;
  const denom = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denom;
  const margin = (z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total))) / denom;
  return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function emit(runId, type, data) {
  sseManager.emit(runId, type, data);
}

async function saveEvent(run, type, data) {
  const ev = { type, data, timestamp: new Date() };
  run.events.push(ev);
  await BenchmarkRun.updateOne({ runId: run.runId }, { $push: { events: ev } }).catch(() => {});
}

export async function startBenchmarkRun(userId, userKeys = {}, mini = false, useBatch = false) {
  const dataset = loadDataset(mini);
  const runId = nanoid(12);
  const version = mini ? DATASET_MINI_VERSION : DATASET_VERSION;

  const startEvent = {
    type: 'benchmark_start',
    data: { runId, totalCases: dataset.length, datasetVersion: version, timestamp: new Date().toISOString() },
    timestamp: new Date(),
  };

  const run = new BenchmarkRun({
    runId,
    userId,
    status: useBatch ? 'submitting' : 'processing',
    datasetVersion: version,
    totalCases: dataset.length,
    results: [],
    events: [startEvent],
  });
  await run.save();

  if (useBatch) {
    submitBatchRun(run, dataset, version).catch(async (err) => {
      logger.error('benchmark.batch.submit_failed', { metadata: { runId, message: err.message } });
      await BenchmarkRun.updateOne({ runId }, { $set: { status: 'failed', completedAt: new Date() } }).catch(() => {});
      emit(runId, 'benchmark_error', { error: err.message, timestamp: new Date().toISOString() });
    });
  } else {
    runBenchmark(run, dataset, userKeys, version).catch(async (err) => {
      logger.error('benchmark.run.failed', { metadata: { runId, message: err.message } });
      await BenchmarkRun.updateOne({ runId }, { $set: { status: 'failed', completedAt: new Date() } }).catch(() => {});
      emit(runId, 'benchmark_error', { error: err.message, timestamp: new Date().toISOString() });
    });
  }

  return runId;
}

async function submitBatchRun(run, dataset, version) {
  const { runId } = run;
  emit(runId, 'benchmark_start', {
    runId,
    totalCases: dataset.length,
    datasetVersion: version,
    timestamp: new Date().toISOString(),
  });

  emit(runId, 'benchmark_batch_submitting', { runId, timestamp: new Date().toISOString() });

  const { openaiId, anthropicId, geminiId } = await submitAll(dataset);

  await BenchmarkRun.updateOne({ runId }, {
    $set: {
      status: 'polling',
      batchIds: { openai: openaiId, anthropic: anthropicId, gemini: geminiId },
      batchStatus: { openai: 'pending', anthropic: 'pending', gemini: 'pending' },
      dataset,
    },
  });

  emit(runId, 'benchmark_batches_submitted', {
    runId,
    batchIds: { openai: openaiId, anthropic: anthropicId, gemini: geminiId },
    timestamp: new Date().toISOString(),
  });
}

async function runBenchmark(run, dataset, userKeys, version) {
  const { runId } = run;
  emit(runId, 'benchmark_start', {
    runId,
    totalCases: dataset.length,
    datasetVersion: version,
    timestamp: new Date().toISOString(),
  });
  await saveEvent(run, 'benchmark_start', { runId, totalCases: dataset.length });

  const caseResults = [];

  for (let i = 0; i < dataset.length; i++) {
    const tc = dataset[i];
    emit(runId, 'benchmark_case_start', {
      runId,
      caseIndex: i,
      total: dataset.length,
      caseId: tc.id,
      domain: tc.domain,
      timestamp: new Date().toISOString(),
    });

    const testCase = {
      input: tc.input,
      actualOutput: tc.actualOutput,
      retrievalContext: tc.retrievalContext,
      expectedOutput: tc.expectedOutput || null,
    };

    const councilResult = await Promise.allSettled([runCouncilEval(testCase, userKeys)]).then(r => r[0]);
    const openaiResult = await Promise.allSettled([runSingleOpenai(testCase, userKeys.openai)]).then(r => r[0]);
    const geminiResult = await Promise.allSettled([runSingleGemini(testCase, userKeys.google)]).then(r => r[0]);

    const councilVerdict = councilResult.status === 'fulfilled'
      ? (councilResult.value.aggregator?.verdict || 'ERROR')
      : 'ERROR';
    const councilScore = councilResult.status === 'fulfilled'
      ? (councilResult.value.aggregator?.finalScore ?? null)
      : null;
    const councilCost = councilResult.status === 'fulfilled' ? sumCost(councilResult.value) : 0;
    const councilLatency = councilResult.status === 'fulfilled' ? (councilResult.value.latency || 0) : 0;

    const openaiScore = openaiResult.status === 'fulfilled' ? openaiResult.value.score : null;
    const openaiVerdict = scoreToVerdict(openaiScore);
    const openaiCost = openaiResult.status === 'fulfilled' ? (openaiResult.value.cost || 0) : 0;
    const openaiLatency = openaiResult.status === 'fulfilled' ? (openaiResult.value.latency || 0) : 0;

    const geminiScore = geminiResult.status === 'fulfilled' ? geminiResult.value.score : null;
    const geminiVerdict = scoreToVerdict(geminiScore);
    const geminiCost = geminiResult.status === 'fulfilled' ? (geminiResult.value.cost || 0) : 0;
    const geminiLatency = geminiResult.status === 'fulfilled' ? (geminiResult.value.latency || 0) : 0;

    const caseResult = {
      caseId: tc.id,
      domain: tc.domain,
      difficulty: tc.difficulty,
      input: tc.input,
      humanVerdict: tc.humanVerdict,
      failureMode: tc.failureMode,
      council: {
        verdict: councilVerdict,
        score: councilScore,
        correct: isCorrect(councilVerdict, tc.humanVerdict),
        cost: councilCost,
        latency: councilLatency,
      },
      singleOpenai: {
        verdict: openaiVerdict,
        score: openaiScore,
        correct: isCorrect(openaiVerdict, tc.humanVerdict),
        cost: openaiCost,
        latency: openaiLatency,
      },
      singleGemini: {
        verdict: geminiVerdict,
        score: geminiScore,
        correct: isCorrect(geminiVerdict, tc.humanVerdict),
        cost: geminiCost,
        latency: geminiLatency,
      },
    };

    caseResults.push(caseResult);
    run.results.push(caseResult);
    run.processedCases = i + 1;

    emit(runId, 'benchmark_case_complete', {
      runId,
      caseIndex: i,
      total: dataset.length,
      caseId: tc.id,
      domain: tc.domain,
      humanVerdict: tc.humanVerdict,
      councilVerdict,
      singleOpenaiVerdict: openaiVerdict,
      singleGeminiVerdict: geminiVerdict,
      councilCorrect: caseResult.council.correct,
      singleOpenaiCorrect: caseResult.singleOpenai.correct,
      singleGeminiCorrect: caseResult.singleGemini.correct,
      timestamp: new Date().toISOString(),
    });

    if (i % 5 === 0 || i === dataset.length - 1) {
      await BenchmarkRun.updateOne({ runId }, {
        $set: { results: run.results, processedCases: run.processedCases },
      });
    }

    if (i < dataset.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  const stats = {
    council: computeStats(caseResults, 'council'),
    singleOpenai: computeStats(caseResults, 'singleOpenai'),
    singleGemini: computeStats(caseResults, 'singleGemini'),
    totalCases: caseResults.length,
    passCases: caseResults.filter(r => r.humanVerdict === 'PASS').length,
    failCases: caseResults.filter(r => r.humanVerdict === 'FAIL').length,
  };

  const councilAcc = stats.council.accuracy;
  const openaiAcc = stats.singleOpenai.accuracy;
  const geminiAcc = stats.singleGemini.accuracy;

  stats.councilVsSingleOpenaiDelta = round2(councilAcc - openaiAcc);
  stats.councilVsSingleGeminiDelta = round2(councilAcc - geminiAcc);
  stats.councilVsSingleOpenaiFnrDelta = round2(stats.singleOpenai.fnr - stats.council.fnr);

  const pValueVsOpenai = mcnemarTest(caseResults, 'council', 'singleOpenai');
  const pValueVsGemini = mcnemarTest(caseResults, 'council', 'singleGemini');
  stats.mcnemarPValueVsOpenai = pValueVsOpenai;
  stats.mcnemarPValueVsGemini = pValueVsGemini;
  stats.statisticallySignificantVsOpenai = pValueVsOpenai < 0.05;
  stats.statisticallySignificantVsGemini = pValueVsGemini < 0.05;

  await BenchmarkRun.updateOne({ runId }, {
    $set: {
      status: 'complete',
      statistics: stats,
      completedAt: new Date(),
      results: run.results,
      processedCases: caseResults.length,
    },
  });

  emit(runId, 'benchmark_complete', {
    runId,
    statistics: stats,
    timestamp: new Date().toISOString(),
  });

  logger.audit('benchmark.completed', {
    actor: 'system',
    metadata: {
      runId,
      userId: run.userId,
      councilAccuracy: stats.council.accuracy,
      councilFnr: stats.council.fnr,
      singleOpenaiAccuracy: stats.singleOpenai.accuracy,
      singleOpenaiFnr: stats.singleOpenai.fnr,
      delta: stats.councilVsSingleOpenaiDelta,
      fnrDelta: stats.councilVsSingleOpenaiFnrDelta,
    },
  });
}

async function runCouncilEval(testCase, userKeys) {
  const noop = () => {};
  const start = Date.now();
  const result = await evaluateTestCase(testCase, 0, noop, noop, userKeys);
  result.latency = Date.now() - start;
  return result;
}

async function runSingleOpenai(testCase, apiKey) {
  return executeWithProviderResilience({
    provider: 'openai',
    operation: 'faithfulness_baseline',
    run: () => evaluateFaithfulness(testCase, apiKey),
  });
}

async function runSingleGemini(testCase, apiKey) {
  return executeWithProviderResilience({
    provider: 'gemini',
    operation: 'relevancy_baseline',
    run: () => evaluateContextRelevancy(testCase, apiKey),
  });
}

function sumCost(councilResult) {
  const judgeCosts = Object.values(councilResult.judges || {})
    .reduce((s, j) => s + (j?.cost || 0), 0);
  return Math.round((judgeCosts + (councilResult.aggregator?.cost || 0)) * 1000000) / 1000000;
}
