import { useMemo, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { sileo } from 'sileo';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TestCaseResult } from './TestCaseResult';
import { CostBreakdown } from './CostBreakdown';
import { PageHeader } from './PageHeader';
import { SummaryGrid } from './ui/SummaryGrid';
import { safeFixed } from '../lib/utils';

const TICKER_JUDGE_COLORS = {
  openai: 'bg-openai-light text-openai',
  anthropic: 'bg-anthropic-light text-anthropic',
  gemini: 'bg-gemini-light text-gemini',
};

function getTickerColor(evt) {
  if (evt.data?.judge && TICKER_JUDGE_COLORS[evt.data.judge]) {
    return TICKER_JUDGE_COLORS[evt.data.judge];
  }
  return 'bg-surface-tertiary text-text-secondary';
}

function StrategyCountCard({ strategyCounts }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-accent to-transparent" />
      <div className="p-5">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Strategy</p>
        <div className="mt-2">
          {strategyCounts && Object.keys(strategyCounts).length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(strategyCounts).map(([s, c]) => (
                <span key={s} className="text-sm font-medium text-text-primary capitalize">{s}: {c}</span>
              ))}
            </div>
          ) : (
            <span className="text-2xl font-semibold text-text-primary">-</span>
          )}
        </div>
      </div>
    </div>
  );
}

StrategyCountCard.propTypes = {
  strategyCounts: PropTypes.object,
};

function MetricsPanel({ summary }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden animate-staggerFadeIn" style={{ '--stagger-delay': '200ms' }}>
      <div className="h-0.5 bg-gradient-to-r from-accent to-transparent" />
      <div className="p-5">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">Per-Metric Averages</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-text-tertiary">Faithfulness</span>
            <p className="text-lg font-semibold text-text-primary mt-0.5">
              {safeFixed(summary.avgFaithfulness)}
            </p>
          </div>
          <div>
            <span className="text-xs text-text-tertiary">Groundedness</span>
            <p className="text-lg font-semibold text-text-primary mt-0.5">
              {safeFixed(summary.avgGroundedness)}
            </p>
          </div>
          <div>
            <span className="text-xs text-text-tertiary">Relevancy</span>
            <p className="text-lg font-semibold text-text-primary mt-0.5">
              {safeFixed(summary.avgRelevancy)}
            </p>
          </div>
        </div>
        {summary.avgRiskScore !== null && summary.avgRiskScore !== undefined && (
          <div className="mt-3 pt-3 border-t border-surface-border">
            <span className="text-xs text-text-tertiary">Avg Risk Score: </span>
            <span className="text-sm font-medium text-text-primary">{safeFixed(summary.avgRiskScore)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

MetricsPanel.propTypes = {
  summary: PropTypes.shape({
    avgFaithfulness: PropTypes.number,
    avgGroundedness: PropTypes.number,
    avgRelevancy: PropTypes.number,
    avgRiskScore: PropTypes.number,
  }).isRequired,
};

export function StreamingEvaluation({ events, testCases, currentTestCase, onNavigate, jobId, isDemo }) {
  const navigate = useNavigate();
  const [tickerItems, setTickerItems] = useState([]);
  const toastFiredRef = useRef(null);

  // Live event ticker: accumulate last 3 events
  useEffect(() => {
    if (events.length === 0) return;
    const last = events[events.length - 1];
    setTickerItems(prev => [...prev.slice(-2), { ...last, _tickerId: `${events.length}-${Date.now()}` }]);
  }, [events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sileo completion toasts
  useEffect(() => {
    const completeEvent = events.find(e => e.type === 'evaluation_complete');
    const errorEvent = events.find(e => e.type === 'evaluation_error');

    if (completeEvent && toastFiredRef.current !== 'complete') {
      toastFiredRef.current = 'complete';
      const passRate = completeEvent.data?.summary?.passRate;
      sileo.success({
        title: 'Evaluation complete',
        description: passRate !== undefined ? `${passRate}% pass rate` : undefined,
      });
    } else if (errorEvent && toastFiredRef.current !== 'error') {
      toastFiredRef.current = 'error';
      sileo.error({ title: 'Evaluation failed' });
    }
  }, [events]);

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

  const rawCompletedCases = useMemo(
    () => events.filter(e => e.type === 'test_case_complete').length,
    [events]
  );

  const total = testCases.length;
  const completedCases = Math.min(rawCompletedCases, total);
  const progressPct = total > 0 ? Math.min((completedCases / total) * 100, 100) : 0;
  const currentCase = testCases[currentTestCase];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation Results"
        subtitle={`Test case ${currentTestCase + 1} of ${testCases.length}`}
        icon={Activity}
        action={
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
        }
      />

      {isDemo && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-xs text-text-secondary -mt-4">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          Demo mode — results are simulated
        </div>
      )}

      {/* Progress bar — enhanced with accent glow and percentage label */}
      <div className="animate-fadeInUp -mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-tertiary">
            {completedCases} of {total} test cases completed
          </span>
          <span className="text-xs font-medium text-text-secondary tabular-nums">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full bg-accent rounded-full transition-all duration-700 ease-out ${progressPct > 0 ? 'progress-glow' : ''}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Live event ticker */}
      {tickerItems.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {tickerItems.map((evt) => (
            <span
              key={evt._tickerId}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium animate-fadeInUp ${getTickerColor(evt)}`}
              style={{ animation: 'fadeInUp 0.3s ease-out, fadeOut 0.5s 3s forwards' }}
            >
              {evt.type}
              {evt.timestamp && (
                <span className="opacity-60">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <TestCaseResult
        testCaseState={testCaseState}
        testCase={currentCase}
        testCaseIndex={currentTestCase}
      />

      {summary && (
        <div className="animate-slideInUp space-y-4">
          <SummaryGrid summary={summary} extraCard={<StrategyCountCard strategyCounts={summary.strategyCounts} />} />
          <MetricsPanel summary={summary} />
          <div className="animate-staggerFadeIn" style={{ '--stagger-delay': '300ms' }}>
            <CostBreakdown jobId={jobId} summary={summary} />
          </div>
          {isDemo && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden animate-staggerFadeIn" style={{ '--stagger-delay': '400ms' }}>
              <div className="h-0.5 bg-accent" />
              <div className="p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Ready to evaluate your own RAG system?</p>
                  <p className="text-sm text-text-secondary mt-0.5">Add your API keys to run real evaluations with full cost visibility.</p>
                </div>
                <button
                  onClick={() => navigate('/app/settings/api-keys')}
                  className="shrink-0 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Configure Keys
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

StreamingEvaluation.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    data: PropTypes.object,
    timestamp: PropTypes.number,
  })).isRequired,
  testCases: PropTypes.array.isRequired,
  currentTestCase: PropTypes.number.isRequired,
  onNavigate: PropTypes.func.isRequired,
  jobId: PropTypes.string,
};
