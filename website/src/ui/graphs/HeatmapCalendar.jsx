import { useEffect, useMemo, useRef } from 'react';
import { dayKey, useReveal } from './utils';
import CountUp from '../custom/motion/CountUp';

// GitHub-style activity calendar.
//   data:  [{ date: 'YYYY-MM-DD' | Date, value: number }]   (see countByDay in utils.js)
//   weeks: how many weeks to show (default 26 = about 6 months)
//   label: word used in tooltips, e.g. "products"
const CELL = 13;
const GAP = 3;
const LEVELS = [
  'var(--surface-alt)',
  'color-mix(in srgb, var(--graph-heat) 30%, var(--surface-alt))',
  'color-mix(in srgb, var(--graph-heat) 55%, var(--surface-alt))',
  'color-mix(in srgb, var(--graph-heat) 80%, var(--surface-alt))',
  'var(--graph-heat)',
];
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export default function HeatmapCalendar({ data = [], weeks = 26, label = 'items' }) {
  const scroller = useRef(null);
  const on = useReveal([data, weeks]);

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

  // Start scrolled to the most recent weeks.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [columns]);

  const level = (v) => {
    if (!v) return 0;
    const ratio = v / (max || 1);
    return ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
  };
  const pretty = (d) => d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <div ref={scroller} className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex gap-2">
          <div className="flex flex-col text-[10px] text-muted" style={{ paddingTop: 18, gap: GAP }}>
            {DAYS.map((d, i) => (
              <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>{d}</span>
            ))}
          </div>
          <div>
            <div className="relative text-[10px] text-muted" style={{ height: 16 }}>
              {months.map((m) => (
                <span key={m.index} className="absolute" style={{ left: m.index * (CELL + GAP) }}>{m.text}</span>
              ))}
            </div>
            <div className="mt-0.5 flex" style={{ gap: GAP }} role="img" aria-label={`${total} ${label} in the last ${weeks} weeks`}>
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
                  {col.map((c) => (
                    <span
                      key={c.key}
                      title={c.future ? '' : `${c.value} ${label} on ${pretty(c.date)}`}
                      className="rounded-[3px] transition-[opacity,transform] duration-500 hover:scale-125"
                      style={{
                        width: CELL,
                        height: CELL,
                        background: c.future ? 'transparent' : LEVELS[level(c.value)],
                        opacity: on ? 1 : 0,
                        transitionDelay: `${ci * 12}ms`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          <b className="font-semibold text-text"><CountUp value={total} /></b> {label} in the last {weeks} weeks
          {best.key && <> · busiest day {pretty(new Date(best.key + 'T00:00:00'))} ({best.value})</>}
        </span>
        <span className="flex items-center gap-1.5">
          Less
          {LEVELS.map((c, i) => (
            <span key={i} className="inline-block rounded-[3px]" style={{ width: 11, height: 11, background: c }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}