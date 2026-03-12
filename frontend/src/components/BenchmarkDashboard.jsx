import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

const DOMAIN_LABELS = {
  general: 'General QA',
  legal: 'Legal',
  medical: 'Medical',
  financial: 'Financial',
  technical: 'Technical',
  adversarial: 'Adversarial',
};

function pct(n) {
  if (n === null || n === undefined) return '—';
  return `${Math.round(n * 100)}%`;
}

function round2(n) {
  if (n === null || n === undefined) return '—';
  return (Math.round(n * 100) / 100).toFixed(2);
}

function elapsed(since) {
  const ms = Date.now() - new Date(since).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
      <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">{label}</p>
      <div className="mt-2">
        <span className={`text-2xl font-semibold ${accent || 'text-text-primary'}`}>{value}</span>
        {sub && <span className="ml-2 text-xs text-text-secondary">{sub}</span>}
      </div>
    </div>
  );
}

function AccuracyBar({ label, accuracy, color, kappa, fnr, cost }) {
  const pctVal = accuracy !== null ? Math.round(accuracy * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-text-primary">{label}</span>
        <div className="flex items-center gap-4 text-text-secondary">
          {fnr !== undefined && <span className="text-red-600">FNR {pct(fnr)}</span>}
          {kappa !== undefined && <span>κ = {round2(kappa)}</span>}
          {cost !== undefined && <span>${cost < 0.001 ? cost.toFixed(6) : cost.toFixed(4)}/case</span>}
          <span className="font-bold w-10 text-right" style={{ color }}>{pct(accuracy)}</span>
        </div>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: '#EEEBE4' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pctVal}%`, background: color }}
        />
      </div>
    </div>
  );
}

function DomainTab({ domain, active, onClick, accuracy }) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm transition-colors whitespace-nowrap ${
        active
          ? 'font-medium text-text-primary border-b-2 border-text-primary -mb-px'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {DOMAIN_LABELS[domain] || domain}
      {accuracy !== undefined && (
        <span className="ml-1.5 text-xs text-text-tertiary">({pct(accuracy)})</span>
      )}
    </button>
  );
}

function VerdictBadge({ verdict }) {
  if (verdict === 'PASS') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 size={10} /> PASS
    </span>
  );
  if (verdict === 'FAIL') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
      <XCircle size={10} /> FAIL
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <AlertTriangle size={10} /> WARN
    </span>
  );
}

function CorrectBadge({ correct }) {
  return correct
    ? <CheckCircle2 size={14} className="text-emerald-500" />
    : <XCircle size={14} className="text-red-500" />;
}

function CaseRow({ r, expanded, onToggle }) {
  return (
    <>
      <tr
        className="hover:bg-surface-secondary transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-xs font-mono text-text-tertiary">{r.caseId}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-surface-tertiary text-text-secondary">
            {DOMAIN_LABELS[r.domain] || r.domain}
          </span>
        </td>
        <td className="px-4 py-3"><VerdictBadge verdict={r.humanVerdict} /></td>
        <td className="px-4 py-3"><div className="flex justify-center"><CorrectBadge correct={r.council?.correct} /></div></td>
        <td className="px-4 py-3"><div className="flex justify-center"><CorrectBadge correct={r.singleOpenai?.correct} /></div></td>
        <td className="px-4 py-3"><div className="flex justify-center"><CorrectBadge correct={r.singleGemini?.correct} /></div></td>
        <td className="px-4 py-3 text-xs text-text-tertiary">{r.failureMode}</td>
        <td className="px-4 py-3 text-text-tertiary">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-secondary">
          <td colSpan={8} className="px-4 py-3">
            <div className="space-y-2 text-xs text-text-secondary">
              <p><span className="font-medium text-text-primary">Query:</span> {r.input}</p>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {['council', 'singleOpenai', 'singleGemini'].map(key => (
                  <div key={key} className="bg-surface rounded-lg border border-surface-border p-3">
                    <p className="font-medium text-text-primary mb-1 capitalize">
                      {key === 'singleOpenai' ? 'Single (OpenAI)' : key === 'singleGemini' ? 'Single (Gemini)' : 'Council'}
                    </p>
                    <p>Verdict: <span className="font-medium">{r[key]?.verdict || '—'}</span></p>
                    <p>Score: {round2(r[key]?.score)}</p>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function BatchStatusPanel({ run, elapsedTime }) {
  const { status, batchStatus, totalCases, processedCases, createdAt } = run;

  const statusConfig = {
    submitting: {
      label: 'Submitting batch jobs to providers...',
      sub: 'Uploading evaluation requests to OpenAI and Anthropic batch APIs.',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
    polling: {
      label: 'Batch submitted. Waiting for results.',
      sub: 'Provider batch APIs typically complete in 1–4 hours. Checking every 5 minutes.',
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    aggregating: {
      label: 'Processing results...',
      sub: `Running consensus on discordant cases (${processedCases || 0}/${totalCases || 0} processed).`,
      color: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-200',
    },
  };

  const cfg = statusConfig[status] || statusConfig.polling;

  return (
    <div className={`rounded-xl border p-5 mb-6 ${cfg.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Loader2 size={16} className={`animate-spin ${cfg.color}`} />
            <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
          </div>
          <p className={`text-xs ml-6 ${cfg.color} opacity-80`}>{cfg.sub}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Clock size={12} />
          <span>{elapsedTime}</span>
        </div>
      </div>

      {batchStatus && (
        <div className="mt-4 flex items-center gap-6">
          {[
            { label: 'OpenAI Batch', status: batchStatus.openai },
            { label: 'Anthropic Batch', status: batchStatus.anthropic },
          ].map(({ label, status: bs }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${bs === 'complete' ? 'bg-emerald-500' : bs === 'failed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-text-secondary">{label}</span>
              <span className={`font-medium ${bs === 'complete' ? 'text-emerald-700' : bs === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>
                {bs || 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const BATCH_STATES = new Set(['submitting', 'polling', 'aggregating']);

export function BenchmarkDashboard() {
  const [latestRun, setLatestRun] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [expandedCase, setExpandedCase] = useState(null);
  const [caseFilter, setCaseFilter] = useState('all');
  const [mini, setMini] = useState(false);
  const [useBatch, setUseBatch] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('0s');
  const esRef = useRef(null);
  const pollRef = useRef(null);
  const elapsedRef = useRef(null);

  const fetchLatestRun = useCallback(async () => {
    try {
      const res = await fetch('/api/benchmark/runs?limit=1', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.runs?.length > 0) {
        const run = data.runs[0];
        setLatestRun(run);
        if (BATCH_STATES.has(run.status)) {
          setRunning(true);
          startElapsedTimer(run.createdAt);
          startBatchPoll(run.runId);
        }
      }
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    fetchLatestRun();
    return () => {
      clearInterval(pollRef.current);
      clearInterval(elapsedRef.current);
    };
  }, [fetchLatestRun]);

  function startElapsedTimer(since) {
    clearInterval(elapsedRef.current);
    elapsedRef.current = setInterval(() => setElapsedTime(elapsed(since)), 1000);
  }

  function startBatchPoll(runId) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/benchmark/runs/${runId}/batch-status`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setLatestRun(prev => ({ ...prev, ...data }));

        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(pollRef.current);
          clearInterval(elapsedRef.current);
          setRunning(false);

          if (data.status === 'complete') {
            const fullRes = await fetch(`/api/benchmark/runs/${runId}`, { credentials: 'include' });
            if (fullRes.ok) setLatestRun(await fullRes.json());
          }
        }
      } catch { /* silently ignore */ }
    }, 30000); // poll every 30s
  }

  const startBenchmark = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setProgress({ processed: 0, total: 0 });

    try {
      const res = await fetch('/api/benchmark/run', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mini, batch: useBatch }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const providerErrors = body.providers?.map(p => `${p.provider}: ${p.error}`).join('\n') || body.error || 'Failed to start benchmark';
        setError(providerErrors);
        setRunning(false);
        return;
      }

      const { runId, streamUrl } = await res.json();

      fetch('/api/benchmark/dataset', { credentials: 'include' })
        .then(r => r.json())
        .then(d => setProgress(p => ({ ...p, total: p.total || d.totalCases })))
        .catch(() => {});

      setLatestRun({ runId, status: useBatch ? 'submitting' : 'processing', createdAt: new Date().toISOString() });
      startElapsedTimer(new Date().toISOString());

      if (useBatch) {
        // For batch mode: poll batch-status endpoint every 30s
        startBatchPoll(runId);

        // Listen for SSE to get initial state
        esRef.current?.close();
        const es = new EventSource(streamUrl, { withCredentials: true });
        esRef.current = es;

        es.addEventListener('benchmark_batches_submitted', (e) => {
          const d = JSON.parse(e.data);
          setLatestRun(prev => ({
            ...prev,
            status: 'polling',
            batchIds: d.batchIds,
            batchStatus: { openai: 'pending', anthropic: 'pending', gemini: 'pending' },
          }));
          es.close();
        });

        es.addEventListener('benchmark_error', () => { es.close(); setRunning(false); });
        es.onerror = () => es.close();

      } else {
        // Synchronous mode: use SSE for live progress
        esRef.current?.close();
        const es = new EventSource(streamUrl, { withCredentials: true });
        esRef.current = es;

        es.addEventListener('benchmark_start', (e) => {
          const d = JSON.parse(e.data);
          setProgress(p => ({ ...p, total: d.totalCases }));
        });

        es.addEventListener('benchmark_case_complete', (e) => {
          const d = JSON.parse(e.data);
          setProgress(p => ({ ...p, processed: d.caseIndex + 1 }));
        });

        es.addEventListener('benchmark_complete', async () => {
          es.close();
          clearInterval(elapsedRef.current);
          setRunning(false);
          const runRes = await fetch(`/api/benchmark/runs/${runId}`, { credentials: 'include' });
          if (runRes.ok) {
            const run = await runRes.json();
            setLatestRun({ ...run, runId });
          }
        });

        es.addEventListener('benchmark_error', () => { es.close(); setRunning(false); });
        es.onerror = () => { es.close(); setRunning(false); };
      }
    } catch {
      setRunning(false);
    }
  };

  const isBatchMode = latestRun && BATCH_STATES.has(latestRun?.status);
  const stats = latestRun?.statistics;
  const councilAcc = stats?.council?.accuracy;
  const openaiAcc = stats?.singleOpenai?.accuracy;
  const councilFnr = stats?.council?.fnr;
  const openaiFnr = stats?.singleOpenai?.fnr;
  const delta = stats?.councilVsSingleOpenaiDelta;
  const fnrDelta = stats?.councilVsSingleOpenaiFnrDelta;
  const significant = stats?.statisticallySignificantVsOpenai;

  const domains = stats ? Object.keys(stats.council?.perDomain || {}) : [];
  const allDomains = ['all', ...domains];

  const caseResults = latestRun?.results || [];
  const filteredCases = caseResults.filter(r => {
    if (activeTab !== 'all' && r.domain !== activeTab) return false;
    if (caseFilter === 'disagreements') {
      const councilPass = r.council?.verdict === 'PASS';
      const openaiPass = r.singleOpenai?.verdict === 'PASS';
      return councilPass !== openaiPass;
    }
    if (caseFilter === 'council_wins') return r.council?.correct && !r.singleOpenai?.correct;
    if (caseFilter === 'council_misses') return !r.council?.correct && r.singleOpenai?.correct;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#d99058', letterSpacing: '0.08em' }}>
            Calibration Benchmark
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Council vs. Single-Judge Accuracy</h1>
          <p className="text-sm text-text-secondary mt-1">
            {mini
              ? '12-case mini dataset · 6 domains · quick calibration run'
              : '200+ case dataset with human-labeled ground truth across 6 domains'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => !running && setMini(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${mini ? 'bg-accent' : 'bg-surface-tertiary'} ${running ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mini ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm text-text-secondary">Mini</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => !running && setUseBatch(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${useBatch ? 'bg-accent' : 'bg-surface-tertiary'} ${running ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useBatch ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm text-text-secondary">Batch (50% off)</span>
          </label>
          <button
            onClick={startBenchmark}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? 'Running...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {/* Batch async state panel */}
      {running && isBatchMode && latestRun && (
        <BatchStatusPanel run={latestRun} elapsedTime={elapsedTime} />
      )}

      {/* Live progress bar (synchronous mode) */}
      {running && !isBatchMode && (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">Evaluating cases...</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <Clock size={12} /> {elapsedTime}
              </span>
              <span className="text-sm text-text-secondary">
                {progress.processed} / {progress.total || '—'}
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: progress.total ? `${(progress.processed / progress.total) * 100}%` : '5%' }}
            />
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Running 3 parallel evaluations per case: Council · Single OpenAI · Single Gemini
          </p>
        </div>
      )}

      {/* Preflight error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-800 mb-1">Benchmark preflight failed</p>
          <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}

      {/* Headline stats */}
      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Council FNR"
              value={pct(councilFnr)}
              sub="false negative rate"
              accent={councilFnr < 0.15 ? 'text-emerald-600' : 'text-red-600'}
            />
            <StatCard
              label="Single-Judge FNR"
              value={pct(openaiFnr)}
              sub="GPT-4o-mini"
              accent={openaiFnr > 0.25 ? 'text-red-600' : 'text-text-primary'}
            />
            <StatCard
              label="FNR Reduction"
              value={fnrDelta != null ? `${Math.round(fnrDelta * 100)}pp` : '—'}
              accent={fnrDelta > 0 ? 'text-emerald-600' : 'text-text-primary'}
              sub={significant ? 'p < 0.05' : undefined}
            />
            <StatCard
              label="Total Cases"
              value={stats.totalCases}
              sub={`${stats.passCases}P / ${stats.failCases}F`}
            />
          </div>

          {/* FNR headline callout */}
          {significant && fnrDelta > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-emerald-800">Statistically significant result (McNemar's test, p &lt; 0.05)</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Quorum council FNR: {pct(councilFnr)} vs. single-judge FNR: {pct(openaiFnr)}.
                On 10,000 evaluations/month, that's {Math.round(fnrDelta * 10000).toLocaleString()} fewer bad RAG responses reaching production.
              </p>
            </div>
          )}

          {/* Accuracy comparison */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-surface-border">
              <h3 className="text-base font-bold text-text-primary">Agreement with Human Expert Labels</h3>
              <p className="text-xs text-text-secondary mt-0.5">Accuracy, FNR, Cohen's κ, and average cost per test case</p>
            </div>
            <div className="p-6 space-y-5">
              <AccuracyBar
                label="Council (3 judges + Sonnet aggregator)"
                accuracy={stats.council?.accuracy}
                color="#d99058"
                kappa={stats.council?.cohensKappa}
                fnr={stats.council?.fnr}
                cost={stats.council?.avgCost}
              />
              <AccuracyBar
                label="Single Judge — OpenAI GPT-4o-mini (Faithfulness)"
                accuracy={stats.singleOpenai?.accuracy}
                color="#10A37F"
                kappa={stats.singleOpenai?.cohensKappa}
                fnr={stats.singleOpenai?.fnr}
                cost={stats.singleOpenai?.avgCost}
              />
              <AccuracyBar
                label="Single Judge — Gemini 2.0 Flash (Context Relevancy)"
                accuracy={stats.singleGemini?.accuracy}
                color="#4285F4"
                kappa={stats.singleGemini?.cohensKappa}
                fnr={stats.singleGemini?.fnr}
                cost={stats.singleGemini?.avgCost}
              />
            </div>
          </div>

          {/* Statistical detail table */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-surface-border">
              <h3 className="text-base font-bold text-text-primary">Statistical Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: '#F5F3EF' }}>
                  <tr className="border-b border-surface-border">
                    {['Evaluator', 'Accuracy', 'FNR', 'Precision', 'Recall', 'F1', "Cohen's κ", 'Brier', 'Avg Cost'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {[
                    { label: 'Council', key: 'council', hexColor: '#d99058' },
                    { label: 'Single (OpenAI)', key: 'singleOpenai', hexColor: '#10A37F' },
                    { label: 'Single (Gemini)', key: 'singleGemini', hexColor: '#4285F4' },
                  ].map(({ label, key, hexColor }) => {
                    const s = stats[key];
                    return (
                      <tr key={key} className="hover:bg-surface-secondary transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: hexColor }}>{label}</td>
                        <td className="px-4 py-3 text-sm text-text-primary font-medium">{pct(s?.accuracy)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">{pct(s?.fnr)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{pct(s?.precision)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{pct(s?.recall)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{round2(s?.f1)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{round2(s?.cohensKappa)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{round2(s?.brierScore)}</td>
                        <td className="px-4 py-3 text-xs text-text-secondary">
                          ${s?.avgCost < 0.001 ? s?.avgCost?.toFixed(6) : s?.avgCost?.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-domain breakdown */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-surface-border">
              <h3 className="text-base font-bold text-text-primary">Per-Domain Accuracy</h3>
              <p className="text-xs text-text-secondary mt-0.5">Council vs single-judge performance by domain</p>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: '#F5F3EF' }}>
                    <tr className="border-b border-surface-border">
                      <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider pb-3 px-2 pt-3">Domain</th>
                      <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider pb-3 px-2 pt-3">Cases</th>
                      <th className="text-left text-xs font-semibold uppercase tracking-wider pb-3 px-2 pt-3" style={{ color: '#d99058' }}>Council</th>
                      <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider pb-3 px-2 pt-3">Single (OpenAI)</th>
                      <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider pb-3 px-2 pt-3">Single (Gemini)</th>
                      <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider pb-3 px-2 pt-3">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {Object.keys(stats.council?.perDomain || {}).map(domain => {
                      const c = stats.council?.perDomain[domain];
                      const o = stats.singleOpenai?.perDomain?.[domain];
                      const g = stats.singleGemini?.perDomain?.[domain];
                      const d = c && o ? Math.round((c.accuracy - o.accuracy) * 100) : 0;
                      return (
                        <tr key={domain} className="hover:bg-surface-secondary transition-colors">
                          <td className="py-3 px-2 text-sm font-medium text-text-primary">{DOMAIN_LABELS[domain] || domain}</td>
                          <td className="py-3 px-2 text-sm text-text-secondary">{c?.total}</td>
                          <td className="py-3 px-2 text-sm font-semibold" style={{ color: '#d99058' }}>{pct(c?.accuracy)}</td>
                          <td className="py-3 px-2 text-sm text-text-secondary">{pct(o?.accuracy)}</td>
                          <td className="py-3 px-2 text-sm text-text-secondary">{pct(g?.accuracy)}</td>
                          <td className={`py-3 text-sm font-semibold ${d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-600' : 'text-text-tertiary'}`}>
                            {d > 0 ? `+${d}pp` : d < 0 ? `${d}pp` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Case explorer */}
          {caseResults.length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm">
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-base font-bold text-text-primary">Case Explorer</h3>
                <select
                  value={caseFilter}
                  onChange={e => setCaseFilter(e.target.value)}
                  className="text-xs text-text-secondary bg-surface-secondary border border-surface-border rounded-lg px-3 py-1.5"
                >
                  <option value="all">All cases</option>
                  <option value="disagreements">Disagreements</option>
                  <option value="council_wins">Council wins, single misses</option>
                  <option value="council_misses">Council misses, single wins</option>
                </select>
              </div>

              {/* Domain tabs */}
              <div className="flex items-center gap-6 px-6 border-b border-surface-border overflow-x-auto">
                {allDomains.map(d => (
                  <DomainTab
                    key={d}
                    domain={d === 'all' ? 'all' : d}
                    active={activeTab === d}
                    onClick={() => setActiveTab(d)}
                    accuracy={d !== 'all' ? stats.council?.perDomain?.[d]?.accuracy : undefined}
                  />
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Case ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Human</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Council</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">OpenAI</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Gemini</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Failure Mode</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {filteredCases.map((r, i) => (
                      <CaseRow
                        key={r.caseId || i}
                        r={r}
                        expanded={expandedCase === (r.caseId || i)}
                        onToggle={() => setExpandedCase(expandedCase === (r.caseId || i) ? null : (r.caseId || i))}
                      />
                    ))}
                  </tbody>
                </table>
                {filteredCases.length === 0 && (
                  <p className="text-center text-sm text-text-tertiary py-8">No cases match the current filter.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!stats && !running && (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-12 text-center">
          <p className="text-lg font-semibold text-text-primary mb-2">No benchmark runs yet</p>
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            Run the calibration benchmark to see how Quorum's council evaluation compares to single-LLM judges
            on 200+ curated test cases with human ground truth labels.
          </p>
          <button
            onClick={startBenchmark}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Play size={16} />
            Run Benchmark
          </button>
        </div>
      )}
    </div>
  );
}
