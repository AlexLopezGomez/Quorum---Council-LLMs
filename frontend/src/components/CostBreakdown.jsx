import PropTypes from 'prop-types';
import { BarChart3 } from 'lucide-react';
import { getCostBreakdown } from '../lib/api';
import { STRATEGY_COLORS } from '../lib/constants';
import { safeFixed } from '../lib/utils';
import { useApiQuery } from '../hooks/useApiQuery';
import { ScoreBar } from './ui/ScoreBar';

function CostBar({ label, cost, maxCost, color }) {
  const score = maxCost > 0 ? cost / maxCost : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary capitalize">{label}</span>
        <span className="font-medium text-text-primary">${safeFixed(cost, 6)}</span>
      </div>
      <ScoreBar score={score} color={color} height="h-2" />
    </div>
  );
}

CostBar.propTypes = {
  label: PropTypes.string.isRequired,
  cost: PropTypes.number.isRequired,
  maxCost: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

export function CostBreakdown({ jobId, summary }) {
  const { data: costData, loading } = useApiQuery(
    (signal) => getCostBreakdown(jobId, signal),
    [jobId],
    { enabled: !!jobId },
  );

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5 animate-pulse">
        <div className="h-3 w-28 bg-surface-tertiary rounded mb-4" />
        <div className="space-y-3">
          <div className="h-2 w-full bg-surface-tertiary rounded" />
          <div className="h-2 w-3/4 bg-surface-tertiary rounded" />
          <div className="h-2 w-1/2 bg-surface-tertiary rounded" />
        </div>
      </div>
    );
  }

  const strategyCounts = summary?.strategyCounts || {};
  const costByStrategy = summary?.costByStrategy || {};
  const maxStrategyCost = Math.max(...Object.values(costByStrategy), 0.000001);

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm">
      <div className="px-6 py-4 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <BarChart3 size={14} className="text-text-tertiary" />
          Cost Breakdown
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">Per-strategy cost analysis</p>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {Object.entries(costByStrategy).map(([strategy, cost]) => (
              <CostBar
                key={strategy}
                label={`${strategy} (${strategyCounts[strategy] || 0} cases)`}
                cost={cost}
                maxCost={maxStrategyCost}
                color={STRATEGY_COLORS[strategy] || 'bg-strategy-single'}
              />
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Strategy Distribution</p>
            {Object.entries(strategyCounts).map(([strategy, count]) => (
              <div key={strategy} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary capitalize">{strategy}</span>
                <span className="text-sm font-medium text-text-primary">{count} test case{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {costData && costData.savings > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-text-secondary">vs. all-council baseline</span>
            <span className="text-sm font-semibold text-emerald-600">-{costData.savings}% cost saved</span>
          </div>
        )}
      </div>
    </div>
  );
}

CostBreakdown.propTypes = {
  jobId: PropTypes.string,
  summary: PropTypes.shape({
    strategyCounts: PropTypes.object,
    costByStrategy: PropTypes.object,
    totalCost: PropTypes.number,
  }),
};
