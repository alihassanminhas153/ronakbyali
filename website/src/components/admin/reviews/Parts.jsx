import { RefreshCw, Star } from 'lucide-react';
import { STATUS_META } from './helpers';

export function Stars({ rating = 0, size = 16, className = '' }) {
  const full = Math.round(rating);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= full ? 'fill-current text-graph-3' : 'text-border'} />
      ))}
    </span>
  );
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span
      style={{
        '--tone': `var(--graph-${meta.tone})`,
        color: 'var(--tone)',
        background: 'color-mix(in srgb, var(--tone) 12%, transparent)',
        borderColor: 'color-mix(in srgb, var(--tone) 35%, transparent)',
      }}
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
    >
      <Icon size={12} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

// 5 → 1 star bars. counts = { 1: n, ... 5: n }
export function RatingBars({ counts, total }) {
  return (
    <ul className="space-y-2.5">
      {[5, 4, 3, 2, 1].map((n) => {
        const c = counts[n] || 0;
        const pct = total ? (c / total) * 100 : 0;
        return (
          <li key={n} className="flex items-center gap-3 text-sm">
            <span className="flex w-9 shrink-0 items-center gap-1 font-medium tabular-nums text-text">
              {n}
              <Star size={13} className="fill-current text-graph-3" />
            </span>
            <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-alt">
              <span className="block h-full rounded-full bg-graph-3 transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted">{c}</span>
          </li>
        );
      })}
    </ul>
  );
}

// One line of the "Product ratings" tab.
export function ProductRatingRow({ product, busy, onRecalculate, index = 0 }) {
  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="animate-rise flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5"
    >
      <div className="min-w-0 flex-1 basis-48">
        {product.slug ? (
          <a href={`/${product.slug}`} target="_blank" rel="noreferrer" className="block truncate font-semibold text-text transition-colors hover:text-graph-1">
            {product.name}
          </a>
        ) : (
          <p className="truncate font-semibold text-text">{product.name}</p>
        )}
        <p className="mt-0.5 text-xs text-muted">
          {product.approved} approved · {product.pending} pending · {product.rejected} rejected
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Stars rating={product.average} size={15} />
        <span className="w-8 text-sm font-semibold tabular-nums text-text">{product.approved ? product.average.toFixed(1) : '–'}</span>
      </div>

      <button
        type="button"
        onClick={() => onRecalculate(product.productId)}
        disabled={busy}
        title="Rewrite this product's rating and review count from its approved reviews"
        style={{ '--op': 'var(--graph-2)' }}
        className="group inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-px hover:border-[var(--op)] hover:text-[var(--op)] active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
      >
        <RefreshCw size={15} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
        {busy ? 'Updating' : 'Recalculate'}
      </button>
    </li>
  );
}