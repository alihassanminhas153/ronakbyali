import CountUp from '../custom/motion/CountUp';
import { tint, toneVar } from './utils';

// Number tile. `value` can be a number (it counts up) or text.
//   format: how to print the animated number, e.g. (n) => `Rs ${Math.round(n).toLocaleString()}`
export default function StatTile({ label, value, format, hint, icon: Icon, tone = 1, delay = 0 }) {
  const color = toneVar(tone);
  return (
    <div
      style={{ animationDelay: `${delay}ms`, '--tile-tone': color }}
      className="group/tile animate-rise flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile-tone)_45%,var(--border))]"
    >
      {Icon && (
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/tile:rotate-6 group-hover/tile:scale-110"
          style={{ background: tint(color, 14), color }}
        >
          <Icon size={20} />
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