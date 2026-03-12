import PropTypes from 'prop-types';
import { JUDGE_CONFIG } from '../lib/constants';
import { safeFixed } from '../lib/utils';
import { ScoreBar } from './ui/ScoreBar';
import { Badge } from './ui/badge';

const PULSE_BORDER = {
  openai: 'border-openai',
  anthropic: 'border-anthropic',
  gemini: 'border-gemini',
};

export function JudgeCard({ judge, status, result, error, staggerIndex = 0 }) {
  const config = JUDGE_CONFIG[judge];
  if (!config) return null;

  return (
    <div
      className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden animate-fadeInUp"
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      <div className={`h-0.5 ${config.colorBar}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Icon with pulse ring when loading */}
            <div className="relative flex items-center justify-center w-5 h-5">
              {status === 'loading' && (
                <span
                  className={`absolute inset-0 rounded-full border-2 ${PULSE_BORDER[judge] || 'border-accent'} animate-ping opacity-60`}
                />
              )}
              <config.icon size={16} className={config.pillText} />
            </div>
            <span className="text-sm font-semibold text-text-primary">{config.name}</span>
            <span className="text-xs text-text-secondary">{result?.model || config.model}</span>
          </div>
          <Badge variant="outline" className={`rounded-full ${config.pillBg} ${config.pillText}`}>
            {config.metric}
          </Badge>
        </div>

        {/* Score with scale-in on complete */}
        {status === 'complete' && result?.score !== undefined && (
          <div key={status} className="animate-scaleIn">
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-semibold text-text-primary">
                {safeFixed(result.score)}
              </span>
              <span className="text-sm text-text-secondary">/ 1.0</span>
            </div>
            <div className="mb-4">
              <ScoreBar score={result.score} />
            </div>
          </div>
        )}

        {/* States */}
        {status === 'idle' && (
          <p className="text-xs text-text-tertiary">Waiting to start...</p>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 border-2 border-surface-border ${config.spinnerBorder} rounded-full animate-spin`} />
            <span className="text-xs text-text-secondary animate-pulse">Evaluating...</span>
          </div>
        )}

        {status === 'complete' && result && (
          <>
            <p className="text-xs text-text-secondary leading-relaxed">{result.reason}</p>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-border">
              <span className="text-xs text-text-tertiary">{result.latency}ms</span>
              <span className="text-xs text-text-tertiary">{result.tokens?.total || 0} tokens</span>
              <span className="text-xs text-text-tertiary">${safeFixed(result.cost, 6)}</span>
            </div>
          </>
        )}

        {status === 'error' && (
          <p className="text-xs text-verdict-fail">{error || 'Evaluation failed'}</p>
        )}
      </div>
    </div>
  );
}

JudgeCard.propTypes = {
  judge: PropTypes.oneOf(['openai', 'anthropic', 'gemini']).isRequired,
  status: PropTypes.oneOf(['idle', 'loading', 'complete', 'error']).isRequired,
  result: PropTypes.shape({
    score: PropTypes.number,
    reason: PropTypes.string,
    model: PropTypes.string,
    latency: PropTypes.number,
    cost: PropTypes.number,
    tokens: PropTypes.shape({ total: PropTypes.number }),
  }),
  error: PropTypes.string,
  staggerIndex: PropTypes.number,
};
