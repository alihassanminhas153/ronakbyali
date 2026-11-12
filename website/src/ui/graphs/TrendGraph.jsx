import { useId, useMemo, useState } from 'react';
import { useReveal, compact } from './utils';
import { EmptyChart } from './ChartCard';

// data: [{ label, value }]   (oldest first). Values may be negative (profit / loss).
const W = 600;
const H = 210;
const PAD = { top: 14, right: 12, bottom: 26, left: 44 };

export default function TrendGraph({ data = [], format = (n) => compact(n), color = 'var(--graph-line)', empty }) {
  const gid = useId();
  const on = useReveal([data]);
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => {
    const n = data.length;
    const vals = data.map((d) => Number(d.value) || 0);
    const lo = Math.min(0, ...vals);
    let hi = Math.max(0, ...vals);
    if (hi === lo) hi = lo + 4;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const y = (v) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
    const pts = data.map((d, i) => ({
      x: PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
      y: y(Number(d.value) || 0),
      ...d,
    }));
    let line = '';
    pts.forEach((p, i) => {
      if (i === 0) line = `M${p.x},${p.y}`;
      else {
        const prev = pts[i - 1];
        const cx = (prev.x + p.x) / 2;
        line += ` C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
      }
    });
    const base = y(0);
    const area = pts.length ? `${line} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z` : '';
    return { pts, line, area, lo, hi, innerH, base, y };
  }, [data]);

  if (!data.length || data.every((d) => !d.value)) return <EmptyChart>{empty}</EmptyChart>;
  const ticks = [geo.lo, (geo.lo + geo.hi) / 2, geo.hi].map((v) => ({ y: geo.y(v), v }));
  const active = hover != null ? geo.pts[hover] : null;
  const step = Math.ceil(data.length / 7);

  return (
    <div className="relative w-full min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full max-w-full" role="img" aria-label="Trend over time" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)">{format(Math.round(t.v))}</text>
          </g>
        ))}
        {geo.lo < 0 && <line x1={PAD.left} x2={W - PAD.right} y1={geo.base} y2={geo.base} stroke="var(--text-muted)" strokeOpacity="0.5" />}

        <path d={geo.area} fill={`url(#${gid})`} style={{ opacity: on ? 1 : 0, transition: 'opacity 0.9s ease 0.3s' }} />
        <path
          d={geo.line}
          fill="none"
          stroke={color}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
          style={{ strokeDashoffset: on ? 0 : 1, transition: 'stroke-dashoffset 1.1s ease' }}
        />

        {geo.pts.map((p, i) => (
          <g key={p.label + i}>
            {i % step === 0 && <text x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{p.label}</text>}
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill="var(--surface)"
              stroke={color}
              strokeWidth="2"
              style={{ opacity: on ? 1 : 0, transition: 'opacity 0.6s ease 0.8s, r 0.15s' }}
            />
            <rect
              x={p.x - W / data.length / 2}
              y={PAD.top}
              width={W / data.length}
              height={geo.innerH + 10}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          </g>
        ))}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-soft"
          style={{ left: `${(active.x / W) * 100}%`, top: `${(Math.max(active.y - 40, 0) / H) * 100}%` }}
        >
          <span className="text-muted">{active.label}</span> <b className="text-text">{format(active.value)}</b>
        </div>
      )}
    </div>
  );
}