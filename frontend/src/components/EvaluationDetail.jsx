import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResults } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { PageHeader } from './PageHeader';
import { TestCaseResult } from './TestCaseResult';
import { CostBreakdown } from './CostBreakdown';
import { ErrorAlert } from './ui/ErrorAlert';
import { SummaryGrid } from './ui/SummaryGrid';
import { SkeletonCard } from './Skeleton';

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
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
      <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Test Cases</p>
      <div className="mt-2">
        <span className="text-2xl font-semibold text-text-primary">{count ?? '-'}</span>
      </div>
    </div>
  );
}

export function EvaluationDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchFn = useCallback(
    (signal) => getResults(jobId, signal),
    [jobId],
  );
  const { data, loading, error } = useApiQuery(fetchFn, [jobId]);

  const backAction = (
    <button
      onClick={() => navigate('/app/history')}
      className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors"
    >
      ← Back
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evaluation Detail" subtitle="Loading…" action={backAction} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evaluation Detail" action={backAction} />
        <ErrorAlert message={error.message} />
      </div>
    );
  }

  if (!data || data.status === 'processing') {
    return (
      <div className="space-y-6">
        <PageHeader title="Evaluation Detail" subtitle="Evaluation still in progress" action={backAction} />
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
      {backAction}
      <button
        onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        disabled={currentIndex === 0}
        className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Previous
      </button>
      <button
        onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
        disabled={currentIndex === total - 1}
        className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Next
      </button>
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
      />

      <SummaryGrid summary={summary} extraCard={<TestCaseCountCard count={total} />} />

      {testCaseState && (
        <TestCaseResult
          testCaseState={testCaseState}
          testCase={currentTestCase}
          testCaseIndex={currentIndex}
        />
      )}

      <CostBreakdown jobId={jobId} summary={summary} />
    </div>
  );
}
