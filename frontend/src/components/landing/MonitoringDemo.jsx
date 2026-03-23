import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Player } from '@remotion/player';

/* ─────────────────────────────────────────
   Chart geometry
───────────────────────────────────────── */
const SCORES = [81, 83, 79, 84, 82, 80, 84, 81, 74, 68, 62, 59];
const HEALTHY_COUNT = 8;
const CW = 620; // chart draw width
const CH = 130; // chart draw height
const CX = 50;  // chart left offset (room for y-axis labels)
const CY = 14;  // chart top offset

// Map score → SVG y (range 50–95)
function sy(score) {
  return CY + ((95 - score) / 45) * CH;
}

const ALL_PTS = SCORES.map((s, i) => ({
  x: CX + (i / (SCORES.length - 1)) * CW,
  y: sy(s),
  score: s,
  isDrop: i >= HEALTHY_COUNT,
}));

const CHART_BOTTOM = CY + CH + 8;
const GRID_SCORES = [60, 70, 80, 90];

function svgLine(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

function svgArea(pts, bottom) {
  if (pts.length < 2) return '';
  const f = pts[0];
  const l = pts[pts.length - 1];
  return `${svgLine(pts)} L ${l.x.toFixed(1)} ${bottom} L ${f.x.toFixed(1)} ${bottom} Z`;
}

/* ─────────────────────────────────────────
   Animation timing (frames @ 30fps)
───────────────────────────────────────── */
const T = {
  lineStart:   22,
  healthyDone: 115,
  dropDone:    205,
  alertIn:     205,
  alertFull:   240,
  kpiDrop:     130,
  kpiLow:      210,
  tagIn:       275,
  tagFull:     340,
  fadeStart:   450,
  end:         480,
};

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function KpiCard({ label, value, valueColor, sub }) {
  return (
    <div style={{
      background: '#1b1714',
      border: '1px solid #2d2820',
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 128,
      flex: '0 0 auto',
    }}>
      <div style={{
        fontSize: 10,
        color: '#5a5450',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22,
        fontWeight: 600,
        color: valueColor ?? '#F5F3EF',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: '#6b6460', marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

function AlertBanner({ progress }) {
  const translateY = interpolate(progress, [0, 1], [-100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      background: '#2d0f06',
      borderBottom: '1px solid #6b2010',
      padding: '9px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      transform: `translateY(${translateY}%)`,
      zIndex: 20,
    }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>⚠</span>
      <div style={{ fontSize: 12, color: '#fb923c', fontWeight: 600 }}>
        Quality drift detected
        <span style={{ fontWeight: 400, color: '#8b5030', marginLeft: 6 }}>
          — 19pt drop vs. baseline · rolling mean: 62 · baseline: 81
        </span>
      </div>
      <div style={{
        marginLeft: 'auto',
        background: '#7c2d12',
        color: '#fb923c',
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 3,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
      }}>
        WARNING
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main composition
───────────────────────────────────────── */
export function MonitoringComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Window entrance
  const windowOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const windowScale = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 130, mass: 0.7 },
    from: 0.93,
    to: 1,
  });

  // Line drawing progress
  const healthyProg = interpolate(frame, [T.lineStart, T.healthyDone], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const dropProg = interpolate(frame, [T.healthyDone, T.dropDone], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  // Build visible points
  const visibleFloat = healthyProg * HEALTHY_COUNT + dropProg * (SCORES.length - HEALTHY_COUNT);
  const visibleWhole = Math.floor(visibleFloat);
  const frac = visibleFloat - visibleWhole;

  const drawPts = [];
  for (let i = 0; i < Math.min(visibleWhole, SCORES.length); i++) {
    drawPts.push(ALL_PTS[i]);
  }
  if (visibleWhole < SCORES.length && visibleFloat > 0) {
    const prev = ALL_PTS[Math.max(0, visibleWhole - 1)];
    const next = ALL_PTS[Math.min(visibleWhole, SCORES.length - 1)];
    drawPts.push({
      x: prev.x + (next.x - prev.x) * frac,
      y: prev.y + (next.y - prev.y) * frac,
      score: prev.score + (next.score - prev.score) * frac,
      isDrop: next.isDrop,
    });
  }

  // Split into healthy + drop segments
  const healthyPts = drawPts.filter(p => !p.isDrop);
  const splitIdx = drawPts.findIndex(p => p.isDrop);
  const dropPts = splitIdx > 0
    ? [drawPts[splitIdx - 1], ...drawPts.slice(splitIdx)]
    : [];

  // Alert
  const alertProg = interpolate(frame, [T.alertIn, T.alertFull], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.4)),
  });

  // KPI: avg score counter
  const avgScore = Math.round(
    interpolate(frame, [T.kpiDrop, T.kpiLow], [81, 62], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const scoreColor = avgScore < 68 ? '#EF4444' : avgScore < 76 ? '#F59E0B' : '#10B981';
  const trendText = avgScore < 68 ? 'Degraded ↓' : avgScore < 76 ? 'Declining ↓' : 'Stable →';
  const trendColor = scoreColor;

  // Tagline
  const tagOpacity = interpolate(frame, [T.tagIn, T.tagFull], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagY = interpolate(frame, [T.tagIn, T.tagFull], [8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out for seamless loop
  const opacity = interpolate(frame, [T.fadeStart, T.end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      background: '#0b0907',
      opacity,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Dashboard window */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -52%) scale(${windowScale})`,
        opacity: windowOpacity,
        width: 780,
        background: '#141210',
        border: '1px solid #252018',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 20px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
      }}>
        {/* Alert */}
        <AlertBanner progress={alertProg} />

        {/* Title bar */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #252018',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#38302a', '#38302a', '#38302a'].map((c, i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ width: 1, height: 14, background: '#252018', margin: '0 4px' }} />
          <div style={{ fontSize: 11.5, color: '#5a5450' }}>Quorum · Quality Monitor</div>
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: '#d99058',
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#d99058',
              boxShadow: '0 0 5px #d99058',
            }} />
            Live
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 18px 0' }}>
          <KpiCard
            label="Avg Score"
            value={avgScore}
            valueColor={scoreColor}
            sub="rolling 10 evals"
          />
          <KpiCard
            label="Trend"
            value={trendText}
            valueColor={trendColor}
            sub={avgScore < 75 ? 'vs. baseline 81' : 'within normal range'}
          />
          <KpiCard
            label="Alerts"
            value={alertProg > 0.5 ? '1' : '0'}
            valueColor={alertProg > 0.5 ? '#EF4444' : '#10B981'}
            sub={alertProg > 0.5 ? 'warning active' : 'all clear'}
          />
        </div>

        {/* Chart */}
        <div style={{ padding: '14px 18px 18px' }}>
          <div style={{
            fontSize: 10,
            color: '#4a4440',
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            marginBottom: 8,
          }}>
            Score Trend — Last 12 Evaluations
          </div>

          <svg
            width="100%"
            viewBox={`0 0 ${CX + CW + 24} ${CY + CH + 32}`}
            style={{ display: 'block' }}
          >
            {/* Grid */}
            {GRID_SCORES.map(s => (
              <g key={s}>
                <line
                  x1={CX} y1={sy(s)} x2={CX + CW} y2={sy(s)}
                  stroke="#222018" strokeWidth={1} strokeDasharray="3 5"
                />
                <text
                  x={CX - 7} y={sy(s) + 4}
                  textAnchor="end" fill="#3a3630" fontSize={9}
                >
                  {s}
                </text>
              </g>
            ))}

            {/* Baseline dashed reference */}
            <line
              x1={CX} y1={sy(81)} x2={CX + CW} y2={sy(81)}
              stroke="#d99058" strokeWidth={1}
              strokeDasharray="4 5" opacity={0.25}
            />
            <text
              x={CX + CW + 4} y={sy(81) + 4}
              fill="#d99058" fontSize={9} opacity={0.4}
            >
              baseline
            </text>

            <defs>
              <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Area fills */}
            {healthyPts.length > 1 && (
              <path d={svgArea(healthyPts, CHART_BOTTOM)} fill="url(#gH)" />
            )}
            {dropPts.length > 1 && (
              <path d={svgArea(dropPts, CHART_BOTTOM)} fill="url(#gD)" />
            )}

            {/* Lines */}
            {healthyPts.length > 1 && (
              <path
                d={svgLine(healthyPts)}
                fill="none" stroke="#10B981" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"
              />
            )}
            {dropPts.length > 1 && (
              <path
                d={svgLine(dropPts)}
                fill="none" stroke="#EF4444" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"
              />
            )}

            {/* Dots */}
            {drawPts.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y} r={3.5}
                fill={p.isDrop ? '#EF4444' : '#10B981'}
                stroke="#141210" strokeWidth={1.5}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        position: 'absolute',
        bottom: 44,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: tagOpacity,
        transform: `translateY(${tagY}px)`,
      }}>
        <div style={{ fontSize: 14, color: '#6b6460', letterSpacing: '0.01em' }}>
          Catch silent model degradation{' '}
          <span style={{ color: '#d99058', fontWeight: 500 }}>before your client does.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ─────────────────────────────────────────
   Player wrapper — embed in landing page
───────────────────────────────────────── */
export default function MonitoringDemo() {
  return (
    <Player
      component={MonitoringComposition}
      durationInFrames={480}
      fps={30}
      compositionWidth={900}
      compositionHeight={506}
      loop
      autoPlay
      style={{
        width: '100%',
        maxWidth: 900,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    />
  );
}
