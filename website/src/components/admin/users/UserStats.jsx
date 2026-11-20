import { useState } from 'react';
import { Activity, Eye, EyeOff } from 'lucide-react';

import { useAppSelector } from '../../../store/slices/hooks';
import { selectUserStats } from '../../../store/slices/userSlice';
import AppIcon from '../../../ui/custom/AppIcon';
import CountUp from '../../../ui/custom/motion/CountUp';
import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import { formatCardMoney, formatCardNumber, formatFullCardMoney } from '../../../ui/graphs/CardMoney';
import { maskLength, tint } from '../../../ui/graphs/utils';
import { RoleBadge } from './UserBadges';
import { ROLE_VALUES } from './userFields';

function Tile({ label, icon: Icon, appIcon, color, tone, index, loading, count, text, sensitive = false, tooltip }) {
  const [hidden, setHidden] = useState(false);
  return (
    <Tooltip label={hidden ? 'Hidden' : tooltip ?? (text ? formatFullCardMoney(count) : new Intl.NumberFormat('en-PK').format(count || 0))} block className="h-full w-full min-w-0">
      <div
        style={{ animationDelay: `${index * 50}ms` }}
        className="group/tile flex h-full min-h-[6.5rem] w-full min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-surface-alt/40 sm:gap-2 sm:p-3"
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
            <AppIcon name={appIcon} tone={tone} className="size-8 shrink-0 object-contain transition-transform duration-300 group-hover/tile:scale-105 sm:size-9" />
          ) : Icon ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg sm:size-9" style={{ background: tint(color, 14), color }}>
              <Icon size={16} aria-hidden="true" />
            </span>
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-alt text-muted sm:size-9">
              <Activity size={16} aria-hidden="true" />
            </span>
          )}
          {loading ? (
            <div className="h-7 w-16 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
          ) : (
            <p className="min-w-0 flex-1 truncate text-xl font-semibold tabular-nums text-text">
              <span className={`inline-block transition-all duration-300 motion-reduce:transition-none ${hidden ? 'scale-95 blur-[2px] opacity-60' : 'scale-100 blur-0 opacity-100'}`}>
                {hidden ? '*'.repeat(maskLength(count)) : text ?? <CountUp value={count} format={formatCardNumber} />}
              </span>
            </p>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

// Totals, orders, spend and a per-role breakdown, all from selectUserStats.
export default function UserStats({ loading = false }) {
  const stats = useAppSelector(selectUserStats);

  const tiles = [
    { label: 'Total users', appIcon: 'customers', color: 'var(--accent-tone-1)', tone: 1, count: stats.total },
    { label: 'Active', appIcon: 'user', color: 'var(--accent-tone-7)', tone: 7, count: stats.active },
    { label: 'Blocked', appIcon: 'alert', color: 'var(--accent-tone-4)', tone: 4, count: stats.blocked },
    { label: 'Orders', appIcon: 'list', color: 'var(--accent-tone-5)', tone: 5, count: stats.orders },
    { label: 'Total spent', appIcon: 'pkr', color: 'var(--accent-tone-3)', tone: 3, count: stats.totalSpent, text: formatCardMoney(stats.totalSpent), tooltip: formatFullCardMoney(stats.totalSpent), sensitive: true },
  ];
  const roles = ROLE_VALUES.filter((role) => stats.byRole[role]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile, index) => (
          <Tile key={tile.label} index={index} loading={loading} {...tile} />
        ))}
      </div>

      {!loading && roles.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-muted">By role</span>
          {roles.map((role) => (
            <span key={role} className="inline-flex items-center gap-1.5">
              <RoleBadge role={role} />
              <span className="text-sm tabular-nums text-muted">{stats.byRole[role]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}