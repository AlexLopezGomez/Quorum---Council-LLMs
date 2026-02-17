import PropTypes from 'prop-types';
import { NAV_ITEMS } from '../../lib/constants';
import { StatusIndicator } from '../ui/StatusIndicator';
import { useEvaluation } from '../../context/EvaluationContext';

/**
 * App sidebar with navigation, SSE status, and branding.
 * Consumes EvaluationContext instead of prop-drilling.
 */
export function Sidebar() {
    const {
        view,
        sseStatus,
        isEvaluating,
        navigateTo,
        resetEvaluation,
    } = useEvaluation();

    const activeNav = view === 'evaluating' ? 'upload' : view;

    return (
        <aside className="fixed left-0 top-0 h-screen w-60 bg-surface-secondary border-r border-surface-border flex flex-col z-10">
            <div className="px-5 py-5">
                <span
                    className="text-lg font-semibold text-text-primary cursor-pointer"
                    onClick={resetEvaluation}
                >
                    RAGScope
                </span>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => navigateTo(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeNav === item.key
                                ? 'bg-surface-tertiary text-text-primary font-medium'
                                : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                            }`}
                    >
                        <item.icon size={18} />
                        {item.label}
                        {item.key === 'upload' && isEvaluating && view !== 'evaluating' && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-verdict-pass animate-pulse" />
                        )}
                    </button>
                ))}
            </nav>

            {view === 'evaluating' && (
                <div className="px-3 pb-4 border-t border-surface-border pt-4">
                    <StatusIndicator status={sseStatus} />
                    <button
                        onClick={resetEvaluation}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                    >
                        New Evaluation
                    </button>
                </div>
            )}
        </aside>
    );
}
