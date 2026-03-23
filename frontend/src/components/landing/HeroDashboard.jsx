import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';

/* ─── Chart geometry ─────────────────────────────────────── */
const SCORES = [81, 83, 79, 84, 82, 80, 84, 81, 74, 68, 62, 59];
const SPLIT = 8;
const CW = 640, CH = 108, CX = 44, CY = 12;

function sy(s) { return CY + ((93 - s) / 43) * CH; }

const ALL_PTS = SCORES.map((s, i) => ({
  x: CX + (i / (SCORES.length - 1)) * CW,
  y: sy(s),
}));
const HEALTHY_PTS  = ALL_PTS.slice(0, SPLIT);
const DROP_PTS     = ALL_PTS.slice(SPLIT - 1);
const CHART_BOTTOM = CY + CH + 6;
const GRID         = [60, 70, 80, 90];
const DROP_START_X = DROP_PTS[0].x;
const DROP_WIDTH   = CX + CW - DROP_START_X;

function line(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}
function area(pts, bot) {
  if (pts.length < 2) return '';
  const f = pts[0], l = pts[pts.length - 1];
  return `${line(pts)} L ${l.x.toFixed(1)} ${bot} L ${f.x.toFixed(1)} ${bot} Z`;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
}

const LOOP_MS = 9000;

/* ─── Tagline words ──────────────────────────────────────── */
const TAGLINE = [
  { text: 'Catch ',             delay: 0,    copper: false },
  { text: 'silent ',            delay: 0.06, copper: false },
  { text: 'model ',             delay: 0.12, copper: false },
  { text: 'degradation ',      delay: 0.18, copper: false },
  { text: 'before your client does.', delay: 0.26, copper: true },
];

export default function HeroDashboard() {
  const [phase, setPhase]           = useState(0);
  const [avgScore, setAvgScore]     = useState(81);
  const [scanH, setScanH]           = useState(0);   // 0→1 healthy beam
  const [scanD, setScanD]           = useState(0);   // 0→1 drop beam
  const [hAreaOp, setHAreaOp]       = useState(0);   // area fill opacity
  const [dAreaOp, setDAreaOp]       = useState(0);
  const [showBeacon, setShowBeacon] = useState(false);
  const [kpiShaking, setKpiShaking] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [alertDetail, setAlertDetail] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [loopKey, setLoopKey]       = useState(0);   // forces ripple remount

  const timers = useRef([]);
  const rafH   = useRef(null);
  const rafD   = useRef(null);
  const rafC   = useRef(null);

  const cancelRafs = useCallback(() => {
    if (rafH.current) { cancelAnimationFrame(rafH.current); rafH.current = null; }
    if (rafD.current) { cancelAnimationFrame(rafD.current); rafD.current = null; }
    if (rafC.current) { cancelAnimationFrame(rafC.current); rafC.current = null; }
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelRafs();
  }, [cancelRafs]);

  const tick = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  /* rAF-driven progress scanner: 0→1 over `duration` ms */
  const runScan = useCallback((setter, rafRef, duration, onDone) => {
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      setter(easeInOutQuad(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        onDone?.();
      }
    }
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  /* rAF-driven smooth counter */
  const runCounter = useCallback((from, to, duration) => {
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      setAvgScore(Math.round(from + (to - from) * easeInOutQuart(t)));
      if (t < 1) {
        rafC.current = requestAnimationFrame(frame);
      } else {
        rafC.current = null;
      }
    }
    rafC.current = requestAnimationFrame(frame);
  }, []);

  const runLoop = useCallback(() => {
    clearTimers();

    /* ── Reset ── */
    setPhase(0);
    setAvgScore(81);
    setScanH(0); setScanD(0);
    setHAreaOp(0); setDAreaOp(0);
    setShowBeacon(false);
    setKpiShaking(false);
    setAlertActive(false);
    setAlertDetail(false);
    setShowTagline(false);
    setLoopKey(k => k + 1);

    /* ── t=300ms: healthy line beam starts ── */
    tick(() => {
      setPhase(1);
      runScan(setScanH, rafH, 1500, () => setHAreaOp(1));
    }, 300);

    /* ── t=2000ms: drop line beam starts ── */
    tick(() => {
      setPhase(2);
      runScan(setScanD, rafD, 1200, () => {
        setDAreaOp(1);
        setShowBeacon(true);
      });
    }, 2000);

    /* ── t=3400ms: alert fires ── */
    tick(() => {
      setPhase(3);
      setAlertActive(true);
      setKpiShaking(true);
      tick(() => setKpiShaking(false), 500);
      tick(() => setAlertDetail(true), 350);
      runCounter(81, 62, 1100);
    }, 3400);

    /* ── t=4500ms: tagline reveals ── */
    tick(() => { setPhase(4); setShowTagline(true); }, 4500);

    /* ── t=5200ms: hold ── */
    tick(() => setPhase(5), 5200);

    /* ── loop ── */
    tick(runLoop, LOOP_MS);
  }, [clearTimers, tick, runScan, runCounter]);

  useEffect(() => {
    const t = setTimeout(runLoop, 600);
    return () => { clearTimeout(t); clearTimers(); };
  }, [runLoop, clearTimers]);

  /* ── Derived ── */
  const kpiColor   = avgScore < 70 ? '#EF4444' : avgScore < 78 ? '#F59E0B' : '#10B981';
  const trendText  = avgScore < 70 ? 'Degraded ↓' : avgScore < 78 ? 'Declining ↓' : 'Stable →';
  const cardBorder = avgScore < 70 ? '#3d1515' : avgScore < 78 ? '#3d2a0a' : '#1a2d1a';

  /* dot visibility driven by beam position */
  function isDotVisible(i) {
    if (i < SPLIT) return ALL_PTS[i].x <= CX + scanH * CW + 1;
    return ALL_PTS[i].x <= DROP_START_X + scanD * DROP_WIDTH + 1;
  }

  return (
    <motion.div
      className={`hero-dashboard-wrap${alertActive ? ' hero-dashboard-wrap--alert' : ''}`}
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="hero-dashboard-tilt">
        <div className="hd-window">

          {/* Alert banner */}
          <div className="hd-alert" style={{
            transform: `translateY(${alertActive ? '0%' : '-110%'})`,
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
          }}>
            <span className="hd-alert-icon">⚠</span>
            <span className="hd-alert-text">
              <strong>Quality drift detected</strong>
              <span className="hd-alert-detail" style={{
                opacity: alertDetail ? 1 : 0,
                transition: 'opacity 0.4s ease 0.1s',
              }}> — 19pt drop vs. baseline · rolling mean: 62</span>
            </span>
            <span className="hd-alert-badge" style={{
              animation: alertActive ? 'alertGlow 1.8s ease-in-out infinite' : 'none',
            }}>WARNING</span>
          </div>

          {/* Title bar */}
          <div className="hd-titlebar">
            <span className="hd-dots"><i /><i /><i /></span>
            <span className="hd-title">Quorum · Quality Monitor</span>
            <span className="hd-live">
              <span className="hd-live-dot" />
              Live
            </span>
          </div>

          {/* KPI row */}
          <div className="hd-kpi-row">
            <KpiCard
              label="Avg Score"
              value={avgScore}
              valueColor={kpiColor}
              sub="rolling 10 evals"
              borderColor={cardBorder}
              shaking={kpiShaking}
            />
            <KpiCard
              label="Trend"
              value={trendText}
              valueColor={kpiColor}
              sub={avgScore < 75 ? 'vs. baseline 81' : 'within range'}
              borderColor={cardBorder}
            />
            <KpiCard
              label="Alerts"
              value={alertActive ? '1' : '0'}
              valueColor={alertActive ? '#EF4444' : '#10B981'}
              sub={alertActive ? 'warning active' : 'all clear'}
              borderColor={alertActive ? '#3d1515' : '#1a2d1a'}
            />
          </div>

          {/* Chart */}
          <div className="hd-chart-wrap">
            <div className="hd-chart-label">Score Trend — Last 12 Evaluations</div>
            <svg
              viewBox={`0 0 ${CX + CW + 20} ${CY + CH + 30}`}
              width="100%"
              style={{ display: 'block', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="hdGH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hdGD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <filter id="hdBeamBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
                {/* Clip paths reveal lines as beam travels */}
                <clipPath id="hdClipH">
                  <rect x={CX - 10} y={-10} width={Math.max(0, scanH * CW + 10)} height={CY + CH + 60} />
                </clipPath>
                <clipPath id="hdClipD">
                  <rect x={DROP_START_X - 10} y={-10} width={Math.max(0, scanD * DROP_WIDTH + 10)} height={CY + CH + 60} />
                </clipPath>
              </defs>

              {/* Grid */}
              {GRID.map(s => (
                <g key={s}>
                  <line x1={CX} y1={sy(s)} x2={CX + CW} y2={sy(s)}
                    stroke="#252018" strokeWidth={1} strokeDasharray="3 5" />
                  <text x={CX - 7} y={sy(s) + 4} textAnchor="end" fill="#3a3630" fontSize={9}>{s}</text>
                </g>
              ))}

              {/* Baseline */}
              <line x1={CX} y1={sy(81)} x2={CX + CW} y2={sy(81)}
                stroke="#d99058" strokeWidth={1} strokeDasharray="4 6" opacity={0.22} />
              <text x={CX + CW + 4} y={sy(81) + 4} fill="#d99058" fontSize={9} opacity={0.4}>baseline</text>

              {/* ── Healthy area fill (fades in after beam) ── */}
              {phase >= 1 && (
                <path
                  d={area(HEALTHY_PTS, CHART_BOTTOM)}
                  fill="url(#hdGH)"
                  opacity={hAreaOp}
                  style={{ transition: 'opacity 0.7s ease' }}
                />
              )}

              {/* ── Drop area fill (fades in after beam) ── */}
              {phase >= 2 && (
                <path
                  d={area(DROP_PTS, CHART_BOTTOM)}
                  fill="url(#hdGD)"
                  opacity={dAreaOp}
                  style={{ transition: 'opacity 0.7s ease' }}
                />
              )}

              {/* ── Healthy line (revealed by clip beam) ── */}
              {phase >= 1 && (
                <g clipPath="url(#hdClipH)">
                  <path d={line(HEALTHY_PTS)} fill="none" stroke="#10B981"
                    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}

              {/* ── Healthy beam glow ── */}
              {phase >= 1 && scanH > 0.01 && scanH < 0.99 && (
                <line
                  x1={CX + scanH * CW} y1={CY - 8}
                  x2={CX + scanH * CW} y2={CY + CH + 12}
                  stroke="#10B981" strokeWidth={4}
                  opacity={0.55 * (1 - scanH * 0.4)}
                  filter="url(#hdBeamBlur)"
                />
              )}

              {/* ── Drop line (revealed by clip beam) ── */}
              {phase >= 2 && (
                <g clipPath="url(#hdClipD)">
                  <path d={line(DROP_PTS)} fill="none" stroke="#EF4444"
                    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}

              {/* ── Drop beam glow ── */}
              {phase >= 2 && scanD > 0.01 && scanD < 0.99 && (
                <line
                  x1={DROP_START_X + scanD * DROP_WIDTH} y1={CY - 8}
                  x2={DROP_START_X + scanD * DROP_WIDTH} y2={CY + CH + 12}
                  stroke="#EF4444" strokeWidth={4}
                  opacity={0.55 * (1 - scanD * 0.4)}
                  filter="url(#hdBeamBlur)"
                />
              )}

              {/* ── Dots with ripple animation ── */}
              {ALL_PTS.map((p, i) => {
                const visible  = isDotVisible(i);
                const isDrop   = i >= SPLIT;
                const dotColor = isDrop ? '#EF4444' : '#10B981';
                return (
                  <g key={i}>
                    {/* ripple fires once on mount, remounts each loop via loopKey */}
                    {visible && phase >= 1 && (
                      <circle
                        key={`r-${i}-${loopKey}`}
                        cx={p.x} cy={p.y} r={3.5}
                        fill="none" stroke={dotColor} strokeWidth={1.5}
                        className="hd-dot-ripple"
                      />
                    )}
                    {/* dot fades in when beam passes */}
                    <circle
                      cx={p.x} cy={p.y} r={3.5}
                      fill={dotColor}
                      stroke="#141210" strokeWidth={1.5}
                      opacity={visible && phase >= 1 ? 1 : 0}
                      style={{ transition: 'opacity 0.25s ease' }}
                    />
                  </g>
                );
              })}

              {/* ── Inflection point beacon (amber pulse at split) ── */}
              {showBeacon && phase >= 2 && (
                <circle
                  key={`beacon-${loopKey}`}
                  cx={ALL_PTS[SPLIT - 1].x} cy={ALL_PTS[SPLIT - 1].y}
                  r={6} fill="none" stroke="#d99058" strokeWidth={1.5}
                  className="hd-beacon"
                />
              )}
            </svg>
          </div>

          {/* Tagline — word stagger */}
          <div className="hd-tagline">
            {TAGLINE.map((part, i) => (
              <motion.span
                key={i}
                initial={false}
                animate={showTagline ? { opacity: 1, y: 0 } : { opacity: 0, y: 7 }}
                transition={{
                  duration: 0.5,
                  delay: showTagline ? part.delay : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={part.copper ? { color: '#d99058', fontWeight: 500 } : {}}
              >
                {part.text}
              </motion.span>
            ))}
          </div>

        </div>{/* hd-window */}
      </div>{/* hero-dashboard-tilt */}

      <div className="hd-reflection" />
    </motion.div>
  );
}

function KpiCard({ label, value, valueColor, sub, borderColor, shaking }) {
  return (
    <div className="hd-kpi-card" style={{ borderColor: borderColor || '#2d2820' }}>
      <div className="hd-kpi-label">{label}</div>
      <div className={`hd-kpi-value${shaking ? ' hd-kpi-shake' : ''}`} style={{ color: valueColor }}>
        {value}
      </div>
      {sub && <div className="hd-kpi-sub">{sub}</div>}
    </div>
  );
}
