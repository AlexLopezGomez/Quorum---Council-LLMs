import PropTypes from 'prop-types';
import { PageHeader } from './PageHeader';

export function DemoWelcome({ onRunDemo, onConfigureKeys, onDismiss, isLoading }) {
  return (
    <div>
      <PageHeader title="Evaluate" subtitle="Run evaluation on your RAG system outputs" />
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <div className="h-0.5 bg-accent" />
          <div className="p-6 sm:p-8 text-center">
            <h2 className="text-xl font-semibold text-text-primary">Run the council.</h2>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed max-w-sm mx-auto">
              10 test cases pre-loaded. Three LLM judges — OpenAI, Anthropic, Gemini — will evaluate faithfulness, groundedness, and context relevancy in real time.
            </p>

            <button
              onClick={onRunDemo}
              disabled={isLoading}
              className="w-full mt-6 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                'Try Demo'
              )}
            </button>

            <button
              onClick={onConfigureKeys}
              disabled={isLoading}
              className="py-2 text-sm text-accent hover:text-accent-hover mt-2 block w-full disabled:opacity-50 transition-colors"
            >
              Configure API Keys
            </button>

            <button
              onClick={onDismiss}
              disabled={isLoading}
              className="py-2 text-xs text-text-tertiary hover:text-text-secondary block w-full disabled:opacity-50 transition-colors"
            >
              Skip for now
            </button>

            <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
              {['Faithfulness', 'Groundedness', 'Context Relevancy'].map(label => (
                <span
                  key={label}
                  className="bg-surface-tertiary text-text-secondary text-xs px-2.5 py-1 rounded-full"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

DemoWelcome.propTypes = {
  onRunDemo: PropTypes.func.isRequired,
  onConfigureKeys: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};
