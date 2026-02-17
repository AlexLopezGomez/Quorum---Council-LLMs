import PropTypes from 'prop-types';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { safeFixed } from '../lib/utils';
import { ScoreBar } from './ui/ScoreBar';

const VERDICT_ICONS = {
  PASS: CheckCircle2,
  WARN: AlertTriangle,
  FAIL: XCircle,
};

const VERDICT_STYLES = {
  PASS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WARN: 'bg-amber-50 text-amber-700 border-amber-200',
  FAIL: 'bg-red-50 text-red-700 border-red-200',
  ERROR: 'bg-surface-tertiary text-text-secondary border-surface-border',
};

function VerdictBadge({ verdict }) {
  const Icon = VERDICT_ICONS[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${VERDICT_STYLES[verdict] || VERDICT_STYLES.ERROR}`}>
      {Icon && <Icon size={12} />}
      {verdict}
    </span>
  );
}

VerdictBadge.propTypes = {
  verdict: PropTypes.string.isRequired,
};

export function AggregatorCard({ status, result, error }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
      <div className="h-0.5 bg-strategy-council" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Final Verdict</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {result?.model === 'local-hybrid' ? 'Local Hybrid Aggregation'
                : result?.model === 'local' ? 'Local Threshold'
                  : 'Claude Sonnet Aggregator'}
            </p>
          </div>

          {status === 'loading' && (
            <div className="w-5 h-5 border-2 border-surface-border border-t-strategy-council rounded-full animate-spin" />
          )}

          {status === 'complete' && result && (
            <div className="flex items-center gap-3">
              {result.finalScore !== null && (
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-text-primary">
                    {safeFixed(result.finalScore)}
                  </span>
                  <span className="text-sm text-text-secondary">/ 1.0</span>
                </div>
              )}
              <VerdictBadge verdict={result.verdict} />
            </div>
          )}
        </div>

        {status === 'idle' && (
          <p className="text-xs text-text-tertiary">Waiting for judge evaluations...</p>
        )}

        {status === 'loading' && (
          <p className="text-xs text-text-secondary animate-pulse">Synthesizing verdicts...</p>
        )}

        {status === 'complete' && result && (
          <div className="space-y-4">
            {result.finalScore !== null && (
              <ScoreBar score={result.finalScore} />
            )}

            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Synthesis</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{result.synthesis}</p>
            </div>

            {result.disagreements && result.disagreements.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Disagreements</h4>
                <ul className="list-disc list-inside text-sm text-text-secondary space-y-0.5">
                  {result.disagreements.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Recommendation</h4>
              <p className="text-sm text-text-secondary leading-relaxed bg-surface-secondary p-3 rounded-lg">
                {result.recommendation}
              </p>
            </div>

            <div className="flex items-center gap-4 pt-3 border-t border-surface-border">
              <span className="text-xs text-text-tertiary">Model: {result.model}</span>
              <span className="text-xs text-text-tertiary">{result.latency}ms</span>
              <span className="text-xs text-text-tertiary">{result.tokens?.total || 0} tokens</span>
              <span className="text-xs text-text-tertiary">${safeFixed(result.cost, 6)}</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <p className="text-sm text-verdict-fail">{error || 'Aggregation failed'}</p>
        )}
      </div>
    </div>
  );
}

AggregatorCard.propTypes = {
  status: PropTypes.oneOf(['idle', 'loading', 'complete', 'error']).isRequired,
  result: PropTypes.shape({
    finalScore: PropTypes.number,
    verdict: PropTypes.string,
    synthesis: PropTypes.string,
    recommendation: PropTypes.string,
    disagreements: PropTypes.arrayOf(PropTypes.string),
    model: PropTypes.string,
    latency: PropTypes.number,
    cost: PropTypes.number,
    tokens: PropTypes.shape({ total: PropTypes.number }),
  }),
  error: PropTypes.string,
};
