import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import CountUp from '../../../ui/custom/motion/CountUp';
import { ChartCard, tint, toneVar } from '../../../ui/graphs';

// Clickable number tile (same look as StatTile, goes to a page).
export function LinkTile({ to, label, value, format, hint, icon: Icon, tone = 1, delay = 0 }) {
  const color = toneVar(tone);
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms`, '--tile-tone': color }}
      className="group/tile animate-rise relative flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile-tone)_45%,var(--border))]"
    >
      {Icon && (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/tile:rotate-6 group-hover/tile:scale-110" style={{ background: tint(color, 14), color }}>
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
      <ArrowUpRight size={16} className="absolute right-3 top-3 text-muted opacity-0 transition-all duration-300 group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:opacity-100" />
    </Link>
  );
}

// A whole chart card that is a link to its page.
export function OverviewCard({ to, cta, className = '', children, ...card }) {
  return (
    <Link to={to} className={`group/link block rounded-lg ${className}`}>
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
    <div className="mb-4 grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-md bg-surface-alt/60 px-3 py-2">
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