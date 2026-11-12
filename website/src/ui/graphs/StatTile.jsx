import CountUp from '../custom/motion/CountUp';
import { tint, toneVar } from './utils';

// Number tile. `value` can be a number (it counts up) or text.
//   format: how to print the animated number, e.g. (n) => `Rs ${Math.round(n).toLocaleString()}`
export default function StatTile({ label, value, format, hint, icon: Icon, tone = 1, delay = 0 }) {
  const color = toneVar(tone);
  return (
    <div
      style={{ animationDelay: `${delay}ms`, '--tile-tone': color }}
      className="group/tile animate-rise flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile-tone)_45%,var(--border))] sm:gap-3 sm:p-4"
    >
      {Icon && (
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/tile:rotate-6 group-hover/tile:scale-110 sm:size-11"
          style={{ background: tint(color, 14), color }}
        >
          <Icon size={18} className="sm:size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="heading truncate text-xl leading-tight text-text sm:text-2xl">
          {typeof value === 'number' ? <CountUp value={value} format={format} /> : value}
        </p>
        {hint && <p className="truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}