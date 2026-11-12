import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { useAppSelector } from '../../../store/slices/hooks';
import { selectUserStats } from '../../../store/slices/userSlice';
import AppIcon from '../../../ui/custom/AppIcon';
import CountUp from '../../../ui/custom/motion/CountUp';
import { tint } from '../../../ui/graphs/utils';
import { RoleBadge } from './UserBadges';
import { ROLE_VALUES, formatMoney } from './userFields';

function Tile({ label, icon: Icon, appIcon, color, index, loading, count, text, sensitive = false }) {
  const [hidden, setHidden] = useState(false);
  return (
    <div
      style={{ animationDelay: `${index * 50}ms`, borderTopColor: color }}
      className="group/tile animate-rise rounded-lg border border-border border-t-2 bg-surface px-4 py-3 transition-colors hover:border-border hover:bg-surface-alt/40"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
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
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-2xl font-semibold tabular-nums text-text">
            {hidden ? '••••••' : text ?? <CountUp value={count} />}
          </p>
          {appIcon ? (
            <AppIcon name={appIcon} className="size-9 shrink-0 object-contain transition-transform duration-300 group-hover/tile:scale-105" />
          ) : Icon ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: tint(color, 14), color }}>
              <Icon size={16} aria-hidden="true" />
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Totals, orders, spend and a per-role breakdown, all from selectUserStats.
export default function UserStats({ loading = false }) {
  const stats = useAppSelector(selectUserStats);

  const tiles = [
    { label: 'Total users', appIcon: 'customers', color: 'var(--graph-1)', count: stats.total },
    { label: 'Active', appIcon: 'user', color: 'var(--graph-7)', count: stats.active },
    { label: 'Blocked', appIcon: 'alert', color: 'var(--graph-4)', count: stats.blocked },
    { label: 'Orders', appIcon: 'list', color: 'var(--graph-5)', count: stats.orders },
    { label: 'Total spent', appIcon: 'pkr', color: 'var(--graph-3)', text: formatMoney(stats.totalSpent), sensitive: true },
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