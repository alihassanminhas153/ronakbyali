import { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, SearchX, Users as UsersIcon } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { selectProfile } from '../../../store/slices/authSlice';
import {
  clearUserError,
  fetchUsers,
  loadMyProfile,
  resetUserFilters,
  selectMe,
  selectMeStatus,
  selectPendingUserIds,
  selectUserFilters,
  selectUserStats,
  selectUsersError,
  selectUsersListStatus,
  selectVisibleUsers,
  setUserBlocked,
  setUserBlockedFilter,
  setUserQuery,
  setUserRoleFilter,
} from '../../../store/slices/userSlice';
import { toAuthUser } from '../../../router/useProfileSync';

import {
  BLOCKED_FILTER_OPTIONS,
  ROLE_FILTER_OPTIONS,
  UserErrorBanner,
  UserForm,
  UserStats,
  UserTable,
  UserTableSkeleton,
  blockLockReason,
} from '../../../components/admin/users';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import useEntered from '../../../ui/custom/motion/useEntered';
import TriInputToggle from '../../../ui/custom/toggles/TriInputToggle';

function StateCard({ icon: Icon, title, message, tone = 'neutral', children }) {
  const entered = useEntered();
  const error = tone === 'error';
  return (
    <div
      role={error ? 'alert' : undefined}
      className={`flex flex-col items-center gap-3 rounded-lg border px-6 py-12 text-center transition duration-300 ease-out motion-reduce:transition-none ${
        error ? 'border-error/40 bg-error/10' : 'border-border bg-surface'
      } ${entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <Icon size={28} className={error ? 'text-error' : 'text-muted'} aria-hidden="true" />
      <p className="font-medium text-text">{title}</p>
      {message && <p className="max-w-md text-sm text-muted">{message}</p>}
      {children}
    </div>
  );
}

export default function Users() {
  const dispatch = useAppDispatch();
  const me = useAppSelector(selectMe);
  const authProfile = useAppSelector(selectProfile);
  const meStatus = useAppSelector(selectMeStatus);
  const listStatus = useAppSelector(selectUsersListStatus);
  const error = useAppSelector(selectUsersError);
  const filters = useAppSelector(selectUserFilters);
  const users = useAppSelector(selectVisibleUsers);
  const stats = useAppSelector(selectUserStats);
  const pendingIds = useAppSelector(selectPendingUserIds);

  const [loadedOnce, setLoadedOnce] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toBlock, setToBlock] = useState(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const entered = useEntered();
  const meId = me?.$id ?? null;

  // fetchUsers needs the signed-in profile (selectMe), so wait until it is loaded.
  useEffect(() => {
    if (meStatus === 'ready' && listStatus === 'idle') dispatch(fetchUsers());
  }, [meStatus, listStatus, dispatch]);

  useEffect(() => {
    if (listStatus === 'ready') setLoadedOnce(true);
  }, [listStatus]);

  const failed = listStatus === 'failed' || (meStatus === 'failed' && !meId);
  const loading = !failed && !loadedOnce;
  const refreshing = loadedOnce && listStatus === 'loading';
  const filtersActive = Boolean(
    filters.query.trim() || filters.role !== 'all' || filters.blocked !== 'all'
  );
  const countText = loadedOnce ? `${users.length} of ${stats.total} users` : 'Loading users…';

  const retry = () => {
    if (!meId && authProfile) dispatch(loadMyProfile({ user: toAuthUser(authProfile) }));
    else dispatch(fetchUsers());
  };

  const openView = (user) => {
    setViewId(user.$id);
    setFormOpen(true);
  };

  // Unblocking is immediate; blocking asks first. The slice is optimistic and rolls back.
  const toggleBlocked = (user, next) => {
    if (blockLockReason(user, meId)) return;
    if (next) {
      setToBlock(user);
      setBlockOpen(true);
    } else {
      dispatch(setUserBlocked({ userId: user.$id, isBlocked: false }));
    }
  };

  const confirmBlock = async () => {
    if (!toBlock) return;
    setBlocking(true);
    await dispatch(setUserBlocked({ userId: toBlock.$id, isBlocked: true }));
    setBlocking(false);
    setBlockOpen(false); // a failure shows in the banner and the switch has rolled back
  };

  return (
    <div
      className={`space-y-6 transition-opacity duration-300 motion-reduce:transition-none ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Users</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {countText}
          </p>
        </div>
        <div className="flex gap-2">
          {filtersActive && (
            <ActionButton variant="ghost" icon={RotateCcw} onClick={() => dispatch(resetUserFilters())}>
              Reset
            </ActionButton>
          )}
          <ActionButton
            variant="secondary"
            icon={RefreshCw}
            loading={refreshing}
            disabled={failed || loading}
            onClick={() => dispatch(fetchUsers())}
          >
            Refresh
          </ActionButton>
        </div>
      </header>

      {error && !failed && (
        <UserErrorBanner message={error} onDismiss={() => dispatch(clearUserError())} />
      )}

      <UserStats loading={loading} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <SearchInput
          size="sm"
          delay={200}
          value={filters.query}
          onSearch={(query) => dispatch(setUserQuery(query))}
          placeholder="Search name, email, username, phone, city, role"
          label="Search users"
          className="sm:col-span-2 lg:col-span-1"
        />
        <SelectInput
          size="sm"
          aria-label="Filter by role"
          options={ROLE_FILTER_OPTIONS}
          value={filters.role}
          onChange={(role) => dispatch(setUserRoleFilter(role || 'all'))}
        />
        <TriInputToggle
          aria-label="Filter by blocked status"
          options={BLOCKED_FILTER_OPTIONS}
          value={filters.blocked}
          onChange={(blocked) => dispatch(setUserBlockedFilter(blocked))}
          className="justify-self-start"
        />
      </div>

      {failed ? (
        <StateCard
          tone="error"
          icon={UsersIcon}
          title="Could not load users."
          message={error || 'Check your connection and try again.'}
        >
          <ActionButton variant="secondary" icon={RefreshCw} onClick={retry}>
            Retry
          </ActionButton>
        </StateCard>
      ) : loading ? (
        <UserTableSkeleton />
      ) : users.length === 0 ? (
        stats.total === 0 ? (
          <StateCard icon={UsersIcon} title="No users yet." message="Accounts show up here as people sign up." />
        ) : (
          <StateCard icon={SearchX} title="No users match your filters." message="Try a different search or clear the filters.">
            <ActionButton variant="secondary" icon={RotateCcw} onClick={() => dispatch(resetUserFilters())}>
              Reset filters
            </ActionButton>
          </StateCard>
        )
      ) : (
        <UserTable
          users={users}
          meId={meId}
          pendingIds={pendingIds}
          onView={openView}
          onToggleBlocked={toggleBlocked}
        />
      )}

      <UserForm
        open={formOpen}
        userId={viewId}
        meId={meId}
        onClose={() => setFormOpen(false)}
        onToggleBlocked={toggleBlocked}
      />

      <ConfirmDialog
        open={blockOpen}
        danger
        busy={blocking}
        title="Block this user?"
        message={
          toBlock
            ? `${toBlock.name || toBlock.email} will only see the blocked page, on every URL, until you unblock them.`
            : ''
        }
        confirmLabel="Block user"
        onConfirm={confirmBlock}
        onCancel={() => setBlockOpen(false)}
      />
    </div>
  );
}