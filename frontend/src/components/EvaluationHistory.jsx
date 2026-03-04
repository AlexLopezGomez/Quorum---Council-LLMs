import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Clock, ClipboardList, Search, X, Pencil, Check } from 'lucide-react';
import { getHistory, updateEvaluationName } from '../lib/api';
import { safeFixed } from '../lib/utils';
import { STATUS_BADGE_STYLES } from '../lib/constants';
import { formatDate } from '../lib/utils';
import { useApiQuery } from '../hooks/useApiQuery';
import { useEvaluation } from '../context/EvaluationContext';
import { sileo } from 'sileo';
import { PageHeader } from './PageHeader';
import { SkeletonRow } from './Skeleton';
import { ErrorAlert } from './ui/ErrorAlert';
import PropTypes from 'prop-types';

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

function NameCell({ jobId, initialName, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const isSavingRef = useRef(false);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setValue(initialName);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancel = (e) => {
    e?.stopPropagation();
    setEditing(false);
    setValue(initialName);
  };

  const save = async (e) => {
    e?.stopPropagation();
    if (isSavingRef.current) return;
    const trimmed = value.trim();
    if (trimmed === initialName) { setEditing(false); return; }
    isSavingRef.current = true;
    try {
      await updateEvaluationName(jobId, trimmed);
      onSaved(jobId, trimmed);
      setEditing(false);
    } catch (err) {
      sileo.error({ title: 'Failed to save name', description: err?.message });
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); save(e); }
    if (e.key === 'Escape') cancel(e);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          maxLength={100}
          placeholder="Add a name…"
          className="flex-1 min-w-0 px-2 py-1 text-sm bg-surface border border-accent rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); save(e); }}
          className="p-1 rounded text-emerald-600 hover:bg-surface-tertiary transition-colors shrink-0"
        >
          <Check size={14} />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); cancel(e); }}
          className="p-1 rounded text-text-tertiary hover:bg-surface-tertiary transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="group/name flex items-start gap-1.5">
      <div className="min-w-0">
        {initialName ? (
          <>
            <p className="text-sm font-medium text-text-primary">{initialName}</p>
            <p className="text-xs font-mono text-text-tertiary mt-0.5">{jobId}</p>
          </>
        ) : (
          <span className="text-sm font-mono text-text-primary">{jobId}</span>
        )}
      </div>
      <button
        onClick={startEdit}
        className="shrink-0 mt-0.5 p-1 rounded text-text-tertiary opacity-0 group-hover/name:opacity-100 hover:bg-surface-tertiary hover:text-text-primary transition-all"
        title="Edit name"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}

NameCell.propTypes = {
  jobId: PropTypes.string.isRequired,
  initialName: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export function EvaluationHistory() {
  const navigate = useNavigate();
  const { jobId: activeJobId, isEvaluating } = useEvaluation();
  const [filters, setFilters] = useState({ strategy: '', status: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [nameOverrides, setNameOverrides] = useState({});

  const fetchFn = useCallback(
    (signal) => {
      const params = { limit: 20 };
      if (filters.strategy) params.strategy = filters.strategy;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      return getHistory(params, signal);
    },
    [filters.strategy, filters.status, filters.search],
  );

  const { data, loading, error } = useApiQuery(fetchFn, [filters.strategy, filters.status, filters.search]);

  const filtersActive = !!(filters.strategy || filters.status || filters.search);

  const evaluations = data ? [...data.evaluations, ...allEvaluations] : allEvaluations;
  const hasMore = data?.nextCursor || false;

  const handleLoadMore = async () => {
    if (!data?.nextCursor) return;
    try {
      const params = { limit: 20, cursor: data.nextCursor };
      if (filters.strategy) params.strategy = filters.strategy;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const moreData = await getHistory(params);
      setAllEvaluations((prev) => [...prev, ...moreData.evaluations]);
    } catch {
      sileo.error({ title: 'Failed to load more evaluations' });
    }
  };

  const handleNameSaved = (jobId, newName) => {
    setNameOverrides((prev) => ({ ...prev, [jobId]: newName }));
  };

  const applySearch = () => {
    setAllEvaluations([]);
    setFilters((f) => ({ ...f, search: searchInput.trim() }));
  };

  const clearSearch = () => {
    setSearchInput('');
    setAllEvaluations([]);
    setFilters((f) => ({ ...f, search: '' }));
  };

  return (
    <div>
      <PageHeader title="History" subtitle="Browse past evaluation runs" />

      <ErrorAlert message={error?.message} className="mb-6" />

      <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-text-tertiary" />
            Evaluation History
          </h3>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="Search by name…"
                className="pl-8 pr-7 py-1.5 text-xs bg-surface-secondary border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors w-44"
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X size={12} />
                </button>
              )}
            </div>

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

        {(evaluations.length > 0 || filtersActive) && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name / Job ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cases</th>
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
                  onClick={() => {
                    if (eval_.status === 'processing' && isEvaluating && eval_.jobId === activeJobId) {
                      navigate(`/app/evaluate/${eval_.jobId}`);
                    } else {
                      navigate(`/app/history/${eval_.jobId}`);
                    }
                  }}
                  className="cv-auto hover:bg-surface-secondary transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <NameCell
                      jobId={eval_.jobId}
                      initialName={nameOverrides[eval_.jobId] ?? eval_.name}
                      onSaved={handleNameSaved}
                    />
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={eval_.status} /></td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{eval_.testCaseCount}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary capitalize">{eval_.config?.strategy || 'council'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">
                    {safeFixed(eval_.summary?.avgFinalScore)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {eval_.summary?.totalCost != null ? `$${safeFixed(eval_.summary.totalCost, 4)}` : '-'}
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
                    No evaluations match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {evaluations.length === 0 && !loading && !filtersActive && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-10 max-w-sm w-full">
            <ClipboardList size={36} className="mx-auto text-text-tertiary mb-4" />
            <h3 className="text-base font-semibold text-text-primary mb-1">No evaluations yet</h3>
            <p className="text-sm text-text-secondary mb-6">Upload test cases to run your first evaluation</p>
            <button
              onClick={() => navigate('/app')}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-colors"
            >
              Upload Test Cases
            </button>
          </div>
        </div>
      )}

      {loading && evaluations.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <table className="w-full">
            <tbody>
              {[...Array(5)].map((_, i) => <SkeletonRow key={`skeleton-${i}`} />)}
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
