import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight, Eye, EyeOff } from 'lucide-react';

import AppIcon from '../../../ui/custom/AppIcon';
import CountUp from '../../../ui/custom/motion/CountUp';
import { ChartCard, tint, toneVar } from '../../../ui/graphs';

// Clickable number tile (same look as StatTile, goes to a page).
export function LinkTile({ to, label, value, format, hint, icon: Icon, appIcon, sensitive = false, tone = 1, delay = 0 }) {
  const color = toneVar(tone);
  const [hidden, setHidden] = useState(false);
  return (
    <div className="relative min-w-0">
      <Link
        to={to}
        style={{ animationDelay: `${delay}ms`, '--tile-tone': color }}
        className={`group/tile animate-rise relative flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile-tone)_45%,var(--border))] sm:gap-4 sm:p-4 ${sensitive ? 'pr-10' : ''}`}
      >
        {appIcon ? (
          <AppIcon
            name={appIcon}
            tone={tone}
            className="size-10 shrink-0 object-contain transition-transform duration-300 group-hover/tile:scale-105 sm:size-12"
          />
        ) : Icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover/tile:rotate-3 group-hover/tile:scale-105 sm:size-12" style={{ background: tint(color, 14), color }}>
            <Icon size={20} className="sm:size-5" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{label}</p>
          <p className="heading truncate text-xl leading-tight text-text sm:text-2xl">
            {hidden ? '••••••' : typeof value === 'number' ? <CountUp value={value} format={format} /> : value}
          </p>
          {hint && <p className="truncate text-xs text-muted">{hidden ? 'Hidden' : hint}</p>}
        </div>
        <ArrowUpRight
          size={16}
          className={`absolute text-muted opacity-0 transition-all duration-300 group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:opacity-100 ${sensitive ? 'bottom-3 right-3 top-auto' : 'right-3 top-3'}`}
        />
      </Link>
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

// A whole chart card that is a link to its page.
export function OverviewCard({ to, cta, className = '', children, ...card }) {
  return (
    <Link to={to} className={`group/link block min-w-0 rounded-lg ${className}`}>
      <ChartCard
        {...card}
        className="h-full"
        action={
          <span className="inline-flex shrink-0 items-center gap-1 pt-1 text-xs font-medium text-muted transition-colors group-hover/link:text-text">
            {cta}
            <ArrowRight size={13} className="transition-transform duration-300 group-hover/link:translate-x-1" />
          </span>
        }
      >
        {children}
      </ChartCard>
    </Link>
  );
}

// Row of small numbers at the top of a card.
export function Mini({ items }) {
  return (
    <div className="mb-3 grid min-w-0 grid-cols-3 gap-1.5 sm:mb-4 sm:gap-2">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 rounded-md bg-surface-alt/60 px-2 py-2 sm:px-3">
          <p className="truncate text-[11px] text-muted">{it.label}</p>
          <p className="heading truncate text-lg leading-tight" style={{ color: toneVar(it.tone) }}>
            {typeof it.value === 'number' ? <CountUp value={it.value} format={it.format} duration={800} /> : it.value}
          </p>
        </div>
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