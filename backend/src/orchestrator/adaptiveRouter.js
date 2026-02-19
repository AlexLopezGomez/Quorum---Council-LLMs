import { scoreRisk } from './riskScorer.js';
import { runDeterministicChecks } from '../evaluators/deterministicChecks.js';
import { evaluateFaithfulness } from '../services/judges/openai.js';
import { evaluateContextRelevancy } from '../services/judges/gemini.js';
import { evaluateTestCase } from '../services/orchestrator.js';
import { logger } from '../utils/logger.js';

const EVALUATION_TIMEOUT = parseInt(process.env.EVALUATION_TIMEOUT) || 30000;
const HIGH_THRESHOLD = parseFloat(process.env.RISK_HIGH_THRESHOLD) || 0.8;
const LOW_THRESHOLD = parseFloat(process.env.RISK_LOW_THRESHOLD) || 0.4;

function selectStrategy(riskScore) {
  if (riskScore >= HIGH_THRESHOLD) return 'council';
  if (riskScore >= LOW_THRESHOLD) return 'hybrid';
  return 'single';
}

function getActiveJudges(strategy) {
  switch (strategy) {
    case 'council': return ['openai', 'anthropic', 'gemini'];
    case 'hybrid': return ['openai'];
    case 'single': return ['gemini'];
    default: return ['openai', 'anthropic', 'gemini'];
  }
}

// ~0.0001 per gpt-4o-mini call, ~0.00004 per gemini-1.5-flash, ~0.003 per claude-sonnet aggregator
function estimateCost(strategy) {
  switch (strategy) {
    case 'council': return 0.0035;
    case 'hybrid': return 0.0002;
    case 'single': return 0.00005;
    default: return 0.0035;
  }
}

async function runJudgeWithTimeout(name, judgeFn, testCase) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${name} judge timed out after ${EVALUATION_TIMEOUT}ms`)), EVALUATION_TIMEOUT);
  });
  return Promise.race([judgeFn(testCase), timeoutPromise]);
}

function computeHybridVerdict(deterministicResults, judgeResult) {
  const detChecks = deterministicResults.checks;
  const allDetPass = Object.values(detChecks).every(c => c.score >= 0.5);
  const anyDetFail = Object.values(detChecks).some(c => c.score < 0.5);
  const judgeScore = judgeResult?.score ?? 0;

  if (allDetPass && judgeScore >= 0.7) return 'PASS';
  if (anyDetFail || judgeScore < 0.4) return 'FAIL';
  return 'WARN';
}

function computeHybridScore(deterministicResults, judgeResult) {
  const detWeight = 0.3;
  const judgeWeight = 0.7;
  const detAvg = deterministicResults.avgScore;
  const judgeScore = judgeResult?.score ?? 0;
  return Math.round((detAvg * detWeight + judgeScore * judgeWeight) * 100) / 100;
}

async function runSingleStrategy(testCase, testCaseIndex, emitAndSave, costTracker) {
  const result = {
    testCaseIndex,
    judges: {},
    aggregator: null,
    strategy: 'single',
  };

  emitAndSave('judge_start', { judge: 'gemini', metric: 'contextRelevancy', testCaseIndex, timestamp: new Date().toISOString() });

  try {
    const geminiResult = await runJudgeWithTimeout('gemini', evaluateContextRelevancy, testCase);
    result.judges.gemini = geminiResult;
    emitAndSave('judge_complete', { judge: 'gemini', metric: 'contextRelevancy', testCaseIndex, result: geminiResult, timestamp: new Date().toISOString() });

    if (costTracker) {
      costTracker.log({ testCaseIndex, strategy: 'single', component: 'judge', model: geminiResult.model, tokens: geminiResult.tokens?.total || 0, cost: geminiResult.cost || 0 });
    }

    result.aggregator = {
      model: 'local',
      finalScore: geminiResult.score,
      verdict: geminiResult.score >= 0.7 ? 'PASS' : geminiResult.score >= 0.4 ? 'WARN' : 'FAIL',
      synthesis: `Single-judge evaluation (Gemini/Context Relevancy): ${geminiResult.reason}`,
      disagreements: [],
      recommendation: geminiResult.reason,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      latency: 0,
    };
  } catch (error) {
    result.judges.gemini = { judge: 'gemini', metric: 'contextRelevancy', error: error.message, score: null };
    emitAndSave('judge_error', { judge: 'gemini', metric: 'contextRelevancy', testCaseIndex, error: error.message, timestamp: new Date().toISOString() });
    result.aggregator = { error: error.message, finalScore: null, verdict: 'ERROR' };
  }

  emitAndSave('aggregator_start', { testCaseIndex, judgeCount: 1, timestamp: new Date().toISOString() });
  emitAndSave('aggregator_complete', { testCaseIndex, result: result.aggregator, timestamp: new Date().toISOString() });

  return result;
}

async function runHybridStrategy(testCase, testCaseIndex, emitAndSave, costTracker) {
  const result = {
    testCaseIndex,
    judges: {},
    aggregator: null,
    strategy: 'hybrid',
    deterministicChecks: null,
  };

  // Run deterministic checks
  emitAndSave('deterministic_start', { testCaseIndex, checks: ['entityMatch', 'freshness', 'contextOverlap', 'completeness'], timestamp: new Date().toISOString() });
  const detResults = runDeterministicChecks(testCase);
  result.deterministicChecks = detResults;
  emitAndSave('deterministic_complete', { testCaseIndex, results: detResults.checks, avgScore: detResults.avgScore, timestamp: new Date().toISOString() });

  // Run OpenAI faithfulness judge
  emitAndSave('judge_start', { judge: 'openai', metric: 'faithfulness', testCaseIndex, timestamp: new Date().toISOString() });

  try {
    const openaiResult = await runJudgeWithTimeout('openai', evaluateFaithfulness, testCase);
    result.judges.openai = openaiResult;
    emitAndSave('judge_complete', { judge: 'openai', metric: 'faithfulness', testCaseIndex, result: openaiResult, timestamp: new Date().toISOString() });

    if (costTracker) {
      costTracker.log({ testCaseIndex, strategy: 'hybrid', component: 'judge', model: openaiResult.model, tokens: openaiResult.tokens?.total || 0, cost: openaiResult.cost || 0 });
    }

    const finalScore = computeHybridScore(detResults, openaiResult);
    const verdict = computeHybridVerdict(detResults, openaiResult);

    result.aggregator = {
      model: 'local-hybrid',
      finalScore,
      verdict,
      synthesis: `Hybrid evaluation: deterministic avg ${detResults.avgScore}, faithfulness ${openaiResult.score}. ${openaiResult.reason}`,
      disagreements: [],
      recommendation: openaiResult.reason,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      latency: 0,
    };
  } catch (error) {
    result.judges.openai = { judge: 'openai', metric: 'faithfulness', error: error.message, score: null };
    emitAndSave('judge_error', { judge: 'openai', metric: 'faithfulness', testCaseIndex, error: error.message, timestamp: new Date().toISOString() });
    result.aggregator = { error: error.message, finalScore: null, verdict: 'ERROR' };
  }

  emitAndSave('aggregator_start', { testCaseIndex, judgeCount: 1, timestamp: new Date().toISOString() });
  emitAndSave('aggregator_complete', { testCaseIndex, result: result.aggregator, timestamp: new Date().toISOString() });

  return result;
}

export async function routeTestCase(testCase, testCaseIndex, emitEvent, saveEvent, costTracker, options = {}) {
  const emitAndSave = (event, data) => {
    emitEvent(event, data);
    saveEvent(event, data);
  };

  // Determine strategy
  let strategy = options.strategy || 'auto';
  let riskScore = null;
  let riskFactors = [];

  if (strategy === 'auto') {
    const riskResult = options.riskOverride !== undefined
      ? { riskScore: options.riskOverride, factors: ['manual_override'] }
      : scoreRisk(testCase);

    riskScore = riskResult.riskScore;
    riskFactors = riskResult.factors;
    strategy = selectStrategy(riskScore);

    emitAndSave('risk_scored', {
      testCaseIndex,
      riskScore,
      riskFactors,
      selectedStrategy: strategy,
      timestamp: new Date().toISOString(),
    });
    logger.info('evaluation.risk.scored', {
      metadata: {
        testCaseIndex,
        riskScore,
        selectedStrategy: strategy,
      },
    });
  }

  const activeJudges = getActiveJudges(strategy);

  emitAndSave('strategy_selected', {
    testCaseIndex,
    strategy,
    reason: riskScore !== null ? `Risk score: ${riskScore}` : `Manual override: ${strategy}`,
    estimatedCost: estimateCost(strategy),
    activeJudges,
    timestamp: new Date().toISOString(),
  });
  logger.info('evaluation.strategy.selected', {
    metadata: {
      testCaseIndex,
      strategy,
      activeJudges,
      riskScore,
    },
  });

  let result;

  switch (strategy) {
    case 'council':
      result = await evaluateTestCase(testCase, testCaseIndex, emitEvent, saveEvent);
      result.strategy = 'council';
      // Track council costs
      if (costTracker) {
        for (const [judgeName, judgeResult] of Object.entries(result.judges)) {
          if (judgeResult?.cost) {
            costTracker.log({ testCaseIndex, strategy: 'council', component: 'judge', model: judgeResult.model, tokens: judgeResult.tokens?.total || 0, cost: judgeResult.cost });
          }
        }
        if (result.aggregator?.cost) {
          costTracker.log({ testCaseIndex, strategy: 'council', component: 'aggregator', model: result.aggregator.model, tokens: result.aggregator.tokens?.total || 0, cost: result.aggregator.cost });
        }
      }
      break;

    case 'hybrid':
      result = await runHybridStrategy(testCase, testCaseIndex, emitAndSave, costTracker);
      break;

    case 'single':
      result = await runSingleStrategy(testCase, testCaseIndex, emitAndSave, costTracker);
      break;

    default:
      result = await evaluateTestCase(testCase, testCaseIndex, emitEvent, saveEvent);
      result.strategy = 'council';
      break;
  }

  // Attach risk metadata
  if (riskScore !== null) {
    result.riskScore = riskScore;
    result.riskFactors = riskFactors;
  }

  // Calculate per-test-case cost
  const judgeCosts = Object.values(result.judges).filter(j => j?.cost).reduce((sum, j) => sum + j.cost, 0);
  const aggregatorCost = result.aggregator?.cost || 0;
  result.strategyCost = Math.round((judgeCosts + aggregatorCost) * 1000000) / 1000000;
  logger.info('evaluation.strategy.completed', {
    metadata: {
      testCaseIndex,
      strategy,
      strategyCost: result.strategyCost,
      verdict: result.aggregator?.verdict || 'ERROR',
    },
  });

  return result;
}
