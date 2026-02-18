import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResults } from '../lib/api';
import { safeFixed } from '../lib/utils';
import { useApiQuery } from '../hooks/useApiQuery';
import { PageHeader } from './PageHeader';
import { TestCaseResult } from './TestCaseResult';
import { CostBreakdown } from './CostBreakdown';
import { ErrorAlert } from './ui/ErrorAlert';
import { SkeletonCard } from './Skeleton';
import PropTypes from 'prop-types';

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

function SummaryGrid({ summary, testCaseCount }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Final Score</p>
        <div className="mt-2">
          <span className="text-2xl font-semibold text-text-primary">{safeFixed(summary?.avgFinalScore)}</span>
        </div>
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Pass Rate</p>
        <div className="mt-2">
          <span className="text-2xl font-semibold text-text-primary">
            {summary?.passRate !== undefined ? `${summary.passRate}%` : '-'}
          </span>
        </div>
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Total Cost</p>
        <div className="mt-2">
          <span className="text-2xl font-semibold text-text-primary">${safeFixed(summary?.totalCost, 4)}</span>
        </div>
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Test Cases</p>
        <div className="mt-2">
          <span className="text-2xl font-semibold text-text-primary">{testCaseCount ?? '-'}</span>
        </div>
      </div>
    </div>
  );
}

SummaryGrid.propTypes = {
  summary: PropTypes.object,
  testCaseCount: PropTypes.number,
};

export function EvaluationDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, loading, error } = useApiQuery(
    (signal) => getResults(jobId, signal),
    [jobId],
  );

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
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
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

  const { testCases, results, summary } = data;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation Detail"
        subtitle={total > 0 ? `Test case ${currentIndex + 1} of ${total}` : undefined}
        action={navAction}
      />

      <SummaryGrid summary={summary} testCaseCount={total} />

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
