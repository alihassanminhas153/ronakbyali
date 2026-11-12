import CountUp from '../../../ui/custom/motion/CountUp';
import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import HeatmapCalendar from '../../../ui/graphs/HeatmapCalendar';
import { colorFor, tint, toneVar, useReveal } from '../../../ui/graphs/utils';
import { Avatar, CityChip, RoleBadge } from './UserBadges';
import { ROLE_COLOR, formatInt, formatMoney, fullDate, providerMeta, timeAgo } from './userFields';

/* Self-contained chart pieces for the Users tabs. They only use theme variables, so they follow light / dark. */

// Card with a coloured top edge and an icon tile, the same pattern as the product form sections.
export function ChartPanel({ icon: Icon, title, subtitle, tone = 1, delay = 0, action, className = '', children }) {
  const color = toneVar(tone);
  return (
    <section
      style={{ animationDelay: `${delay}ms`, borderTopColor: color }}
      className={`group/panel animate-rise min-w-0 rounded-lg border border-border border-t-2 bg-surface p-3 sm:p-4 ${className}`}
    >
      <header className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-2 sm:mb-4 sm:flex-nowrap sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/panel:-rotate-6 group-hover/panel:scale-110"
            style={{ background: tint(color, 14), color }}
          >
            <Icon size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="heading-sm" style={{ color }}>{title}</h3>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="min-w-0 shrink-0">{action}</div>}
      </header>
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  );
}

// GitHub-style calendar tinted with the panel colour.
export function CalendarPanel({ data, label = 'logins', weeks = 26, ...panel }) {
  return (
    <ChartPanel {...panel}>
      <div style={{ '--graph-heat': toneVar(panel.tone) }}>
        <HeatmapCalendar data={data} weeks={weeks} label={label} />
      </div>
    </ChartPanel>
  );
}

// Vertical bars with a custom hover label. items: [{ key, label, value, tip }]
export function ColumnChart({ items, color = 'var(--graph-1)', height = 120, labelEvery = 1, highlightPeak = false }) {
  const on = useReveal([items]);
  const max = Math.max(1, ...items.map((i) => i.value));
  const peak = items.reduce((best, i) => (i.value > best.value ? i : best), items[0] || { value: 0 });

  return (
    <div className="w-full min-w-0">
      <div className="flex w-full min-w-0 items-end gap-1 overflow-hidden" style={{ height }}>
        {items.map((item, i) => (
          <Tooltip key={item.key} label={item.tip} className="h-full min-w-0 flex-1 items-end">
            <span
              className="w-full rounded-t-sm transition-[height,opacity] duration-700 ease-out hover:opacity-75"
              style={{
                height: on ? `${Math.max(item.value ? 6 : 2, (item.value / max) * 100)}%` : '0%',
                background: highlightPeak && item.value && item === peak ? 'var(--accent)' : color,
                opacity: item.value ? 1 : 0.25,
                transitionDelay: `${i * 25}ms`,
              }}
            />
          </Tooltip>
        ))}
      </div>
      <div className="mt-2 flex min-w-0 gap-1 overflow-hidden text-[10px] text-muted">
        {items.map((item, i) => (
          <span key={item.key} className="min-w-0 flex-1 truncate text-center" title={i % labelEvery === 0 ? item.label : undefined}>{i % labelEvery === 0 ? item.label : ''}</span>
        ))}
      </div>
    </div>
  );
}

// Clickable tiles, one per sign-in method. Click one to filter the calendar below it.
export function MethodTiles({ items, total, selected, onSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((m, i) => {
        const meta = providerMeta(m.key);
        const Icon = meta.icon;
        const active = selected === m.key;
        const pct = total ? Math.round((m.count / total) * 100) : 0;
        return (
          <button
            key={m.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? null : m.key)}
            style={{ animationDelay: `${i * 60}ms`, borderColor: active ? meta.color : undefined, background: active ? tint(meta.color, 8) : undefined }}
            className="group/tile animate-rise flex items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-alt/40 active:translate-y-0 active:scale-[0.99]"
          >
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover/tile:-rotate-6 group-hover/tile:scale-110"
              style={{ background: tint(meta.color, 14), color: meta.color }}
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text">{meta.label}</span>
              <span className="block text-2xl font-semibold tabular-nums text-text">
                <CountUp value={m.count} /> <span className="text-xs font-normal text-muted">{m.count === 1 ? 'user' : 'users'}</span>
              </span>
              <span className="block truncate text-xs text-muted">
                {pct}% of users · last sign-in {m.last ? timeAgo(m.last) : 'never'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Share of users per method as animated bars.
export function MethodBars({ items, total }) {
  const on = useReveal([items]);
  return (
    <ul className="space-y-4">
      {items.map((m, i) => {
        const meta = providerMeta(m.key);
        const Icon = meta.icon;
        const pct = total ? (m.count / total) * 100 : 0;
        return (
          <li key={m.key} style={{ animationDelay: `${i * 70}ms` }} className="animate-rise">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: tint(meta.color, 14), color: meta.color }}>
                <Icon size={15} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-text">{meta.label}</span>
                  <span className="tabular-nums text-muted">{formatInt(m.count)} · {Math.round(pct)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: on ? `${pct}%` : '0%', background: meta.color, transitionDelay: `${i * 80}ms` }}
                  />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Donut of users per role. data: [{ label: 'admin', value: 1 }]
export function RoleDonut({ data, total }) {
  const on = useReveal([data]);
  const R = 46;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = data.map((d) => {
    const len = total ? (d.value / total) * C : 0;
    const seg = { ...d, len, start: acc, color: ROLE_COLOR[d.label] || colorFor(d.label) };
    acc += len;
    return seg;
  });

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative size-32 shrink-0 sm:size-44 lg:size-52">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`${total} users by role`}>
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="14" style={{ stroke: 'var(--surface-alt)' }} />
          {segs.map((s, i) => (
            <circle
              key={s.label}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              strokeWidth="14"
              strokeDasharray={`${on ? Math.max(0, s.len - (segs.length > 1 ? 2 : 0)) : 0} ${C}`}
              strokeDashoffset={-s.start}
              style={{ stroke: s.color, transition: 'stroke-dasharray 800ms ease-out', transitionDelay: `${i * 120}ms` }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-text"><CountUp value={total} /></p>
            <p className="text-xs text-muted">users</p>
          </div>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {segs.map((s, i) => (
          <li key={s.label} style={{ animationDelay: `${i * 60}ms` }} className="animate-rise flex items-center justify-between gap-3">
            <RoleBadge role={s.label} />
            <span className="text-sm tabular-nums text-muted">
              {formatInt(s.value)} <span className="text-xs">· {total ? Math.round((s.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Top customers by money spent. Rows open the user's detail drawer.
export function SpenderList({ users, onView }) {
  const on = useReveal([users]);
  const max = Math.max(1, ...users.map((u) => Number(u.totalSpent) || 0));
  if (!users.length) return <p className="py-8 text-center text-sm text-muted">No orders yet.</p>;

  return (
    <ul className="space-y-1">
      {users.map((u, i) => (
        <li key={u.$id}>
          <button
            type="button"
            onClick={() => onView?.(u)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="group/row animate-rise flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-alt"
          >
            <span className="w-4 text-xs tabular-nums text-muted">{i + 1}</span>
            <Avatar user={u} size="size-9 text-xs" className="group-hover/row:scale-105" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-text">{u.name || u.username}</span>
                <span className="shrink-0 tabular-nums text-text">{formatMoney(u.totalSpent)}</span>
              </span>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-alt">
                <span
                  className="block h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: on ? `${((Number(u.totalSpent) || 0) / max) * 100}%` : '0%', background: 'var(--graph-3)', transitionDelay: `${i * 80}ms` }}
                />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// admin / support / manager accounts. Rows open the user's detail drawer.
export function TeamList({ users, onView }) {
  if (!users.length) return <p className="py-8 text-center text-sm text-muted">No team accounts.</p>;
  return (
    <ul className="space-y-1">
      {users.map((u, i) => (
        <li key={u.$id}>
          <button
            type="button"
            onClick={() => onView?.(u)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="group/row animate-rise flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-alt"
          >
            <Avatar user={u} size="size-9 text-xs" className="group-hover/row:scale-105" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text">{u.name || u.username}</span>
              <Tooltip label={u.lastLoginAt ? fullDate(u.lastLoginAt) : ''}>
                <span className="block truncate text-xs text-muted">Last login {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'never'}</span>
              </Tooltip>
            </span>
            <RoleBadge role={u.role} />
          </button>
        </li>
      ))}
    </ul>
  );
}

// Cities users last ordered from, as coloured chips with counts.
export function CityChips({ data }) {
  if (!data.length) return <p className="py-6 text-center text-sm text-muted">No locations yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {data.map((c, i) => (
        <li key={c.label} style={{ animationDelay: `${i * 50}ms` }} className="animate-rise inline-flex items-center gap-1.5">
          <CityChip city={c.label} />
          <span className="text-xs tabular-nums text-muted">{c.value}</span>
        </li>
      ))}
    </ul>
  );
}