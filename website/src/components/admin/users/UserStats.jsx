import { useAppSelector } from '../../../store/slices/hooks';
import { selectUserStats } from '../../../store/slices/userSlice';
import useEntered from '../../../ui/custom/motion/useEntered';
import { RoleBadge } from './UserBadges';
import { ROLE_VALUES, formatInt, formatMoney } from './userFields';

function Tile({ label, value, tone = 'text-text', index, loading }) {
  const entered = useEntered(index * 40);
  return (
    <div
      className={`rounded-lg border border-border bg-surface px-4 py-3 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <p className="text-xs text-muted">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-6 w-16 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
      ) : (
        <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
      )}
    </div>
  );
}

// Totals, orders, spend and a per-role breakdown, all from selectUserStats.
export default function UserStats({ loading = false }) {
  const stats = useAppSelector(selectUserStats);

  const tiles = [
    { label: 'Total users', value: formatInt(stats.total) },
    { label: 'Active', value: formatInt(stats.active), tone: 'text-success' },
    { label: 'Blocked', value: formatInt(stats.blocked), tone: stats.blocked ? 'text-error' : 'text-text' },
    { label: 'Orders', value: formatInt(stats.orders) },
    { label: 'Total spent', value: formatMoney(stats.totalSpent) },
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