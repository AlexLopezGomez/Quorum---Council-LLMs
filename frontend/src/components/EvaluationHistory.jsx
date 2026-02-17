import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Filter, Clock } from 'lucide-react';
import { getHistory } from '../lib/api';
import { STATUS_BADGE_STYLES } from '../lib/constants';
import { formatDate } from '../lib/utils';
import { useApiQuery } from '../hooks/useApiQuery';
import { PageHeader } from './PageHeader';
import { SkeletonRow } from './Skeleton';
import { ErrorAlert } from './ui/ErrorAlert';

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE_STYLES[status] || 'bg-surface-tertiary text-text-secondary border-surface-border'}`}>
      {status}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export function EvaluationHistory({ onViewEvaluation }) {
  const [filters, setFilters] = useState({ strategy: '', status: '' });
  const [cursor, setCursor] = useState(null);
  const [allEvaluations, setAllEvaluations] = useState([]);

  const fetchFn = useCallback(
    (signal) => {
      const params = { limit: 20 };
      if (filters.strategy) params.strategy = filters.strategy;
      if (filters.status) params.status = filters.status;
      return getHistory(params, signal);
    },
    [filters.strategy, filters.status],
  );

  const { data, loading, error } = useApiQuery(fetchFn, [filters.strategy, filters.status]);

  // Merge initial data with any "load more" appended evaluations
  const evaluations = data ? [...data.evaluations, ...allEvaluations] : allEvaluations;
  const hasMore = data?.nextCursor || false;

  const handleLoadMore = async () => {
    if (!data?.nextCursor) return;
    try {
      const params = { limit: 20, cursor: data.nextCursor };
      if (filters.strategy) params.strategy = filters.strategy;
      if (filters.status) params.status = filters.status;
      const moreData = await getHistory(params);
      setAllEvaluations((prev) => [...prev, ...moreData.evaluations]);
      setCursor(moreData.nextCursor);
    } catch {
      // handled by UI
    }
  };

  return (
    <div>
      <PageHeader title="History" subtitle="Browse past evaluation runs" />

      <ErrorAlert message={error?.message} className="mb-6" />

      <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
        {/* Table header with filters */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Filter size={14} className="text-text-tertiary" />
            Evaluation History
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={filters.strategy}
              onChange={(e) => {
                setAllEvaluations([]);
                setFilters((f) => ({ ...f, strategy: e.target.value }));
              }}
              className="text-xs text-text-secondary bg-surface-secondary border border-surface-border rounded-lg px-3 py-1.5"
            >
              <option value="">Strategy: All</option>
              <option value="auto">Auto</option>
              <option value="council">Council</option>
              <option value="hybrid">Hybrid</option>
              <option value="single">Single</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => {
                setAllEvaluations([]);
                setFilters((f) => ({ ...f, status: e.target.value }));
              }}
              className="text-xs text-text-secondary bg-surface-secondary border border-surface-border rounded-lg px-3 py-1.5"
            >
              <option value="">Status: All</option>
              <option value="complete">Complete</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Job ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Test Cases</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Strategy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {evaluations.map((eval_) => (
              <tr
                key={eval_.jobId}
                onClick={() => onViewEvaluation?.(eval_.jobId)}
                className="hover:bg-surface-secondary transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 text-sm font-mono text-text-primary">{eval_.jobId}</td>
                <td className="px-6 py-4"><StatusBadge status={eval_.status} /></td>
                <td className="px-6 py-4 text-sm text-text-secondary">{eval_.testCaseCount}</td>
                <td className="px-6 py-4 text-sm text-text-secondary capitalize">{eval_.config?.strategy || 'council'}</td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary">
                  {eval_.summary?.avgFinalScore !== undefined ? eval_.summary.avgFinalScore.toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {eval_.summary?.totalCost ? `$${eval_.summary.totalCost.toFixed(4)}` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  <Clock size={12} className="inline -mt-0.5 mr-1 text-text-tertiary" />
                  {formatDate(eval_.createdAt)}
                </td>
              </tr>
            ))}
            {evaluations.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-text-tertiary">
                  No evaluations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && evaluations.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <table className="w-full">
            <tbody>
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && !loading && (
        <div className="text-center py-4">
          <button
            onClick={handleLoadMore}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

EvaluationHistory.propTypes = {
  onViewEvaluation: PropTypes.func,
};
