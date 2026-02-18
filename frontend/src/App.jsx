import { useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Toaster } from 'sileo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EvaluationProvider, useEvaluation } from './context/EvaluationContext';
import { Sidebar } from './components/layout/Sidebar';
import { TestCaseUpload } from './components/TestCaseUpload';
import { StreamingEvaluation } from './components/StreamingEvaluation';
import { EvaluationHistory } from './components/EvaluationHistory';
import { WebhookManager } from './components/WebhookManager';
import { EvaluationDetail } from './components/EvaluationDetail';
import { ErrorAlert } from './components/ui/ErrorAlert';

function UploadRoute() {
  const { submitEvaluation, isLoading } = useEvaluation();
  const navigate = useNavigate();
  const handleSubmit = async (cases, options) => {
    const jobId = await submitEvaluation(cases, options);
    if (jobId) navigate(`/app/evaluate/${jobId}`);
  };
  return <TestCaseUpload onSubmit={handleSubmit} isLoading={isLoading} />;
}

function EvaluateRoute() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { testCases, currentTestCase, setCurrentTestCase, events, jobId: ctxJobId } = useEvaluation();

  useEffect(() => {
    if (!ctxJobId || ctxJobId !== jobId) {
      navigate(`/app/history/${jobId}`, { replace: true });
    }
  }, [ctxJobId, jobId, navigate]);

  return (
    <StreamingEvaluation
      events={events}
      testCases={testCases}
      currentTestCase={currentTestCase}
      onNavigate={setCurrentTestCase}
      jobId={jobId}
    />
  );
}

function AppContent() {
  const { error } = useEvaluation();
  return (
    <div className="flex min-h-screen bg-surface-secondary">
      <Sidebar />
      <main className="ml-60 flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <ErrorAlert message={error} className="mb-6" />
          <Routes>
            <Route index element={<UploadRoute />} />
            <Route path="evaluate/:jobId" element={<EvaluateRoute />} />
            <Route path="history" element={<EvaluationHistory />} />
            <Route path="history/:jobId" element={<EvaluationDetail />} />
            <Route path="webhooks" element={<WebhookManager />} />
          </Routes>
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
