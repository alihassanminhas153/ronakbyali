import { useReveal, colorFor, compact } from './utils';
import { EmptyChart } from './ChartCard';

// data: [{ label, value, color?, hint? }]
// orientation: 'horizontal' (ranked list, default) | 'vertical' (columns)
// colorful: give every bar its own palette colour (default: all bars use the accent)
export default function BarChart({
  data = [],
  orientation = 'horizontal',
  colorful = true,
  format = (n) => compact(n),
  height = 180,
  empty,
}) {
  const on = useReveal([data]);
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  if (!data.length) return <EmptyChart>{empty}</EmptyChart>;
  const colorOf = (d, i) => d.color || (colorful ? colorFor(d.label || i) : 'var(--accent-tone-1)');

  if (orientation === 'vertical') {
    return (
      <div className="flex w-full min-w-0 items-end gap-1 sm:gap-2" style={{ height }}>
        {data.map((d, i) => {
          const pct = ((Number(d.value) || 0) / max) * 100;
          return (
            <div key={d.label + i} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.label}: ${d.value}`}>
              <span className="mb-1 text-center text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                {format(d.value)}
              </span>
              <div
                className="w-full rounded-t-[4px] transition-[height,opacity] duration-700 ease-out group-hover:opacity-80"
                style={{
                  height: on ? `${Math.max(pct, d.value ? 3 : 0)}%` : '0%',
                  background: colorOf(d, i),
                  transitionDelay: `${i * 50}ms`,
                }}
              />
              <span className="mt-1.5 block min-w-0 max-w-full truncate text-center text-[10px] text-muted" title={d.short || d.label}>{d.short || d.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="w-full min-w-0 space-y-3">
      {data.map((d, i) => {
        const pct = ((Number(d.value) || 0) / max) * 100;
        return (
          <li key={d.label + i} className="group">
            <div className="mb-1 flex min-w-0 items-baseline justify-between gap-2 text-[11px] sm:gap-3 sm:text-xs">
              <span className="truncate text-text">{d.label}</span>
              <span className="min-w-0 shrink text-right text-muted tabular-nums">
                {format(d.value)}
                {d.hint && <span className="ml-1 text-[10px]">{d.hint}</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: on ? `${Math.max(pct, d.value ? 2 : 0)}%` : '0%',
                  background: colorOf(d, i),
                  transitionDelay: `${i * 60}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}