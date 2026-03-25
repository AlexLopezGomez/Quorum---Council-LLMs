import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toaster, sileo } from 'sileo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EvaluationProvider, useEvaluation } from './context/EvaluationContext';
import { Sidebar } from './components/layout/Sidebar';
import { TestCaseUpload } from './components/TestCaseUpload';
import { StreamingEvaluation } from './components/StreamingEvaluation';
import { EvaluationHistory } from './components/EvaluationHistory';
import { WebhookManager } from './components/webhooks/WebhookManager';
import { EvaluationDetail } from './components/EvaluationDetail';
import { SettingsPage, AccountTab } from './pages/SettingsPage';
import { ApiKeysManager } from './components/ApiKeysManager';
import { ServiceKeysManager } from './components/ServiceKeysManager';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { ErrorAlert } from './components/ui/ErrorAlert';
import { VerifyEmailBanner } from './components/VerifyEmailBanner';
import { DemoWelcome } from './components/DemoWelcome';
import { getKeys } from './lib/api';
import { DEMO_TEST_CASES } from './lib/demoTestCases';
import NotFoundPage from './pages/NotFoundPage.jsx';

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
  const [hasKeys, setHasKeys] = useState(null);

  useEffect(() => {
    syncActiveEvaluation().catch(() => { });
    getKeys()
      .then(data => setHasKeys(data.configured.openai || data.configured.anthropic || data.configured.google))
      .catch(() => setHasKeys(true));
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

    const isDemo = Boolean(options?.demo);
    const evalPromise = submitEvaluation(cases, options).then((jobId) => {
      if (jobId) return jobId;
      throw new Error('Failed to start evaluation');
    });

    sileo.promise(evalPromise, {
      loading: { title: isDemo ? 'Starting demo...' : 'Starting evaluation...' },
      success: { title: isDemo ? 'Demo started!' : 'Evaluation started!' },
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

  const handleDismiss = () => {
    localStorage.setItem('demo_dismissed', 'true');
    setHasKeys(true);
  };

  if (hasKeys === null) {
    return (
      <TestCaseUpload onSubmit={() => {}} isLoading={true} activeEvaluation={null} onResumeActive={null} />
    );
  }

  const demoDismissed = localStorage.getItem('demo_dismissed') === 'true';

  if (!hasKeys && !demoDismissed) {
    const handleDemoSubmit = () => {
      const evalPromise = submitEvaluation(DEMO_TEST_CASES, { strategy: 'council', name: 'Demo Evaluation', demo: true }).then(jobId => {
        if (jobId) return jobId;
        throw new Error('Failed to start demo');
      });
      sileo.promise(evalPromise, {
        loading: { title: 'Starting demo...' },
        success: { title: 'Demo started!' },
        error: (err) => ({ title: 'Failed to start', description: err?.message }),
      });
      evalPromise.then(jobId => navigate(`/app/evaluate/${jobId}`)).catch(() => {});
    };

    return (
      <DemoWelcome
        onRunDemo={handleDemoSubmit}
        onConfigureKeys={() => navigate('/app/settings/api-keys')}
        onDismiss={handleDismiss}
        isLoading={isLoading}
      />
    );
  }

  return (
    <TestCaseUpload
      onSubmit={handleSubmit}
      isLoading={isLoading}
      activeEvaluation={activeEvaluation}
      onResumeActive={resumeActiveEvaluation}
      hasKeys={hasKeys}
      onConfigureKeys={() => navigate('/app/settings/api-keys')}
    />
  );
}

function EvaluateRoute() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { testCases, currentTestCase, setCurrentTestCase, events, jobId: ctxJobId, isDemo } = useEvaluation();
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
      isDemo={isDemo}
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
            <Route path="monitoring" element={<MonitoringDashboard />} />
            <Route path="webhooks" element={<WebhookManager />} />
            <Route path="settings" element={<SettingsPage />}>
              <Route index element={<Navigate to="/app/settings/api-keys" replace />} />
              <Route path="api-keys" element={<ApiKeysManager />} />
              <Route path="service-keys" element={<ServiceKeysManager />} />
              <Route path="account" element={<AccountTab />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
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
