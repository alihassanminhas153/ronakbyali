import { useState } from 'react';
import { Link } from 'react-router';
import { Activity, ArrowRight, ArrowUpRight, Eye, EyeOff } from 'lucide-react';

import AppIcon from '../../../ui/custom/AppIcon';
import CountUp from '../../../ui/custom/motion/CountUp';
import { ChartCard, tint, toneVar } from '../../../ui/graphs';
import { maskLength } from '../../../ui/graphs/utils';
import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import { formatCardNumber, fullCardValue } from '../../../ui/graphs/CardMoney';

// Clickable number tile (same look as StatTile, goes to a page).
export function LinkTile({ to, label, value, format, hint, icon: Icon, appIcon, sensitive = false, tone = 1, delay = 0 }) {
  const color = toneVar(tone);
  const [hidden, setHidden] = useState(false);
  return (
    <div className="relative min-w-0">
      <Tooltip label={hidden ? 'Hidden' : fullCardValue(value, format)} block className="h-full w-full min-w-0">
      <Link
        to={to}
        style={{ animationDelay: `${delay}ms`, '--tile-tone': color }}
        className={`group/tile relative flex h-full min-h-[6.5rem] w-full min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface p-2.5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile-tone)_45%,var(--border))] hover:bg-surface-alt/30 sm:gap-2 sm:p-3 ${sensitive ? 'pr-9' : ''}`}
      >
        <p className="flex min-h-5 min-w-0 items-center truncate pr-6 text-[11px] text-muted sm:text-xs">{label}</p>
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          {appIcon ? (
            <AppIcon
              name={appIcon}
              tone={tone}
              className="size-8 shrink-0 object-contain transition-transform duration-300 group-hover/tile:scale-105 sm:size-9"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/tile:rotate-3 group-hover/tile:scale-105 sm:size-9" style={{ background: tint(color, 14), color }}>
              {Icon ? <Icon size={16} aria-hidden="true" /> : <Activity size={16} aria-hidden="true" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
          <p className="heading truncate text-lg leading-tight text-text sm:text-xl">
            <span className={`inline-block transition-all duration-300 motion-reduce:transition-none ${hidden ? 'scale-95 blur-[2px] opacity-60' : 'scale-100 blur-0 opacity-100'}`}>
              {hidden ? '*'.repeat(maskLength(value)) : typeof value === 'number' ? <CountUp value={value} format={(n) => formatCardNumber(n, format)} /> : value}
            </span>
          </p>
          </div>
        </div>
        {hint && <p className="w-full truncate text-xs text-muted">{hidden ? 'Hidden' : hint}</p>}
        <ArrowUpRight
          size={16}
          className={`absolute text-muted opacity-0 transition-all duration-300 group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:opacity-100 ${sensitive ? 'bottom-3 right-3 top-auto' : 'right-3 top-3'}`}
        />
      </Link>
      </Tooltip>
      {sensitive && (
        <button
          type="button"
          onClick={() => setHidden((current) => !current)}
          aria-label={`${hidden ? 'Show' : 'Hide'} ${label}`}
          aria-pressed={hidden}
          title={`${hidden ? 'Show' : 'Hide'} amount`}
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}

// A chart card with an explicit link to its page.
export function OverviewCard({ to, cta, className = '', children, ...card }) {
  return (
    <div className={`group/link min-w-0 rounded-lg ${className}`}>
      <ChartCard
        {...card}
        className="h-full"
        action={
          <Link to={to} className="inline-flex shrink-0 items-center gap-1 pt-1 text-xs font-medium text-muted transition-colors hover:text-text">
            {cta}
            <ArrowRight size={13} className="transition-transform duration-300 group-hover/link:translate-x-1" />
          </Link>
        }
      >
        {children}
      </ChartCard>
    </div>
  );
}

// Row of small numbers at the top of a card.
export function Mini({ items }) {
  return (
    <div className="mb-3 grid min-w-0 grid-cols-3 gap-1.5 sm:mb-4 sm:gap-2">
      {items.map((it) => (
        <Tooltip key={it.label} label={fullCardValue(it.value, it.format)} block className="h-full w-full min-w-0">
        <div className="w-full min-w-0 rounded-md bg-surface-alt/60 px-1.5 py-1.5 sm:px-2.5 sm:py-2">
          <p className="truncate text-[11px] text-muted">{it.label}</p>
          <p className="heading truncate text-lg leading-tight" style={{ color: toneVar(it.tone) }}>
            {typeof it.value === 'number' ? <CountUp value={it.value} format={(n) => formatCardNumber(n, it.format)} duration={800} /> : it.value}
          </p>
        </div>
        </Tooltip>
      ))}
    </div>
  );
}

// Small coloured status word.
export function StatusBadge({ status, tone }) {
  const color = toneVar(tone);
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize" style={{ background: tint(color, 14), color }}>
      {status}
    </span>
  );
}