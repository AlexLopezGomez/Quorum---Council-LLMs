import PropTypes from 'prop-types';
import { JUDGE_CONFIG } from '../lib/constants';
import { safeFixed } from '../lib/utils';
import { ScoreBar } from './ui/ScoreBar';

export function JudgeCard({ judge, status, result, error }) {
  const config = JUDGE_CONFIG[judge];
  if (!config) return null;

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
      <div className={`h-0.5 ${config.colorBar}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <config.icon size={16} className={config.pillText} />
            <span className="text-sm font-semibold text-text-primary">{config.name}</span>
            <span className="text-xs text-text-secondary">{result?.model || config.model}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.pillBg} ${config.pillText} font-medium`}>
            {config.metric}
          </span>
        </div>

        {/* Score */}
        {status === 'complete' && result?.score !== undefined && (
          <>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-semibold text-text-primary">
                {safeFixed(result.score)}
              </span>
              <span className="text-sm text-text-secondary">/ 1.0</span>
            </div>
            <div className="mb-4">
              <ScoreBar score={result.score} />
            </div>
          </>
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
};
