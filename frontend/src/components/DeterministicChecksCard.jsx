function getBarColor(score) {
  if (score >= 0.7) return 'bg-verdict-pass';
  if (score >= 0.5) return 'bg-verdict-warn';
  return 'bg-verdict-fail';
}

function getTextColor(score) {
  if (score >= 0.7) return 'text-emerald-600';
  if (score >= 0.5) return 'text-amber-600';
  return 'text-red-600';
}

const CHECK_LABELS = {
  entityMatch: 'Entity Match',
  freshness: 'Freshness',
  contextOverlap: 'Context Overlap',
  completeness: 'Completeness',
};

export function DeterministicChecksCard({ results, status }) {
  if (status === 'idle') {
    return (
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-text-tertiary">Deterministic Checks</h3>
        <p className="text-xs text-text-tertiary mt-1">Waiting to start...</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5 animate-pulse">
        <div className="h-3 w-32 bg-surface-tertiary rounded mb-4" />
        <div className="h-6 w-12 bg-surface-tertiary rounded mb-3" />
        <div className="space-y-3">
          <div className="h-1.5 w-full bg-surface-tertiary rounded" />
          <div className="h-1.5 w-3/4 bg-surface-tertiary rounded" />
          <div className="h-1.5 w-5/6 bg-surface-tertiary rounded" />
          <div className="h-1.5 w-2/3 bg-surface-tertiary rounded" />
        </div>
      </div>
    );
  }

  if (!results) return null;

  const checks = results.checks || results;

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Deterministic Checks</h3>
          <p className="text-xs text-text-secondary mt-0.5">Zero-cost heuristic analysis</p>
        </div>
        {results.avgScore !== undefined && (
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-semibold ${getTextColor(results.avgScore)}`}>
              {results.avgScore.toFixed(2)}
            </span>
            <span className="text-sm text-text-secondary">/ 1.0</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-3">
        {Object.entries(checks).map(([key, check]) => {
          if (!CHECK_LABELS[key]) return null;
          return (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">{CHECK_LABELS[key]}</span>
                <span className={`font-medium ${getTextColor(check.score)}`}>
                  {check.score.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBarColor(check.score)} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.round(check.score * 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">{check.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
