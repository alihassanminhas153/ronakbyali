import { tint, toneVar } from './utils';
import AppIcon from '../custom/AppIcon';

// Shared frame for every chart.
//   tone: 1-8 (picks a theme accent shade) or any CSS colour.   icon: a lucide icon component
export default function ChartCard({ title, subtitle, icon: Icon, appIcon, tone = 1, action, children, className = '', delay = 0 }) {
  const color = toneVar(tone);
  return (
    <section
      style={{ animationDelay: `${delay}ms`, '--card-tone': color }}
      className={`group/card animate-rise min-w-0 rounded-lg border border-border bg-surface p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--card-tone)_45%,var(--border))] sm:p-5 ${className}`}
    >
      <header className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-2 sm:mb-4 sm:flex-nowrap sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {appIcon ? (
            <AppIcon
              name={appIcon}
              className="h-9 w-9 shrink-0 object-contain transition-transform duration-300 group-hover/card:-rotate-6 group-hover/card:scale-110"
            />
          ) : Icon ? (
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/card:-rotate-6 group-hover/card:scale-110"
              style={{ background: tint(color, 14), color }}
            >
              <Icon size={18} aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="heading-sm truncate" style={{ color }}>{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="min-w-0 shrink-0">{action}</div>}
      </header>
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  );
}

export function EmptyChart({ children = 'Nothing to show yet.' }) {
  return (
    <div className="grid h-32 place-items-center rounded-md border border-dashed border-border text-xs text-muted">
      {children}
    </div>
  );
}