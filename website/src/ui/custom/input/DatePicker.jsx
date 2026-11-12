import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

// Custom calendar popover. value / onChange use 'YYYY-MM-DD' strings.
//   <DatePicker value={date} onChange={setDate} max={todayKey} />
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function DatePicker({ value, onChange, max, error = false, placeholder = 'Pick a date', 'aria-label': ariaLabel }) {
  const root = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const d = value ? parse(value) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dropUp, setDropUp] = useState(false);
  const todayKey = key(new Date());

  useEffect(() => {
    if (!open) return undefined;
    const rect = root.current?.getBoundingClientRect();
    setDropUp(Boolean(rect) && window.innerHeight - rect.bottom < 340 && rect.top > 340);
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc, true); };
  }, [open]);

  const toggle = () => {
    if (!open) { const d = value ? parse(value) : new Date(); setView(new Date(d.getFullYear(), d.getMonth(), 1)); }
    setOpen((o) => !o);
  };

  const first = (view.getDay() + 6) % 7; // Monday first
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))];
  const shift = (n) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));
  const pick = (d) => { onChange(key(d)); setOpen(false); };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
        className={`flex min-h-11 w-full items-center gap-2 rounded-md border bg-surface px-3 text-left text-sm transition-colors ${
          error ? 'border-error' : open ? 'border-accent-tone-1' : 'border-border hover:border-accent-tone-1/60'
        }`}
      >
        <CalendarDays size={16} className="shrink-0 text-accent-tone-1" />
        <span className={`flex-1 truncate ${value ? 'text-text' : 'text-muted/70'}`}>
          {value ? parse(value).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}
        </span>
      </button>

      <div
        role="dialog"
        aria-label="Choose a date"
        className={`absolute left-0 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-3 shadow-soft transition-all duration-200 ${
          dropUp ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
        } ${open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text"><ChevronLeft size={16} /></button>
          <span className="heading-sm text-text">{view.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-muted">
          {WEEK.map((w) => <span key={w} className="py-1">{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const k = key(d);
            const selected = k === value;
            const disabled = max && k > max;
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => pick(d)}
                className={`grid h-9 place-items-center rounded-md text-sm tabular-nums transition-colors disabled:opacity-30 ${
                  selected ? 'bg-accent-tone-1 font-semibold text-white' : k === todayKey ? 'border border-accent-tone-1/60 text-accent-tone-1 hover:bg-surface-alt' : 'text-text hover:bg-surface-alt'
                }`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs">
          <button type="button" onClick={() => pick(new Date())} className="rounded-md px-2 py-1 font-medium text-accent-tone-1 transition-colors hover:bg-surface-alt">Today</button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface-alt hover:text-text">Close</button>
        </div>
      </div>
    </div>
  );
}