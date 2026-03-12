import { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Toaster, sileo } from 'sileo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EvaluationProvider, useEvaluation } from './context/EvaluationContext';
import { Sidebar } from './components/layout/Sidebar';
import { TestCaseUpload } from './components/TestCaseUpload';
import { StreamingEvaluation } from './components/StreamingEvaluation';
import { EvaluationHistory } from './components/EvaluationHistory';
import { WebhookManager } from './components/webhooks/WebhookManager';
import { ApiKeysManager } from './components/ApiKeysManager';
import { EvaluationDetail } from './components/EvaluationDetail';
import { ErrorAlert } from './components/ui/ErrorAlert';
import { BenchmarkDashboard } from './components/BenchmarkDashboard';
import { VerifyEmailBanner } from './components/VerifyEmailBanner';

function UploadRoute() {
  const {
    submitEvaluation,
    isLoading,
    activeJobId,
    isEvaluating,
    activeEvaluation,
    canViewLiveActiveEvaluation,
    syncActiveEvaluation,
  } = useEvaluation();
  const navigate = useNavigate();

  useEffect(() => {
    syncActiveEvaluation().catch(() => { });
  }, [syncActiveEvaluation]);

  const resumeActiveEvaluation = () => {
    if (!activeJobId) return;
    if (canViewLiveActiveEvaluation) {
      navigate(`/app/evaluate/${activeJobId}`, { replace: true });
      return;
    }
    navigate(`/app/history/${activeJobId}`, { replace: true });
  };

  const handleSubmit = (cases, options) => {
    if (isEvaluating && activeJobId) {
      sileo.info({
        title: 'Evaluation already in progress',
        description: 'Resume the active run before starting a new one.',
      });
      resumeActiveEvaluation();
      return;
    }

    const evalPromise = submitEvaluation(cases, options).then((jobId) => {
      if (jobId) return jobId;
      throw new Error('Failed to start evaluation');
    });

    sileo.promise(evalPromise, {
      loading: { title: 'Starting evaluation...' },
      success: { title: 'Evaluation started!' },
      error: (err) => ({ title: 'Failed to start', description: err?.message }),
    });

    evalPromise
      .then((jobId) => navigate(`/app/evaluate/${jobId}`))
      .catch((err) => {
        if (err?.status === 409 && err?.data?.activeJobId) {
          navigate(`/app/history/${err.data.activeJobId}`);
        }
      });
  };

  return (
    <TestCaseUpload
      onSubmit={handleSubmit}
      isLoading={isLoading}
      activeEvaluation={activeEvaluation}
      onResumeActive={resumeActiveEvaluation}
    />
  );
}

function EvaluateRoute() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { testCases, currentTestCase, setCurrentTestCase, events, jobId: ctxJobId } = useEvaluation();
  const hasStreamingContext = Boolean(ctxJobId && ctxJobId === jobId && testCases.length > 0);
  const wasStreaming = useRef(hasStreamingContext);

  useEffect(() => {
    if (hasStreamingContext) {
      wasStreaming.current = true;
    }
  }, [hasStreamingContext]);

  useEffect(() => {
    if (!hasStreamingContext && !wasStreaming.current) {
      navigate(`/app/history/${jobId}`, { replace: true });
    }
  }, [hasStreamingContext, jobId, navigate]);

  if (!hasStreamingContext) return null;

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
          <VerifyEmailBanner />
          <ErrorAlert message={error} className="mb-6" />
          <Routes>
            <Route index element={<UploadRoute />} />
            <Route path="evaluate/:jobId" element={<EvaluateRoute />} />
            <Route path="history" element={<EvaluationHistory />} />
            <Route path="history/:jobId" element={<EvaluationDetail />} />
            <Route path="webhooks" element={<WebhookManager />} />
            <Route path="settings" element={<ApiKeysManager />} />
            <Route path="benchmark" element={<BenchmarkDashboard />} />
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
