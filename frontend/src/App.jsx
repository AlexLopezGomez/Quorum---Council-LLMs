import { useState } from 'react';
import { LayoutDashboard, History, Bell } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TestCaseUpload } from './components/TestCaseUpload';
import { StreamingEvaluation } from './components/StreamingEvaluation';
import { EvaluationHistory } from './components/EvaluationHistory';
import { WebhookManager } from './components/WebhookManager';
import { useSSE } from './hooks/useSSE';
import { startEvaluation, getStreamUrl } from './lib/api';

const NAV_ITEMS = [
  { key: 'upload', label: 'Evaluate', icon: LayoutDashboard },
  { key: 'history', label: 'History', icon: History },
  { key: 'webhooks', label: 'Webhooks', icon: Bell },
];

function AppContent() {
  const [view, setView] = useState('upload');
  const [testCases, setTestCases] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTestCase, setCurrentTestCase] = useState(0);

  const streamUrl = jobId ? getStreamUrl(jobId) : null;
  const { events, status: sseStatus, reset: resetSSE } = useSSE(streamUrl);

  const isEvaluating = jobId && (sseStatus === 'connecting' || sseStatus === 'connected');

  const handleSubmit = async (cases, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await startEvaluation(cases, options);
      setJobId(response.jobId);
      setTestCases(cases);
      setCurrentTestCase(0);
      setView('evaluating');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    resetSSE();
    setView('upload');
    setTestCases([]);
    setJobId(null);
    setError(null);
    setCurrentTestCase(0);
  };

  const navigateTo = (key) => {
    if (key === 'upload') handleReset();
    setView(key);
  };

  const activeNav = view === 'evaluating' ? 'upload' : view;

  return (
    <div className="flex min-h-screen bg-surface-secondary">
      <aside className="fixed left-0 top-0 h-screen w-60 bg-surface-secondary border-r border-surface-border flex flex-col z-10">
        <div className="px-5 py-5">
          <span
            className="text-lg font-semibold text-text-primary cursor-pointer"
            onClick={handleReset}
          >
            RAGScope
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => navigateTo(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeNav === item.key
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
            <div className="flex items-center gap-2 px-3 mb-2">
              <span className={`w-2 h-2 rounded-full ${
                sseStatus === 'connected' ? 'bg-verdict-pass' :
                sseStatus === 'complete' ? 'bg-text-secondary' :
                sseStatus === 'error' ? 'bg-verdict-fail' : 'bg-text-tertiary'
              }`} />
              <span className="text-xs text-text-secondary">
                {sseStatus === 'connecting' && 'Connecting...'}
                {sseStatus === 'connected' && 'Live'}
                {sseStatus === 'complete' && 'Complete'}
                {sseStatus === 'error' && 'Disconnected'}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
            >
              New Evaluation
            </button>
          </div>
        )}
      </aside>

      <main className="ml-60 flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {view === 'upload' && (
            <TestCaseUpload onSubmit={handleSubmit} isLoading={isLoading} />
          )}

          {view === 'evaluating' && (
            <StreamingEvaluation
              events={events}
              testCases={testCases}
              currentTestCase={currentTestCase}
              onNavigate={setCurrentTestCase}
              jobId={jobId}
            />
          )}

          {view === 'history' && (
            <EvaluationHistory />
          )}

          {view === 'webhooks' && (
            <WebhookManager />
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
