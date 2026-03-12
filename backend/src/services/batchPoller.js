import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { BenchmarkRun } from '../models/BenchmarkRun.js';
import { aggregateResults } from './aggregator.js';
import { sseManager } from '../utils/sse.js';
import { logger } from '../utils/logger.js';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const OPENAI_INPUT_COST_PER_1K = 0.00015;
const OPENAI_OUTPUT_COST_PER_1K = 0.0006;
const ANTHROPIC_INPUT_COST_PER_1K = 0.00025;
const ANTHROPIC_OUTPUT_COST_PER_1K = 0.00125;

let intervalHandle = null;

export function start() {
  if (intervalHandle) return;
  intervalHandle = setInterval(checkPendingRuns, POLL_INTERVAL_MS);
  // Also run immediately on start
  checkPendingRuns().catch(err => logger.error('batchPoller.immediate_check_failed', { metadata: { message: err.message } }));
}

export function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

async function checkPendingRuns() {
  try {
    const runs = await BenchmarkRun.find({ status: 'polling' }).select('+dataset').lean();
    for (const run of runs) {
      processRun(run).catch(err =>
        logger.error('batchPoller.run_failed', { metadata: { runId: run.runId, message: err.message } })
      );
    }
  } catch (err) {
    logger.error('batchPoller.check_failed', { metadata: { message: err.message } });
  }
}

async function processRun(run) {
  const { runId, batchIds } = run;

  const openaiDone = await checkOpenAIBatch(runId, batchIds.openai);
  const anthropicDone = await checkAnthropicBatch(runId, batchIds.anthropic);

  if (!openaiDone || !anthropicDone) return;

  await BenchmarkRun.updateOne({ runId }, { $set: { status: 'aggregating' } });
  sseManager.emit(runId, 'benchmark_aggregating', { runId, timestamp: new Date().toISOString() });

  try {
    const [openaiResults, anthropicResults] = await Promise.all([
      fetchOpenAIResults(batchIds.openai),
      fetchAnthropicResults(batchIds.anthropic),
    ]);

    await aggregateBatchResults(run, openaiResults, anthropicResults);
  } catch (err) {
    logger.error('batchPoller.aggregation_failed', { metadata: { runId, message: err.message } });
    await BenchmarkRun.updateOne({ runId }, { $set: { status: 'failed', completedAt: new Date() } });
    sseManager.emit(runId, 'benchmark_error', { error: err.message, timestamp: new Date().toISOString() });
  }
}

async function checkOpenAIBatch(runId, batchId) {
  if (!batchId) return true; // no batch submitted for this provider

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const batch = await client.batches.retrieve(batchId);

  await BenchmarkRun.updateOne(
    { runId },
    { $set: { 'batchStatus.openai': batch.status === 'completed' ? 'complete' : batch.status === 'failed' ? 'failed' : 'pending' } }
  );

  return batch.status === 'completed';
}

async function checkAnthropicBatch(runId, batchId) {
  if (!batchId) return true;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const batch = await client.beta.messages.batches.retrieve(batchId);

  const done = batch.processing_status === 'ended';
  await BenchmarkRun.updateOne(
    { runId },
    { $set: { 'batchStatus.anthropic': done ? 'complete' : 'pending' } }
  );

  return done;
}

async function fetchOpenAIResults(batchId) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const batch = await client.batches.retrieve(batchId);
  const fileContent = await client.files.content(batch.output_file_id);
  const text = await fileContent.text();

  const results = {};
  for (const line of text.trim().split('\n')) {
    if (!line) continue;
    const row = JSON.parse(line);
    const customId = row.custom_id; // e.g. "case-001::faithfulness"
    const caseId = customId.split('::')[0];
    const content = row.response?.body?.choices?.[0]?.message?.content || '';
    const usage = row.response?.body?.usage || {};

    let parsed = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch { /* skip malformed */ }

    const cost = (usage.prompt_tokens / 1000) * OPENAI_INPUT_COST_PER_1K
      + (usage.completion_tokens / 1000) * OPENAI_OUTPUT_COST_PER_1K;

    results[caseId] = {
      score: parsed?.score ?? null,
      reasoning: parsed?.reasoning ?? '',
      hallucinations: parsed?.hallucinations ?? [],
      confidence: parsed?.confidence ?? 'low',
      reason: parsed?.reason ?? '',
      details: parsed?.details ?? {},
      tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 },
      cost: Math.round(cost * 1000000) / 1000000,
    };
  }

  return results;
}

async function fetchAnthropicResults(batchId) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results = {};

  for await (const result of await client.beta.messages.batches.results(batchId)) {
    const caseId = result.custom_id.split('::')[0];
    const content = result.result?.message?.content?.[0]?.text || '';
    const usage = result.result?.message?.usage || {};

    let parsed = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch { /* skip malformed */ }

    const cost = (usage.input_tokens / 1000) * ANTHROPIC_INPUT_COST_PER_1K
      + (usage.output_tokens / 1000) * ANTHROPIC_OUTPUT_COST_PER_1K;

    results[caseId] = {
      score: parsed?.score ?? null,
      reasoning: parsed?.reasoning ?? '',
      hallucinations: parsed?.hallucinations ?? [],
      confidence: parsed?.confidence ?? 'low',
      reason: parsed?.reason ?? '',
      details: parsed?.details ?? {},
      tokens: { input: usage.input_tokens || 0, output: usage.output_tokens || 0 },
      cost: Math.round(cost * 1000000) / 1000000,
    };
  }

  return results;
}

async function aggregateBatchResults(run, openaiResults, anthropicResults) {
  const { runId, dataset } = run;
  const caseResults = [];
  let processedCases = 0;

  for (const tc of dataset) {
    const openaiResult = openaiResults[tc.id] || { error: 'missing', score: null };
    const anthropicResult = anthropicResults[tc.id] || { error: 'missing', score: null };

    const judgeResults = {
      openai: openaiResult,
      anthropic: anthropicResult,
      gemini: null,
    };

    const scores = [openaiResult.score, anthropicResult.score].filter(s => s != null);
    const scoreRange = scores.length >= 2 ? Math.max(...scores) - Math.min(...scores) : 0;

    let aggregatorResult;
    if (scoreRange > 0.3 || scores.some(s => s < 0.4)) {
      // Discordant or risky case — run Sonnet aggregation
      try {
        aggregatorResult = await aggregateResults(tc, judgeResults);
      } catch {
        aggregatorResult = buildLocalAggregation(judgeResults);
      }
    } else {
      aggregatorResult = buildLocalAggregation(judgeResults);
    }

    processedCases++;
    sseManager.emit(runId, 'benchmark_case_complete', {
      runId,
      caseIndex: processedCases - 1,
      total: dataset.length,
      caseId: tc.id,
      domain: tc.domain,
      humanVerdict: tc.humanVerdict,
      councilVerdict: aggregatorResult.verdict,
      singleOpenaiVerdict: scoreToVerdict(openaiResult.score),
      timestamp: new Date().toISOString(),
    });

    caseResults.push({
      caseId: tc.id,
      domain: tc.domain,
      difficulty: tc.difficulty,
      input: tc.input,
      humanVerdict: tc.humanVerdict,
      failureMode: tc.failureMode,
      council: {
        verdict: aggregatorResult.verdict,
        score: aggregatorResult.finalScore,
        correct: isCorrect(aggregatorResult.verdict, tc.humanVerdict),
        cost: (openaiResult.cost || 0) + (anthropicResult.cost || 0) + (aggregatorResult.cost || 0),
        latency: aggregatorResult.latency || 0,
      },
      singleOpenai: {
        verdict: scoreToVerdict(openaiResult.score),
        score: openaiResult.score,
        correct: isCorrect(scoreToVerdict(openaiResult.score), tc.humanVerdict),
        cost: openaiResult.cost || 0,
        latency: 0,
      },
      singleGemini: {
        verdict: 'ERROR',
        score: null,
        correct: false,
        cost: 0,
        latency: 0,
      },
    });
  }

  const stats = computeAllStats(caseResults);

  await BenchmarkRun.updateOne({ runId }, {
    $set: {
      status: 'complete',
      statistics: stats,
      completedAt: new Date(),
      results: caseResults,
      processedCases: caseResults.length,
    },
  });

  sseManager.emit(runId, 'benchmark_complete', {
    runId,
    statistics: stats,
    timestamp: new Date().toISOString(),
  });

  logger.audit('benchmark.batch.completed', {
    actor: 'system',
    metadata: { runId, totalCases: caseResults.length },
  });
}

function buildLocalAggregation(judgeResults) {
  const scores = [judgeResults.openai?.score, judgeResults.anthropic?.score].filter(s => s != null);
  if (scores.length === 0) return { verdict: 'ERROR', finalScore: null, cost: 0, latency: 0 };

  const min = Math.min(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const finalScore = Math.round((0.6 * min + 0.4 * avg) * 1000000) / 1000000;

  let verdict;
  if (scores.some(s => s < 0.4)) verdict = 'FAIL';
  else if (scores.every(s => s >= 0.7)) verdict = 'PASS';
  else verdict = 'WARN';

  return { verdict, finalScore, cost: 0, latency: 0 };
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

function round2(n) {
  return Math.round(n * 100) / 100;
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

  // FNR = cases where system said PASS but human said FAIL / all human FAIL cases
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

  // Brier score: mean((score - label)^2) where label=1 for PASS, 0 for FAIL
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

function computeAllStats(caseResults) {
  const councilStats = computeStats(caseResults, 'council');
  const openaiStats = computeStats(caseResults, 'singleOpenai');

  const pValueVsOpenai = mcnemarTest(caseResults, 'council', 'singleOpenai');

  return {
    council: councilStats,
    singleOpenai: openaiStats,
    councilVsSingleOpenaiDelta: round2(councilStats.accuracy - openaiStats.accuracy),
    councilVsSingleOpenaiFnrDelta: round2(openaiStats.fnr - councilStats.fnr),
    mcnemarPValueVsOpenai: pValueVsOpenai,
    statisticallySignificantVsOpenai: pValueVsOpenai < 0.05,
    totalCases: caseResults.length,
    passCases: caseResults.filter(r => r.humanVerdict === 'PASS').length,
    failCases: caseResults.filter(r => r.humanVerdict === 'FAIL').length,
  };
}
