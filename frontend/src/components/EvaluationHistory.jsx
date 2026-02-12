import { useState, useEffect } from 'react';
import { getHistory } from '../lib/api';

function StatusBadge({ status }) {
  const styles = {
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status] || 'bg-surface-tertiary text-text-secondary border-surface-border'}`}>
      {status}
    </span>
  );
}

export function EvaluationHistory({ onViewEvaluation }) {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({ strategy: '', status: '' });

  const fetchHistory = async (append = false) => {
    try {
      setLoading(true);
      const params = { limit: 20 };
      if (append && cursor) params.cursor = cursor;
      if (filters.strategy) params.strategy = filters.strategy;
      if (filters.status) params.status = filters.status;

      const data = await getHistory(params);
      setEvaluations(prev => append ? [...prev, ...data.evaluations] : data.evaluations);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filters]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">History</h1>
          <p className="text-sm text-text-secondary mt-1">Browse past evaluation runs</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
        {/* Table header with filters */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Evaluation History</h3>
          <div className="flex items-center gap-3">
            <select
              value={filters.strategy}
              onChange={(e) => setFilters(f => ({ ...f, strategy: e.target.value }))}
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
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
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
                <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(eval_.createdAt)}</td>
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

      {loading && (
        <div className="text-center py-6 text-sm text-text-tertiary animate-pulse">Loading...</div>
      )}

      {hasMore && !loading && (
        <div className="text-center py-4">
          <button
            onClick={() => fetchHistory(true)}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
