import PropTypes from 'prop-types';
import { STRATEGY_STYLE } from '../lib/constants';
import { Badge } from './ui/badge';

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

RiskMeter.propTypes = {
  score: PropTypes.number,
};

export function StrategyBadge({ strategy, riskScore }) {
  const config = STRATEGY_STYLE[strategy] || STRATEGY_STYLE.council;

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className={`h-auto px-2.5 py-1 rounded-full gap-1.5 ${config.bg} ${config.text} ${config.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </Badge>
      {riskScore !== null && riskScore !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-tertiary">Risk:</span>
          <RiskMeter score={riskScore} />
        </div>
      )}
    </div>
  );
}

StrategyBadge.propTypes = {
  strategy: PropTypes.string.isRequired,
  riskScore: PropTypes.number,
};
