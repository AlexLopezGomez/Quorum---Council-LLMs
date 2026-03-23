import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Activity, AlertTriangle } from 'lucide-react';
import { getMonitoringScores, getMonitoringAlerts } from '../lib/api';
import { PageHeader } from './PageHeader';
import { Badge } from './ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { STATUS_BADGE_STYLES, STRATEGY_STYLE } from '../lib/constants';
import { formatRelative } from '../lib/utils';

const SCORE_COLORS = {
  pass: '#10B981',   // verdict-pass
  warn: '#F59E0B',   // verdict-warn
  neutral: '#3b3c36', // text-primary
  fail: '#EF4444',   // verdict-fail
};

function scoreColor(rolling, baseline) {
  if (baseline === null) return SCORE_COLORS.neutral;
  const drop = baseline - rolling;
  if (drop >= 20) return SCORE_COLORS.fail;
  if (drop >= 10) return SCORE_COLORS.warn;
  if (drop < 0) return SCORE_COLORS.pass;
  return SCORE_COLORS.neutral;
}


function computeBaseline(scores) {
  // scores is newest-first; baseline = oldest 10+ (index 10..end)
  if (scores.length < 20) return null;
  const baselineWindow = scores.slice(10).filter((s) => s.finalScore !== null);
  if (baselineWindow.length < 5) return null;
  const sum = baselineWindow.reduce((a, b) => a + b.finalScore, 0);
  return sum / baselineWindow.length;
}

function computeRollingMean(scores) {
  const window = scores.slice(0, Math.min(10, scores.length)).filter((s) => s.finalScore !== null);
  if (window.length === 0) return null;
  return window.reduce((a, b) => a + b.finalScore, 0) / window.length;
}

function KpiCard({ label, value, valueColor, sub }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-tertiary mb-2">{label}</p>
      <p className="text-3xl font-semibold" style={{ color: valueColor || '#3b3c36' }}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

function DriftAlertBanner({ alert }) {
  if (!alert) return null;
  const isCritical = alert.severity === 'critical';
  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 ${
        isCritical
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
      role="alert"
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span className="text-sm">
        <strong>{isCritical ? 'Critical drift' : 'Quality warning'}:</strong> Score dropped{' '}
        {Math.round(alert.drop)}pts below baseline ({Math.round(alert.rollingMean)} vs{' '}
        {Math.round(alert.baselineMean)} baseline) · {formatRelative(alert.createdAt)}
      </span>
    </div>
  );
}

function ChartTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const verdict = d?.verdict;
  const badgeClass = STATUS_BADGE_STYLES[verdict?.toLowerCase()] || '';
  return (
    <div className="bg-surface border border-surface-border rounded-lg shadow-lg p-3 text-sm">
      <p className="text-2xl font-semibold text-text-primary">
        {d?.finalScore !== null ? Math.round(d.finalScore) : '—'}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {verdict && (
          <Badge variant="outline" className={`rounded-full text-xs ${badgeClass}`}>
            {verdict}
          </Badge>
        )}
        {d?.strategy && (
          <span className="text-xs text-text-tertiary">{d.strategy}</span>
        )}
      </div>
      <p className="text-xs text-text-tertiary mt-1">{formatRelative(d?.completedAt)}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-16 text-center gap-3">
      <Activity size={32} className="text-text-tertiary" />
      <p className="text-sm font-semibold text-text-primary">No live samples yet</p>
      <p className="text-sm text-text-secondary max-w-xs">
        Point <code className="font-mono text-xs bg-surface-tertiary px-1 py-0.5 rounded">POST /api/sample</code> at this workspace to start monitoring.
      </p>
      <pre className="mt-2 text-left bg-surface-tertiary rounded-lg p-3 text-xs font-mono text-text-secondary max-w-sm w-full overflow-x-auto">{`fetch('/api/sample', {
  method: 'POST',
  headers: { Authorization: 'Bearer ...' },
  body: JSON.stringify({ query, response, contexts })
}).catch(() => {})`}</pre>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6 animate-pulse">
      <div className="h-2 w-20 bg-surface-tertiary rounded mb-3" />
      <div className="h-8 w-16 bg-surface-tertiary rounded" />
    </div>
  );
}

export function MonitoringDashboard() {
  const [scores, setScores] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [scoresData, alertsData] = await Promise.all([
        getMonitoringScores(50),
        getMonitoringAlerts(),
      ]);
      setScores(scoresData.scores ?? []);
      setAlerts(alertsData.alerts ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasData = scores && scores.length > 0;
  const baselineMean = hasData ? computeBaseline(scores) : null;
  const rollingMean = hasData ? computeRollingMean(scores) : null;
  const baselineEstablished = baselineMean !== null;
  const activeAlert = alerts?.[0] && new Date(alerts[0].createdAt) > new Date(Date.now() - 6 * 60 * 60 * 1000)
    ? alerts[0]
    : null;

  // Chart expects chronological order (oldest first)
  const chartData = hasData ? [...scores].reverse() : [];

  return (
    <div className="animate-fadeInUp">
      <PageHeader
        title="Monitoring"
        subtitle="Live production traffic — sampled evaluations"
        icon={Activity}
      />

      {activeAlert && <DriftAlertBanner alert={activeAlert} />}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KpiCard
              label="Rolling Mean Score"
              value={rollingMean !== null ? Math.round(rollingMean) : '—'}
              valueColor={rollingMean !== null ? scoreColor(rollingMean, baselineMean) : undefined}
              sub={rollingMean !== null ? 'Last 10 samples' : scores.length === 0 ? 'No samples yet' : 'Need 5+ samples'}
            />
            <KpiCard
              label="Baseline Score"
              value={baselineEstablished ? Math.round(baselineMean) : '—'}
              sub={baselineEstablished ? 'Samples 11–30' : 'Establishing baseline…'}
            />
            <KpiCard
              label="Total Samples"
              value={scores?.length ?? '—'}
              sub="Live evaluations"
            />
          </>
        )}
      </div>

      {/* Score Chart */}
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-text-primary">Score Trend</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="h-48 sm:h-72 bg-surface-tertiary rounded-lg animate-shimmer" />
          ) : !hasData ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <title>Live sample score trend</title>
                <desc>Time-series chart showing council evaluation scores for live production samples</desc>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDD9D1" />
                <XAxis
                  dataKey="completedAt"
                  tickFormatter={formatRelative}
                  tick={{ fill: '#9e9d97', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#9e9d97', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<ChartTooltipContent />} />
                {baselineEstablished && (
                  <>
                    <ReferenceLine
                      y={baselineMean}
                      stroke="#F59E0B"
                      strokeDasharray="5 3"
                      label={{ value: 'Baseline', fill: '#F59E0B', fontSize: 10, position: 'insideTopRight' }}
                    />
                    <ReferenceLine
                      y={baselineMean - 10}
                      stroke="#EF4444"
                      strokeDasharray="3 3"
                      strokeOpacity={0.4}
                    />
                    <ReferenceLine
                      y={baselineMean - 20}
                      stroke="#EF4444"
                      strokeDasharray="3 3"
                      strokeOpacity={0.7}
                    />
                  </>
                )}
                <Line
                  type="monotone"
                  dataKey="finalScore"
                  stroke="#d99058"
                  strokeWidth={2}
                  dot={{ fill: '#d99058', stroke: '#fff', strokeWidth: 2, r: 3 }}
                  activeDot={{ fill: '#d99058', stroke: '#fff', strokeWidth: 2, r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Samples Table */}
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-text-primary">Recent Samples</h2>
        </div>
        {loading ? (
          <div className="divide-y divide-surface-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-3 flex gap-4 animate-pulse">
                <div className="h-3 flex-1 bg-surface-tertiary rounded" />
                <div className="h-3 w-10 bg-surface-tertiary rounded" />
                <div className="h-3 w-14 bg-surface-tertiary rounded" />
              </div>
            ))}
          </div>
        ) : !hasData ? (
          <div className="px-6 py-8 text-sm text-text-tertiary text-center">
            No samples yet — send some requests to see them here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-text-secondary uppercase tracking-wider">Query</TableHead>
                  <TableHead className="text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Strategy</TableHead>
                  <TableHead className="text-xs font-medium text-text-secondary uppercase tracking-wider">Score</TableHead>
                  <TableHead className="text-xs font-medium text-text-secondary uppercase tracking-wider">Verdict</TableHead>
                  <TableHead className="text-xs font-medium text-text-secondary uppercase tracking-wider">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-surface-border">
                {scores.map((s) => {
                  const strategyConfig = s.strategy ? STRATEGY_STYLE[s.strategy] : null;
                  const verdictLower = s.verdict?.toLowerCase();
                  return (
                    <TableRow key={s.jobId} className="hover:bg-surface-secondary transition-colors">
                      <TableCell className="text-sm text-text-primary max-w-[200px] truncate" title={s.query}>
                        {s.jobId}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {strategyConfig ? (
                          <Badge variant="outline" className={`rounded-full gap-1.5 ${strategyConfig.bg} ${strategyConfig.text} ${strategyConfig.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${strategyConfig.dot}`} />
                            {strategyConfig.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-text-primary">
                        {s.finalScore !== null ? Math.round(s.finalScore) : '—'}
                      </TableCell>
                      <TableCell>
                        {s.verdict ? (
                          <Badge variant="outline" className={`rounded-full ${STATUS_BADGE_STYLES[verdictLower] || ''}`}>
                            {s.verdict}
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-text-tertiary whitespace-nowrap">
                        {formatRelative(s.completedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
