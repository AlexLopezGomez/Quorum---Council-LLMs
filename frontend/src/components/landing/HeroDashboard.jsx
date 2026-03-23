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
  /* Discrete state only — no animated values here */
  const [phase, setPhase]           = useState(0);
  const [avgScore, setAvgScore]     = useState(81);
  const [hAreaOp, setHAreaOp]       = useState(0);
  const [dAreaOp, setDAreaOp]       = useState(0);
  const [showBeacon, setShowBeacon] = useState(false);
  const [kpiShaking, setKpiShaking] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [alertDetail, setAlertDetail] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  const timers = useRef([]);
  const rafH   = useRef(null);
  const rafD   = useRef(null);
  const rafC   = useRef(null);

  /* DOM refs for SVG elements driven by scan animation */
  const clipHRect   = useRef(null);
  const clipDRect   = useRef(null);
  const beamHLine   = useRef(null);
  const beamDLine   = useRef(null);
  const dotCircles  = useRef([]);   // indexed by ALL_PTS index
  const dotRipples  = useRef([]);   // indexed by ALL_PTS index

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

  /* rAF-driven scan — updates SVG DOM directly, no setState */
  const runScan = useCallback((
    clipRect, beamLine, dotIndices, startX, width, rafRef, duration, onDone
  ) => {
    const start = performance.now();
    function frame(now) {
      const t   = Math.min(1, (now - start) / duration);
      const pos = easeInOutQuad(t);

      if (clipRect) clipRect.setAttribute('width', Math.max(0, pos * width + 10).toFixed(1));

      if (beamLine) {
        if (pos > 0.01 && pos < 0.99) {
          const x = (startX + pos * width).toFixed(1);
          beamLine.setAttribute('x1', x);
          beamLine.setAttribute('x2', x);
          beamLine.setAttribute('opacity', (0.55 * (1 - pos * 0.4)).toFixed(3));
          beamLine.style.display = '';
        } else {
          beamLine.style.display = 'none';
        }
      }

      const thresh = startX + pos * width + 1;
      dotIndices.forEach(i => {
        const dotEl    = dotCircles.current[i];
        const rippleEl = dotRipples.current[i];
        if (!dotEl) return;
        const nowVisible = ALL_PTS[i].x <= thresh;
        const wasHidden  = dotEl.getAttribute('opacity') === '0';
        dotEl.setAttribute('opacity', nowVisible ? '1' : '0');
        if (nowVisible && wasHidden && rippleEl) {
          rippleEl.style.display = '';
          rippleEl.style.animation = 'none';
          void rippleEl.offsetWidth; // force reflow to restart CSS animation
          rippleEl.style.animation = '';
        }
      });

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

    /* ── Reset DOM scan state ── */
    if (clipHRect.current) clipHRect.current.setAttribute('width', '0');
    if (clipDRect.current) clipDRect.current.setAttribute('width', '0');
    if (beamHLine.current) beamHLine.current.style.display = 'none';
    if (beamDLine.current) beamDLine.current.style.display = 'none';
    dotCircles.current.forEach(el => el?.setAttribute('opacity', '0'));
    dotRipples.current.forEach(el => { if (el) el.style.display = 'none'; });

    /* ── Reset React state ── */
    setPhase(0);
    setAvgScore(81);
    setHAreaOp(0); setDAreaOp(0);
    setShowBeacon(false);
    setKpiShaking(false);
    setAlertActive(false);
    setAlertDetail(false);
    setShowTagline(false);

    /* ── t=300ms: healthy scan ── */
    tick(() => {
      setPhase(1);
      runScan(
        clipHRect.current, beamHLine.current,
        Array.from({ length: SPLIT }, (_, i) => i),
        CX, CW, rafH, 1500,
        () => setHAreaOp(1)
      );
    }, 300);

    /* ── t=2000ms: drop scan ── */
    tick(() => {
      setPhase(2);
      runScan(
        clipDRect.current, beamDLine.current,
        Array.from({ length: SCORES.length - SPLIT }, (_, i) => SPLIT + i),
        DROP_START_X, DROP_WIDTH, rafD, 1200,
        () => { setDAreaOp(1); setShowBeacon(true); }
      );
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

  /* ── Derived (only recalculated when avgScore changes) ── */
  const kpiColor   = avgScore < 70 ? '#EF4444' : avgScore < 78 ? '#F59E0B' : '#10B981';
  const trendText  = avgScore < 70 ? 'Degraded ↓' : avgScore < 78 ? 'Declining ↓' : 'Stable →';
  const cardBorder = avgScore < 70 ? '#3d1515' : avgScore < 78 ? '#3d2a0a' : '#1a2d1a';

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
                {/* Clip paths reveal lines as beam travels */}
                <clipPath id="hdClipH">
                  <rect ref={clipHRect} x={CX - 10} y={-10} width={0} height={CY + CH + 60} />
                </clipPath>
                <clipPath id="hdClipD">
                  <rect ref={clipDRect} x={DROP_START_X - 10} y={-10} width={0} height={CY + CH + 60} />
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

              {/* ── Healthy area fill ── */}
              {phase >= 1 && (
                <path
                  d={area(HEALTHY_PTS, CHART_BOTTOM)}
                  fill="url(#hdGH)"
                  opacity={hAreaOp}
                  style={{ transition: 'opacity 0.7s ease' }}
                />
              )}

              {/* ── Drop area fill ── */}
              {phase >= 2 && (
                <path
                  d={area(DROP_PTS, CHART_BOTTOM)}
                  fill="url(#hdGD)"
                  opacity={dAreaOp}
                  style={{ transition: 'opacity 0.7s ease' }}
                />
              )}

              {/* ── Healthy line ── */}
              {phase >= 1 && (
                <g clipPath="url(#hdClipH)">
                  <path d={line(HEALTHY_PTS)} fill="none" stroke="#10B981"
                    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}

              {/* ── Healthy beam — always rendered, display toggled by DOM ref ── */}
              {phase >= 1 && (
                <line
                  ref={beamHLine}
                  x1={CX} y1={CY - 8}
                  x2={CX} y2={CY + CH + 12}
                  stroke="#10B981" strokeWidth={4}
                  opacity={0}
                  style={{ display: 'none', filter: 'blur(2.5px)', willChange: 'transform' }}
                />
              )}

              {/* ── Drop line ── */}
              {phase >= 2 && (
                <g clipPath="url(#hdClipD)">
                  <path d={line(DROP_PTS)} fill="none" stroke="#EF4444"
                    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}

              {/* ── Drop beam ── */}
              {phase >= 2 && (
                <line
                  ref={beamDLine}
                  x1={DROP_START_X} y1={CY - 8}
                  x2={DROP_START_X} y2={CY + CH + 12}
                  stroke="#EF4444" strokeWidth={4}
                  opacity={0}
                  style={{ display: 'none', filter: 'blur(2.5px)', willChange: 'transform' }}
                />
              )}

              {/* ── Dots — always rendered, opacity controlled via DOM ref ── */}
              {ALL_PTS.map((p, i) => {
                const isDrop   = i >= SPLIT;
                const dotColor = isDrop ? '#EF4444' : '#10B981';
                return (
                  <g key={i}>
                    <circle
                      ref={el => { dotRipples.current[i] = el; }}
                      cx={p.x} cy={p.y} r={3.5}
                      fill="none" stroke={dotColor} strokeWidth={1.5}
                      className="hd-dot-ripple"
                      style={{ display: 'none' }}
                    />
                    <circle
                      ref={el => { dotCircles.current[i] = el; }}
                      cx={p.x} cy={p.y} r={3.5}
                      fill={dotColor}
                      stroke="#141210" strokeWidth={1.5}
                      opacity={0}
                      style={{ transition: 'opacity 0.25s ease' }}
                    />
                  </g>
                );
              })}

              {/* ── Inflection point beacon ── */}
              {showBeacon && phase >= 2 && (
                <circle
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
