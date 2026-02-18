import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from '../../lib/constants';
import { StatusIndicator } from '../ui/StatusIndicator';
import { useEvaluation } from '../../context/EvaluationContext';
import { useAuth } from '../../context/AuthContext';

/**
 * App sidebar with navigation, SSE status, and branding.
 * Active state is derived from the current URL path.
 */
export function Sidebar() {
    const { sseStatus, isEvaluating, resetEvaluation } = useEvaluation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const isActive = (item) => {
        if (item.path === '/app') return pathname === '/app' || pathname.startsWith('/app/evaluate');
        return pathname.startsWith(item.path);
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-60 bg-surface-secondary border-r border-surface-border flex flex-col z-10">
            <div className="px-5 py-5">
                <span
                    className="text-lg font-semibold text-text-primary cursor-pointer"
                    onClick={() => { resetEvaluation(); navigate('/app'); }}
                >
                    RAGScope
                </span>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => {
                            if (item.key === 'upload') resetEvaluation();
                            navigate(item.path);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(item)
                                ? 'bg-surface-tertiary text-text-primary font-medium'
                                : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                            }`}
                    >
                        <item.icon size={18} />
                        {item.label}
                        {item.key === 'upload' && isEvaluating && !pathname.startsWith('/app/evaluate') && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-verdict-pass animate-pulse" />
                        )}
                    </button>
                ))}
            </nav>

            {pathname.startsWith('/app/evaluate') && (
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

            {user && (
                <div className="px-3 pb-4 border-t border-surface-border pt-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-lg bg-surface-tertiary flex items-center justify-center text-sm font-medium text-text-primary shrink-0">
                            {user.username?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-text-primary truncate">{user.username}</p>
                            <p className="text-xs text-text-tertiary truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={async () => { await logout(); navigate('/auth'); }}
                            className="p-1.5 rounded-lg text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors shrink-0"
                            title="Log out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
}
