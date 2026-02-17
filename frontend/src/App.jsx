import { Toaster } from 'sileo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EvaluationProvider, useEvaluation } from './context/EvaluationContext';
import { Sidebar } from './components/layout/Sidebar';
import { TestCaseUpload } from './components/TestCaseUpload';
import { StreamingEvaluation } from './components/StreamingEvaluation';
import { EvaluationHistory } from './components/EvaluationHistory';
import { WebhookManager } from './components/WebhookManager';
import { ErrorAlert } from './components/ui/ErrorAlert';

function AppContent() {
  const {
    view,
    testCases,
    jobId,
    isLoading,
    error,
    currentTestCase,
    events,
    submitEvaluation,
    setCurrentTestCase,
  } = useEvaluation();

  return (
    <div className="flex min-h-screen bg-surface-secondary">
      <Sidebar />

      <main className="ml-60 flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <ErrorAlert message={error} className="mb-6" />

          {view === 'upload' && (
            <TestCaseUpload onSubmit={submitEvaluation} isLoading={isLoading} />
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

          {view === 'history' && <EvaluationHistory />}

          {view === 'webhooks' && <WebhookManager />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <EvaluationProvider>
        <Toaster position="bottom-right" />
        <AppContent />
      </EvaluationProvider>
    </ErrorBoundary>
  );
}
