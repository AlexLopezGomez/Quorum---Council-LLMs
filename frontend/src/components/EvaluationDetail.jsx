import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, ClipboardCheck } from 'lucide-react';
import { getResults } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { PageHeader } from './PageHeader';
import { TestCaseResult } from './TestCaseResult';
import { CostBreakdown } from './CostBreakdown';
import { ErrorAlert } from './ui/ErrorAlert';
import { SummaryGrid } from './ui/SummaryGrid';
import { SkeletonCard } from './Skeleton';
import { useEvaluation } from '../context/EvaluationContext';

function toTestCaseState(result) {
  const judges = {};
  for (const [name, r] of Object.entries(result.judges || {})) {
    judges[name] =
      r.error || r.score === null
        ? { status: 'error', result: null, error: r.error || 'Judge failed' }
        : { status: 'complete', result: r, error: null };
  }
  return {
    strategy: result.strategy,
    riskScore: result.riskScore ?? null,
    activeJudges: Object.keys(result.judges || {}),
    deterministicResults: result.deterministicChecks || null,
    deterministicStatus: result.deterministicChecks ? 'complete' : 'idle',
    judges,
    aggregator: {
      status: result.aggregator ? 'complete' : 'idle',
      result: result.aggregator || null,
      error: null,
    },
  };
}

function TestCaseCountCard({ count }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-accent to-transparent" />
      <div className="p-5">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Test Cases</p>
        <div className="mt-2">
          <span className="text-2xl font-semibold text-text-primary animate-countUp"
            style={{ '--stagger-delay': '390ms' }}>
            {count ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function EvaluationDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { activeJobId, canViewLiveActiveEvaluation } = useEvaluation();

  const fetchFn = useCallback(
    (signal) => getResults(jobId, signal),
    [jobId],
  );
  const { data, loading, error } = useApiQuery(fetchFn, [jobId, refreshKey]);

  // Auto-poll every 10s while the evaluation is still processing
  useEffect(() => {
    if (data && data.status === 'processing') {
      const timer = setInterval(() => setRefreshKey((k) => k + 1), 10000);
      return () => clearInterval(timer);
    }
  }, [data]);

  const backButton = (
    <button
      onClick={() => navigate('/app/history')}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors"
    >
      <ArrowLeft size={14} />
      Back to History
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evaluation Detail" subtitle="Loading…" action={backButton} icon={ClipboardCheck} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-staggerFadeIn" style={{ '--stagger-delay': `${i * 80}ms` }}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evaluation Detail" action={backButton} icon={ClipboardCheck} />
        <ErrorAlert message={error.message} />
      </div>
    );
  }

  if (!data || data.status === 'processing') {
    return (
      <div className="space-y-6">
        <PageHeader title="Evaluation Detail" subtitle="This evaluation is still running" action={backButton} icon={ClipboardCheck} />
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-10 text-center animate-fadeInUp">
          <div className="w-4 h-4 rounded-full bg-accent mx-auto mb-5 animate-subtleGlow" />
          <h3 className="text-base font-semibold text-text-primary mb-2">Still processing</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
            Results will appear automatically when the evaluation completes.
          </p>
          {canViewLiveActiveEvaluation && activeJobId === jobId && (
            <button
              onClick={() => navigate(`/app/evaluate/${jobId}`)}
              className="px-5 py-2.5 text-sm font-medium rounded-xl text-white transition-all
                bg-gradient-to-br from-accent to-accent-hover
                shadow-[0_4px_20px_rgba(217,144,88,0.30)]
                hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(217,144,88,0.35)]"
            >
              View Live Progress
            </button>
          )}
        </div>
      </div>
    );
  }

  const { testCases, results, summary, name } = data;
  const total = testCases?.length ?? 0;
  const currentTestCase = testCases?.[currentIndex];
  const currentResult = results?.[currentIndex];
  const testCaseState = currentResult ? toTestCaseState(currentResult) : null;

  const navAction = (
    <div className="flex items-center gap-2">
      {backButton}
      <div className="flex items-center bg-surface border border-surface-border rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors disabled:opacity-30 disabled:hover:bg-transparent border-r border-surface-border"
          aria-label="Previous test case"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-3 py-1.5 text-xs font-medium text-text-secondary tabular-nums">
          {currentIndex + 1} / {total}
        </span>
        <button
          onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
          disabled={currentIndex === total - 1}
          className="px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors disabled:opacity-30 disabled:hover:bg-transparent border-l border-surface-border"
          aria-label="Next test case"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  const nameBadge = (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      {name || jobId}
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation Detail"
        badge={nameBadge}
        subtitle={total > 0 ? `Test case ${currentIndex + 1} of ${total}` : undefined}
        action={navAction}
        icon={ClipboardCheck}
      />

      <SummaryGrid summary={summary} extraCard={<TestCaseCountCard count={total} />} />

      {testCaseState && (
        <div className="animate-fadeInUp" style={{ '--stagger-delay': '100ms' }}>
          <TestCaseResult
            testCaseState={testCaseState}
            testCase={currentTestCase}
            testCaseIndex={currentIndex}
          />
        </div>
      )}

      <div className="animate-fadeInUp" style={{ '--stagger-delay': '200ms' }}>
        <CostBreakdown jobId={jobId} summary={summary} />
      </div>
    </div>
  );
}
