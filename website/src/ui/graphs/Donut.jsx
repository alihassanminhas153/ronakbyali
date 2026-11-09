import { useState } from 'react';
import { useReveal, colorAt } from './utils';
import { EmptyChart } from './ChartCard';
import CountUp from '../custom/motion/CountUp';

// data: [{ label, value, color? }]   centerLabel: small text under the total
const R = 42;
const C = 2 * Math.PI * R;

export default function Donut({ data = [], centerLabel = 'total', format = (n) => n.toLocaleString(), empty }) {
  const on = useReveal([data]);
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  if (!total) return <EmptyChart>{empty}</EmptyChart>;

  let offset = 0;
  const segments = data.map((d, i) => {
    const len = ((Number(d.value) || 0) / total) * C;
    const seg = { ...d, len, offset, color: d.color || colorAt(i), pct: Math.round((d.value / total) * 100) };
    offset += len;
    return seg;
  });
  const shown = active != null ? segments[active] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${format(total)} ${centerLabel}`}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-alt)" strokeWidth="11" />
          {segments.map((s, i) => (
            <circle
              key={s.label + i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active === i ? 13 : 11}
              strokeDasharray={`${on ? Math.max(s.len - 1.2, 0) : 0} ${C}`}
              strokeDashoffset={-s.offset}
              className="cursor-pointer transition-[stroke-dasharray,stroke-width,opacity] duration-700 ease-out"
              style={{ opacity: active == null || active === i ? 1 : 0.35, transitionDelay: `${i * 90}ms` }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="heading text-2xl leading-none text-text"><CountUp value={shown ? shown.value : total} duration={600} format={(n) => format(Math.round(n))} /></p>
            <p className="mt-1 max-w-[6rem] truncate text-[11px] text-muted">{shown ? shown.label : centerLabel}</p>
          </div>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {segments.map((s, i) => (
          <li
            key={s.label + i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="flex cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-surface-alt"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-text">{s.label}</span>
            <span className="text-muted tabular-nums">{format(s.value)}</span>
            <span className="w-9 text-right text-muted tabular-nums">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}