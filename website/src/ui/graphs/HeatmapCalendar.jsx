import { useMemo, useState } from 'react';
import { dayKey, useReveal } from './utils';
import CountUp from '../custom/motion/CountUp';
import { TipBubble } from '../custom/tooltip/Tooltip';

// GitHub-style activity calendar.
//   data:  [{ date: 'YYYY-MM-DD' | Date, value: number }]   (see countByDay in utils.js)
//   weeks: how many weeks to show (default 26 = about 6 months)
//   label: word used in tooltips, e.g. "products"
const CELL = 13;
const GAP = 3;
const LEVELS = [
  'var(--surface-alt)',
  'color-mix(in srgb, var(--chart-accent, var(--accent)) 30%, var(--surface-alt))',
  'color-mix(in srgb, var(--chart-accent, var(--accent)) 55%, var(--surface-alt))',
  'color-mix(in srgb, var(--chart-accent, var(--accent)) 80%, var(--surface-alt))',
  'var(--chart-accent, var(--accent))',
];
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export default function HeatmapCalendar({ data = [], weeks = 26, label = 'items' }) {
  const on = useReveal([data, weeks]);
  const [tip, setTip] = useState(null); // { rect, value, date } of the hovered day

  const { columns, months, total, best, max } = useMemo(() => {
    const counts = new Map();
    data.forEach((d) => {
      const k = dayKey(d.date);
      counts.set(k, (counts.get(k) || 0) + (Number(d.value) || 0));
    });

    // Grid ends on the current week (Monday first).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mondayOffset = (today.getDay() + 6) % 7;
    const end = new Date(today);
    end.setDate(today.getDate() + (6 - mondayOffset)); // Sunday of this week
    const start = new Date(end);
    start.setDate(end.getDate() - weeks * 7 + 1);

    const cols = [];
    const monthLabels = [];
    let sum = 0;
    let top = { key: null, value: 0 };
    let maxValue = 0;
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = dayKey(date);
        const future = date > today;
        const value = future ? 0 : counts.get(key) || 0;
        sum += value;
        if (value > top.value) top = { key, value };
        if (value > maxValue) maxValue = value;
        col.push({ key, date, value, future });
      }
      const firstOfCol = col[0].date;
      if (firstOfCol.getMonth() !== lastMonth) {
        monthLabels.push({ index: w, text: firstOfCol.toLocaleString('en', { month: 'short' }) });
        lastMonth = firstOfCol.getMonth();
      }
      cols.push(col);
    }
    return { columns: cols, months: monthLabels, total: sum, best: top, max: maxValue };
  }, [data, weeks]);

  const level = (v) => {
    if (!v) return 0;
    const ratio = v / (max || 1);
    return ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
  };
  const pretty = (d) => d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  // One listener for the whole grid (instead of one per cell). Cells carry data-key / data-value.
  const showTip = (e) => {
    const el = e.target.closest?.('[data-key]');
    if (!el) { setTip(null); return; }
    setTip({ rect: el.getBoundingClientRect(), value: Number(el.dataset.value) || 0, date: new Date(`${el.dataset.key}T00:00:00`) });
  };

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full max-w-[512px] min-w-0 overflow-hidden pb-1">
        <div className="flex w-full min-w-0 justify-center gap-2">
          <div className="hidden shrink-0 flex-col text-[10px] text-muted xl:flex" style={{ paddingTop: 18, gap: GAP }}>
            {DAYS.map((d, i) => (
              <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>{d}</span>
            ))}
          </div>
          <div className="min-w-0 max-w-[491px] flex-1">
            <div className="relative w-full text-[10px] text-muted" style={{ height: 16 }}>
              {months.map((m) => (
                <span key={m.index} className="absolute whitespace-nowrap" style={{ left: `${(m.index / weeks) * 100}%` }}>{m.text}</span>
              ))}
            </div>
            <div
              className="mt-0.5 grid w-full grid-flow-col grid-rows-7 gap-x-[2px] gap-y-[2px]"
              style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
              onMouseOver={showTip}
              onMouseLeave={() => setTip(null)}
              onClick={showTip}
              role="img"
              aria-label={`${total} ${label} in the last ${weeks} weeks`}
            >
              {columns.flatMap((col, ci) => col.map((c) => (
                <span
                  key={c.key}
                  data-key={c.future ? undefined : c.key}
                  data-value={c.value}
                  className="block aspect-square w-full rounded-[3px] transition-opacity duration-500 hover:brightness-110"
                  style={{
                    background: c.future ? 'transparent' : LEVELS[level(c.value)],
                    opacity: on ? 1 : 0,
                    transitionDelay: `${ci * 12}ms`,
                  }}
                />
              )))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="min-w-0 flex-1 leading-relaxed">
          <b className="font-semibold text-text"><CountUp value={total} /></b> {label} in the last {weeks} weeks
          {best.key && <> · busiest day {pretty(new Date(best.key + 'T00:00:00'))} ({best.value})</>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          Less
          {LEVELS.map((c, i) => (
            <span key={i} className="inline-block rounded-[3px]" style={{ width: 11, height: 11, background: c }} />
          ))}
          More
        </span>
      </div>

      <TipBubble rect={tip?.rect ?? null}>
        {tip && (
          <>
            <b className="block font-semibold">{tip.value ? `${tip.value} ${label}` : `No ${label}`}</b>
            <span className="block opacity-75">{pretty(tip.date)}</span>
          </>
        )}
      </TipBubble>
    </div>
  );
}