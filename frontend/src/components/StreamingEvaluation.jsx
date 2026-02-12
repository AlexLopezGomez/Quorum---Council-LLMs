import { useMemo } from 'react';
import { TestCaseResult } from './TestCaseResult';
import { CostBreakdown } from './CostBreakdown';

export function StreamingEvaluation({ events, testCases, currentTestCase, onNavigate, jobId }) {
  const testCaseState = useMemo(() => {
    const state = {
      judges: {
        openai: { status: 'idle', result: null, error: null },
        anthropic: { status: 'idle', result: null, error: null },
        gemini: { status: 'idle', result: null, error: null },
      },
      aggregator: { status: 'idle', result: null, error: null },
      strategy: null,
      riskScore: null,
      activeJudges: null,
      deterministicResults: null,
      deterministicStatus: 'idle',
    };

    const relevantEvents = events.filter(
      (e) => e.data?.testCaseIndex === currentTestCase || e.type === 'evaluation_start'
    );

    for (const event of relevantEvents) {
      const { type, data } = event;

      if (type === 'risk_scored') {
        state.riskScore = data.riskScore;
        state.strategy = data.selectedStrategy;
      } else if (type === 'strategy_selected') {
        state.strategy = data.strategy;
        state.activeJudges = data.activeJudges;
      } else if (type === 'deterministic_start') {
        state.deterministicStatus = 'loading';
      } else if (type === 'deterministic_complete') {
        state.deterministicStatus = 'complete';
        state.deterministicResults = { checks: data.results, avgScore: data.avgScore };
      } else if (type === 'judge_start' && data.judge) {
        state.judges[data.judge] = state.judges[data.judge] || { status: 'idle', result: null, error: null };
        state.judges[data.judge].status = 'loading';
      } else if (type === 'judge_complete' && data.judge) {
        state.judges[data.judge] = state.judges[data.judge] || { status: 'idle', result: null, error: null };
        state.judges[data.judge].status = 'complete';
        state.judges[data.judge].result = data.result;
      } else if (type === 'judge_error' && data.judge) {
        state.judges[data.judge] = state.judges[data.judge] || { status: 'idle', result: null, error: null };
        state.judges[data.judge].status = 'error';
        state.judges[data.judge].error = data.error;
      } else if (type === 'aggregator_start') {
        state.aggregator.status = 'loading';
      } else if (type === 'aggregator_complete') {
        state.aggregator.status = 'complete';
        state.aggregator.result = data.result;
      } else if (type === 'aggregator_error') {
        state.aggregator.status = 'error';
        state.aggregator.error = data.error;
      }
    }

    return state;
  }, [events, currentTestCase]);

  const summary = useMemo(() => {
    const completeEvent = events.find((e) => e.type === 'evaluation_complete');
    return completeEvent?.data?.summary || null;
  }, [events]);

  const currentCase = testCases[currentTestCase];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Evaluation Results</h1>
          <p className="text-sm text-text-secondary mt-1">
            Test case {currentTestCase + 1} of {testCases.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate(Math.max(0, currentTestCase - 1))}
            disabled={currentTestCase === 0}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Previous
          </button>
          <button
            onClick={() => onNavigate(Math.min(testCases.length - 1, currentTestCase + 1))}
            disabled={currentTestCase === testCases.length - 1}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Next
          </button>
        </div>
      </div>

      <TestCaseResult
        testCaseState={testCaseState}
        testCase={currentCase}
        testCaseIndex={currentTestCase}
      />

      {summary && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Faithfulness</p>
              <div className="mt-2">
                <span className="text-2xl font-semibold text-text-primary">
                  {summary.avgFaithfulness !== null ? summary.avgFaithfulness.toFixed(2) : '-'}
                </span>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Groundedness</p>
              <div className="mt-2">
                <span className="text-2xl font-semibold text-text-primary">
                  {summary.avgGroundedness !== null ? summary.avgGroundedness.toFixed(2) : '-'}
                </span>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Relevancy</p>
              <div className="mt-2">
                <span className="text-2xl font-semibold text-text-primary">
                  {summary.avgRelevancy !== null ? summary.avgRelevancy.toFixed(2) : '-'}
                </span>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Final Score</p>
              <div className="mt-2">
                <span className="text-2xl font-semibold text-text-primary">
                  {summary.avgFinalScore !== null ? summary.avgFinalScore.toFixed(2) : '-'}
                </span>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Pass Rate</p>
              <div className="mt-2">
                <span className="text-2xl font-semibold text-text-primary">{summary.passRate}%</span>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Total Cost</p>
              <div className="mt-2">
                <span className="text-2xl font-semibold text-text-primary">${summary.totalCost?.toFixed(4) || '0'}</span>
              </div>
            </div>
          </div>

          {summary.strategyCounts && Object.keys(summary.strategyCounts).length > 0 && (
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="font-medium uppercase tracking-wide">Strategies:</span>
              {Object.entries(summary.strategyCounts).map(([s, c]) => (
                <span key={s} className="capitalize">{s}: {c}</span>
              ))}
              {summary.avgRiskScore !== null && (
                <span>Avg Risk: {summary.avgRiskScore.toFixed(2)}</span>
              )}
            </div>
          )}

          <CostBreakdown jobId={jobId} summary={summary} />
        </>
      )}
    </div>
  );
}
