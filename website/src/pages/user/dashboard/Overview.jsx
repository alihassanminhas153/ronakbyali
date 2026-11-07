import LogoutButton from '../../shared/auth/LogoutButton';
import { useAppSelector } from '../../../store/slices/hooks';
import { selectMe } from '../../../store/slices/userSlice';
import useEntered from '../../../ui/custom/motion/useEntered';
import { formatInt, formatMoney } from '../../../components/admin/users/userFields';

function Stat({ label, value, index }) {
  const entered = useEntered(index * 60);
  return (
    <div
      className={`rounded-lg border border-border bg-surface px-4 py-3 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

// Heading + logout are unchanged; the data below now comes from the users slice.
function Overview() {
  const me = useAppSelector(selectMe);
  const since = me?.$createdAt ? new Date(me.$createdAt).toLocaleDateString() : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Overview</h1>
        <LogoutButton />
      </div>

      {me && (
        <>
          <p className="text-muted">
            Welcome back, <span className="text-text">{me.name || me.username}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat index={0} label="Orders" value={formatInt(me.ordersCount)} />
            <Stat index={1} label="Total spent" value={formatMoney(me.totalSpent)} />
            <Stat index={2} label="Member since" value={since} />
          </div>
        </>
      )}
    </div>
  );
}

export default Overview;