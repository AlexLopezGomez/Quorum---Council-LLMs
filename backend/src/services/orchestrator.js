import { evaluateFaithfulness } from './judges/openai.js';
import { evaluateGroundedness } from './judges/anthropic.js';
import { evaluateContextRelevancy } from './judges/gemini.js';
import { aggregateResults } from './aggregator.js';
import { routeTestCase } from '../orchestrator/adaptiveRouter.js';
import { CostTracker } from './costTracker.js';
import { fireWebhooks } from './webhookService.js';
import { executeWithProviderResilience } from './providerResilience.js';
import { logger } from '../utils/logger.js';

const EVALUATION_TIMEOUT = parseInt(process.env.EVALUATION_TIMEOUT) || 30000;
const ADAPTIVE_MODE = process.env.ADAPTIVE_MODE !== 'false';

async function runJudgeWithTimeout(name, judgeFn, testCase, timeout) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${name} judge timed out after ${timeout}ms`)), timeout);
  });

  return Promise.race([judgeFn(testCase), timeoutPromise]);
}

export async function evaluateTestCase(testCase, testCaseIndex, emitEvent, saveEvent, userKeys = {}) {
  const results = {
    testCaseIndex,
    judges: {},
    aggregator: null,
  };

  const judges = [
    { name: 'openai', provider: 'openai', fn: (tc) => evaluateFaithfulness(tc, userKeys.openai), metric: 'faithfulness' },
    { name: 'anthropic', provider: 'anthropic', fn: (tc) => evaluateGroundedness(tc, userKeys.anthropic), metric: 'groundedness' },
    { name: 'gemini', provider: 'gemini', fn: (tc) => evaluateContextRelevancy(tc, userKeys.google), metric: 'contextRelevancy' },
  ];

  const emitAndSave = (event, data) => {
    emitEvent(event, data);
    saveEvent(event, data);
  };
  logger.info('orchestrator.testcase.start', {
    metadata: {
      testCaseIndex,
      strategy: 'council',
    },
  });

  const judgePromises = judges.map(async ({ name, provider, fn, metric }) => {
    emitAndSave('judge_start', {
      judge: name,
      metric,
      testCaseIndex,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await executeWithProviderResilience({
        provider,
        operation: metric,
        run: () => runJudgeWithTimeout(name, fn, testCase, EVALUATION_TIMEOUT),
        emitEvent: emitAndSave,
        context: { judge: name, metric, testCaseIndex },
      });
      results.judges[name] = result;

      emitAndSave('judge_complete', {
        judge: name,
        metric,
        testCaseIndex,
        result,
        timestamp: new Date().toISOString(),
      });

      return { status: 'fulfilled', name, result };
    } catch (error) {
      const errorResult = {
        judge: name,
        metric,
        error: error.message,
        score: null,
      };
      results.judges[name] = errorResult;

      emitAndSave('judge_error', {
        judge: name,
        metric,
        testCaseIndex,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return { status: 'rejected', name, error: error.message };
    }
  });

  await Promise.allSettled(judgePromises);

  const successfulJudges = Object.values(results.judges).filter((j) => j.score !== null);

  if (successfulJudges.length > 0) {
    emitAndSave('aggregator_start', {
      testCaseIndex,
      judgeCount: successfulJudges.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const aggregatorResult = await executeWithProviderResilience({
        provider: 'anthropic',
        operation: 'aggregate',
        run: () => aggregateResults(testCase, results.judges, userKeys.anthropic),
        emitEvent: emitAndSave,
        context: { component: 'aggregator', testCaseIndex },
      });
      results.aggregator = aggregatorResult;

      emitAndSave('aggregator_complete', {
        testCaseIndex,
        result: aggregatorResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.aggregator = {
        error: error.message,
        finalScore: null,
        verdict: 'ERROR',
      };

      emitAndSave('aggregator_error', {
        testCaseIndex,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    results.aggregator = {
      error: 'No successful judge evaluations to aggregate',
      finalScore: null,
      verdict: 'ERROR',
    };

    emitAndSave('aggregator_error', {
      testCaseIndex,
      error: 'No successful judge evaluations to aggregate',
      timestamp: new Date().toISOString(),
    });
  }

  logger.info('orchestrator.testcase.complete', {
    metadata: {
      testCaseIndex,
      verdict: results.aggregator?.verdict || 'ERROR',
    },
  });

  return results;
}

export async function runEvaluation(testCases, jobId, emitEvent, saveEvent, updateDocument, options = {}, userKeys = {}) {
  const allResults = [];
  let totalCost = 0;
  const costTracker = new CostTracker();

  const useAdaptive = ADAPTIVE_MODE && options.strategy !== 'council';
  logger.audit('evaluation.started', {
    actor: 'system',
    jobId,
    metadata: {
      strategy: options.strategy || 'auto',
      useAdaptive,
      totalTestCases: testCases.length,
    },
  });

  emitEvent('evaluation_start', {
    jobId,
    totalTestCases: testCases.length,
    strategy: options.strategy || 'auto',
    timestamp: new Date().toISOString(),
  });
  saveEvent('evaluation_start', {
    jobId,
    totalTestCases: testCases.length,
    strategy: options.strategy || 'auto',
    timestamp: new Date().toISOString(),
  });

  for (let i = 0; i < testCases.length; i++) {
    emitEvent('test_case_start', {
      testCaseIndex: i,
      total: testCases.length,
      timestamp: new Date().toISOString(),
    });
    saveEvent('test_case_start', {
      testCaseIndex: i,
      total: testCases.length,
      timestamp: new Date().toISOString(),
    });

    let result;
    if (useAdaptive) {
      result = await routeTestCase(testCases[i], i, emitEvent, saveEvent, costTracker, options, userKeys);
    } else {
      result = await evaluateTestCase(testCases[i], i, emitEvent, saveEvent, userKeys);
      result.strategy = 'council';
    }
    allResults.push(result);

    const judgeCosts = Object.values(result.judges)
      .filter((j) => j.cost)
      .reduce((sum, j) => sum + j.cost, 0);
    const aggregatorCost = result.aggregator?.cost || 0;
    totalCost += judgeCosts + aggregatorCost;

    emitEvent('test_case_complete', {
      testCaseIndex: i,
      total: testCases.length,
      timestamp: new Date().toISOString(),
    });
    saveEvent('test_case_complete', {
      testCaseIndex: i,
      total: testCases.length,
      timestamp: new Date().toISOString(),
    });

    await updateDocument({ results: allResults });
  }

  const costSummary = costTracker.getSummary();
  const summary = calculateSummary(allResults, totalCost, costSummary);

  await updateDocument({
    results: allResults,
    summary,
    status: 'complete',
    completedAt: new Date(),
  });

  fireWebhooks({ jobId, testCases, results: allResults, summary, config: options }).catch(() => {});
  logger.audit('evaluation.completed', {
    actor: 'system',
    jobId,
    metadata: {
      status: 'complete',
      totalCost: summary.totalCost,
      passRate: summary.passRate,
    },
  });

  emitEvent('evaluation_complete', {
    jobId,
    summary,
    timestamp: new Date().toISOString(),
  });
  saveEvent('evaluation_complete', {
    jobId,
    summary,
    timestamp: new Date().toISOString(),
  });

  return { results: allResults, summary };
}

function calculateSummary(results, totalCost, costSummary) {
  const validResults = results.filter((r) => r.aggregator?.finalScore !== null);

  if (validResults.length === 0) {
    return {
      avgFaithfulness: null,
      avgGroundedness: null,
      avgRelevancy: null,
      avgFinalScore: null,
      passRate: 0,
      totalCost,
      strategyCounts: costSummary?.strategyCounts || {},
      costByStrategy: costSummary?.costByStrategy || {},
      avgRiskScore: null,
    };
  }

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  // Dynamic: iterate judge keys instead of hardcoding
  const faithfulnessScores = results
    .map((r) => r.judges.openai?.score)
    .filter((s) => s !== null && s !== undefined);

  const groundednessScores = results
    .map((r) => r.judges.anthropic?.score)
    .filter((s) => s !== null && s !== undefined);

  const relevancyScores = results
    .map((r) => r.judges.gemini?.score)
    .filter((s) => s !== null && s !== undefined);

  const finalScores = validResults.map((r) => r.aggregator.finalScore);

  const passCount = validResults.filter((r) => r.aggregator.verdict === 'PASS').length;

  const riskScores = results.map(r => r.riskScore).filter(s => s !== null && s !== undefined);

  return {
    avgFaithfulness: faithfulnessScores.length ? Math.round(avg(faithfulnessScores) * 100) / 100 : null,
    avgGroundedness: groundednessScores.length ? Math.round(avg(groundednessScores) * 100) / 100 : null,
    avgRelevancy: relevancyScores.length ? Math.round(avg(relevancyScores) * 100) / 100 : null,
    avgFinalScore: finalScores.length ? Math.round(avg(finalScores) * 100) / 100 : null,
    passRate: Math.round((passCount / results.length) * 100),
    totalCost: Math.round(totalCost * 1000000) / 1000000,
    strategyCounts: costSummary?.strategyCounts || {},
    costByStrategy: costSummary?.costByStrategy || {},
    avgRiskScore: riskScores.length ? Math.round(avg(riskScores) * 100) / 100 : null,
  };
}
