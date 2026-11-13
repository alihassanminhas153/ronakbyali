import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import CountUp from '../custom/motion/CountUp';
import AppIcon from '../custom/AppIcon';
import { tint, toneVar } from './utils';

// Number tile. `value` can be a number (it counts up) or text.
//   format: how to print the animated number, e.g. (n) => `Rs ${Math.round(n).toLocaleString()}`
export default function StatTile({
  label,
  value,
  format,
  hint,
  icon: Icon,
  appIcon,
  valueClassName,
  sensitive = false,
  tone = 1,
  delay = 0,
}) {
  const color = toneVar(tone);
  const [hidden, setHidden] = useState(false);
  return (
    <div
      style={{ animationDelay: `${delay}ms`, '--tile-tone': color }}
      className="group/tile animate-rise flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile-tone)_45%,var(--border))] sm:p-4"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted">{label}</p>
        {sensitive && (
          <button
            type="button"
            onClick={() => setHidden((current) => !current)}
            aria-label={`${hidden ? 'Show' : 'Hide'} ${label}`}
            aria-pressed={hidden}
            title={`${hidden ? 'Show' : 'Hide'} amount`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
      <div className="flex min-w-0 items-end gap-3">
        {appIcon ? (
          <AppIcon
            name={appIcon}
            tone={tone}
            className="size-10 shrink-0 object-contain transition-transform duration-300 group-hover/tile:scale-105 sm:size-11"
          />
        ) : Icon ? (
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover/tile:rotate-3 group-hover/tile:scale-105 sm:size-11"
            style={{ background: tint(color, 14), color }}
          >
            <Icon size={20} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className={`heading leading-tight text-text ${valueClassName || 'truncate text-xl sm:text-2xl'}`} aria-live={sensitive ? 'polite' : undefined}>
            {hidden ? '***' : typeof value === 'number' ? <CountUp value={value} format={format} /> : value}
          </p>
          {hint && <p className="truncate text-xs text-muted">{hidden ? 'Hidden' : hint}</p>}
        </div>
      </div>
    </div>
  );
}