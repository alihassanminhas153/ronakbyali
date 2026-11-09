import { Ban, ShoppingBag, UserCheck, Users, Wallet } from 'lucide-react';

import { useAppSelector } from '../../../store/slices/hooks';
import { selectUserStats } from '../../../store/slices/userSlice';
import CountUp from '../../../ui/custom/motion/CountUp';
import { tint } from '../../../ui/graphs/utils';
import { RoleBadge } from './UserBadges';
import { ROLE_VALUES, formatMoney } from './userFields';

function Tile({ label, icon: Icon, color, index, loading, count, text }) {
  return (
    <div
      style={{ animationDelay: `${index * 50}ms`, borderTopColor: color }}
      className="group/tile animate-rise rounded-lg border border-border border-t-2 bg-surface px-4 py-3 transition-colors hover:border-border hover:bg-surface-alt/40"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        <span
          className="grid size-8 place-items-center rounded-lg transition-transform duration-300 group-hover/tile:-rotate-6 group-hover/tile:scale-110"
          style={{ background: tint(color, 14), color }}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-text">
          {text ?? <CountUp value={count} />}
        </p>
      )}
    </div>
  );
}

// Totals, orders, spend and a per-role breakdown, all from selectUserStats.
export default function UserStats({ loading = false }) {
  const stats = useAppSelector(selectUserStats);

  const tiles = [
    { label: 'Total users', icon: Users, color: 'var(--graph-1)', count: stats.total },
    { label: 'Active', icon: UserCheck, color: 'var(--graph-7)', count: stats.active },
    { label: 'Blocked', icon: Ban, color: 'var(--graph-4)', count: stats.blocked },
    { label: 'Orders', icon: ShoppingBag, color: 'var(--graph-5)', count: stats.orders },
    { label: 'Total spent', icon: Wallet, color: 'var(--graph-3)', text: formatMoney(stats.totalSpent) },
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