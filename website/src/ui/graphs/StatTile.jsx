import { useState } from 'react';
import { Activity, Eye, EyeOff } from 'lucide-react';

import CountUp from '../custom/motion/CountUp';
import AppIcon from '../custom/AppIcon';
import { maskLength, tint, toneVar } from './utils';
import Tooltip from '../custom/tooltip/Tooltip';
import { formatCardNumber, fullCardValue } from './CardMoney';

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
    <Tooltip label={hidden ? 'Hidden' : fullCardValue(value, format)} block className="h-full w-full min-w-0">
    <div
      style={{ animationDelay: `${delay}ms`, '--tile-tone': color }}
      className="group/tile flex h-full min-h-[6.5rem] w-full min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface p-2.5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile-tone)_45%,var(--border))] hover:bg-surface-alt/30 sm:gap-2 sm:p-3"
    >
      <div className="flex min-h-5 min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] text-muted sm:text-xs">{label}</p>
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
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        {appIcon ? (
          <AppIcon
            name={appIcon}
            tone={tone}
            className="size-8 shrink-0 object-contain transition-transform duration-300 group-hover/tile:scale-105 sm:size-9"
          />
        ) : (
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/tile:rotate-3 group-hover/tile:scale-105 sm:size-9"
            style={{ background: tint(color, 14), color }}
          >
            {Icon ? <Icon size={16} aria-hidden="true" /> : <Activity size={16} aria-hidden="true" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`heading leading-tight text-text ${valueClassName || 'truncate text-lg sm:text-xl'}`} aria-live={sensitive ? 'polite' : undefined}>
            <span className={`inline-block transition-all duration-300 motion-reduce:transition-none ${hidden ? 'scale-95 blur-[2px] opacity-60' : 'scale-100 blur-0 opacity-100'}`}>
              {hidden ? '*'.repeat(maskLength(value)) : typeof value === 'number' ? <CountUp value={value} format={(n) => formatCardNumber(n, format)} /> : value}
            </span>
          </p>
        </div>
      </div>
      {hint && <p className="w-full truncate text-xs text-muted">{hidden ? 'Hidden' : hint}</p>}
    </div>
    </Tooltip>
  );
}