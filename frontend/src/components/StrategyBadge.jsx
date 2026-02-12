const STRATEGY_CONFIG = {
  council: {
    label: 'Council',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  hybrid: {
    label: 'Hybrid',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  single: {
    label: 'Single',
    bg: 'bg-surface-tertiary',
    text: 'text-text-secondary',
    border: 'border-surface-border',
    dot: 'bg-text-tertiary',
  },
};

function RiskMeter({ score }) {
  if (score === null || score === undefined) return null;

  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'bg-verdict-fail' : score >= 0.4 ? 'bg-verdict-warn' : 'bg-verdict-pass';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-tertiary">{pct}%</span>
    </div>
  );
}

export function StrategyBadge({ strategy, riskScore }) {
  const config = STRATEGY_CONFIG[strategy] || STRATEGY_CONFIG.council;

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
      {riskScore !== null && riskScore !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-tertiary">Risk:</span>
          <RiskMeter score={riskScore} />
        </div>
      )}
    </div>
  );
}
