import { Brain, Sparkles, Gem } from 'lucide-react';

const JUDGE_CONFIG = {
  openai: {
    name: 'OpenAI',
    metric: 'Faithfulness',
    model: 'gpt-4o-mini',
    colorBar: 'bg-openai',
    dot: 'bg-openai',
    pillBg: 'bg-openai-light',
    pillText: 'text-openai',
    spinnerBorder: 'border-t-openai',
    icon: Brain,
  },
  anthropic: {
    name: 'Anthropic',
    metric: 'Groundedness',
    model: 'claude-3-haiku',
    colorBar: 'bg-anthropic',
    dot: 'bg-anthropic',
    pillBg: 'bg-anthropic-light',
    pillText: 'text-anthropic',
    spinnerBorder: 'border-t-anthropic',
    icon: Sparkles,
  },
  gemini: {
    name: 'Gemini',
    metric: 'Context Relevancy',
    model: 'gemini-1.5-flash',
    colorBar: 'bg-gemini',
    dot: 'bg-gemini',
    pillBg: 'bg-gemini-light',
    pillText: 'text-gemini',
    spinnerBorder: 'border-t-gemini',
    icon: Gem,
  },
};

function getScoreBarColor(score) {
  if (score >= 0.7) return 'bg-verdict-pass';
  if (score >= 0.4) return 'bg-verdict-warn';
  return 'bg-verdict-fail';
}

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
                {result.score.toFixed(2)}
              </span>
              <span className="text-sm text-text-secondary">/ 1.0</span>
            </div>
            <div className="w-full h-1.5 bg-surface-tertiary rounded-full mb-4">
              <div
                className={`h-full ${getScoreBarColor(result.score)} rounded-full transition-all duration-500`}
                style={{ width: `${Math.round(result.score * 100)}%` }}
              />
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
              <span className="text-xs text-text-tertiary">${result.cost?.toFixed(6) || '0'}</span>
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
