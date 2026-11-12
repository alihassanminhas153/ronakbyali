import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  KeyRound,
  MapPin,
  RefreshCw,
  RotateCcw,
  SearchX,
  ShieldCheck,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { selectProfile } from '../../../store/slices/authSlice';
import {
  clearUserError,
  fetchUsers,
  loadMyProfile,
  resetUserFilters,
  selectAllUsers,
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
  CalendarPanel,
  ChartPanel,
  CityChips,
  ColumnChart,
  MethodBars,
  MethodTiles,
  ROLE_FILTER_OPTIONS,
  RoleDonut,
  SpenderList,
  TeamList,
  UserErrorBanner,
  UserForm,
  UserStats,
  UserTable,
  UserTableSkeleton,
  blockLockReason,
  buildUserAnalytics,
  loginDaysFor,
  providerMeta,
  providerOf,
} from '../../../components/admin/users';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';
import useEntered from '../../../ui/custom/motion/useEntered';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import TrendGraph from '../../../ui/graphs/TrendGraph';
import TriInputToggle from '../../../ui/custom/toggles/TriInputToggle';

const BANNER_PHRASES = ['See who signed in today', 'Check how people sign in', 'Block or promote in one click'];

// "just now", "25s ago", "4m ago" ... re-rendered every 10 seconds (same as the Products page)
function useTimeAgo(date) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  if (!date) return '';
  const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

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

function PanelSkeleton({ count = 2 }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-56 animate-pulse rounded-lg bg-surface-alt motion-reduce:animate-none" />
      ))}
    </div>
  );
}

function BannerPill({ label, value }) {
  return (
    <span className="rounded-xl border border-white/25 bg-white/15 px-4 py-2.5 text-center">
      <span className="block text-2xl font-semibold tabular-nums"><CountUp value={value} /></span>
      <span className="block text-[11px] text-white/75">{label}</span>
    </span>
  );
}

// Admin > Users
export default function Users() {
  const dispatch = useAppDispatch();
  const me = useAppSelector(selectMe);
  const authProfile = useAppSelector(selectProfile);
  const meStatus = useAppSelector(selectMeStatus);
  const listStatus = useAppSelector(selectUsersListStatus);
  const error = useAppSelector(selectUsersError);
  const filters = useAppSelector(selectUserFilters);
  const filtered = useAppSelector(selectVisibleUsers);
  const allUsers = useAppSelector(selectAllUsers);
  const stats = useAppSelector(selectUserStats);
  const pendingIds = useAppSelector(selectPendingUserIds);

  const [tab, setTab] = useState('overview');
  const [method, setMethod] = useState('all'); // sign-in method filter for the list
  const [calendarMethod, setCalendarMethod] = useState(null); // method tile picked on the Methods tab
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toBlock, setToBlock] = useState(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  const entered = useEntered();
  const meId = me?.$id ?? null;
  const analytics = useMemo(() => buildUserAnalytics(allUsers), [allUsers]);
  const users = useMemo(
    () => (method === 'all' ? filtered : filtered.filter((u) => providerOf(u) === method)),
    [filtered, method]
  );
  const methodOptions = useMemo(
    () => [
      { value: 'all', label: 'All methods' },
      ...analytics.methods.map((m) => ({ value: m.label, label: providerMeta(m.label).label })),
    ],
    [analytics.methods]
  );
  const methodCalendar = useMemo(() => loginDaysFor(allUsers, calendarMethod), [allUsers, calendarMethod]);

  // fetchUsers needs the signed-in profile (selectMe), so wait until it is loaded.
  useEffect(() => {
    if (meStatus === 'ready' && listStatus === 'idle') dispatch(fetchUsers());
  }, [meStatus, listStatus, dispatch]);

  useEffect(() => {
    if (listStatus === 'ready') {
      setLoadedOnce(true);
      setUpdatedAt(new Date());
    }
  }, [listStatus]);

  const failed = listStatus === 'failed' || (meStatus === 'failed' && !meId);
  const loading = !failed && !loadedOnce;
  const refreshing = loadedOnce && listStatus === 'loading';
  const busy = refreshing || listStatus === 'loading';
  const filtersActive = Boolean(
    filters.query.trim() || filters.role !== 'all' || filters.blocked !== 'all' || method !== 'all'
  );

  const resetAll = () => {
    dispatch(resetUserFilters());
    setMethod('all');
  };
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UsersIcon, color: 'var(--graph-1)', badge: stats.total || undefined },
    { id: 'activity', label: 'Activity', icon: CalendarDays, color: 'var(--graph-5)' },
    { id: 'methods', label: 'Sign-in methods', icon: KeyRound, color: 'var(--graph-6)' },
    { id: 'roles', label: 'Roles', icon: ShieldCheck, color: 'var(--graph-3)' },
  ];

  const signupItems = analytics.signups.map((b) => ({ key: b.key, label: b.label, value: b.value, tip: `${b.value} new ${b.value === 1 ? 'user' : 'users'} in ${b.label}` }));
  const hourItems = analytics.hours.map((h) => ({
    key: h.hour,
    label: String(h.hour),
    value: h.value,
    tip: `${h.value} ${h.value === 1 ? 'user' : 'users'} last signed in around ${String(h.hour).padStart(2, '0')}:00`,
  }));
  const calendarLabel = calendarMethod ? `${providerMeta(calendarMethod).label} logins` : 'logins';

  return (
    <div className={`space-y-5 transition-opacity duration-300 motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0'}`}>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Users</h1>
          <p className="mt-1 hidden text-sm text-muted lg:block" aria-live="polite">
            {loadedOnce ? (
              <>
                <CountUp value={users.length} className="font-semibold text-text" /> of {stats.total} {stats.total === 1 ? 'user' : 'users'}
              </>
            ) : (
              'Loading users…'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${busy ? 'animate-pulse bg-graph-3' : 'bg-graph-7'}`} />
              {busy ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => dispatch(fetchUsers())}
            disabled={busy || failed || loading}
            title="Fetch the latest users from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-graph-1 hover:bg-surface-alt hover:text-graph-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{busy ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Banner: same family as the Products add button */}
      <div
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-2xl p-5 text-white sm:gap-6 sm:p-7"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-40 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />

        <span className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-16 sm:w-16">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-2xl border-2 border-white/70" />
          <span className="grid h-full w-full place-items-center rounded-2xl border border-white/25 bg-white/15 transition-transform duration-500 ease-out group-hover:rotate-6 group-hover:scale-105">
            <UsersIcon size={28} strokeWidth={2.25} />
          </span>
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">People</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-xl sm:text-3xl">
            <Typewriter phrases={BANNER_PHRASES} />
          </span>
          <span className="mt-0.5 hidden text-sm text-white/75 sm:block">Every account, how they sign in and when they were last here.</span>
        </span>

        {loadedOnce && (
          <span className="relative hidden shrink-0 gap-3 md:flex">
            <BannerPill label="Active this week" value={analytics.active7} />
            <BannerPill label="New this month" value={analytics.newThisMonth} />
          </span>
        )}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {error && !failed && <UserErrorBanner message={error} onDismiss={() => dispatch(clearUserError())} />}

      {failed ? (
        <StateCard tone="error" icon={UsersIcon} title="Could not load users." message={error || 'Check your connection and try again.'}>
          <ActionButton variant="secondary" icon={RefreshCw} onClick={retry}>Retry</ActionButton>
        </StateCard>
      ) : (
        <>
          {tab === 'overview' && (
            <TabPanel key="overview" className="space-y-6">
              <UserStats loading={loading} />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]">
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
                <SelectInput
                  size="sm"
                  aria-label="Filter by sign-in method"
                  options={methodOptions}
                  value={method}
                  onChange={(value) => setMethod(value || 'all')}
                />
                <TriInputToggle
                  aria-label="Filter by blocked status"
                  options={BLOCKED_FILTER_OPTIONS}
                  value={filters.blocked}
                  onChange={(blocked) => dispatch(setUserBlockedFilter(blocked))}
                  className="justify-self-start"
                />
              </div>

              {filtersActive && (
                <div>
                  <ActionButton variant="ghost" size="sm" icon={RotateCcw} onClick={resetAll}>Reset filters</ActionButton>
                </div>
              )}

              {loading ? (
                <UserTableSkeleton />
              ) : users.length === 0 ? (
                stats.total === 0 ? (
                  <StateCard icon={UsersIcon} title="No users yet." message="Accounts show up here as people sign up." />
                ) : (
                  <StateCard icon={SearchX} title="No users match your filters." message="Try a different search or clear the filters.">
                    <ActionButton variant="secondary" icon={RotateCcw} onClick={resetAll}>Reset filters</ActionButton>
                  </StateCard>
                )
              ) : (
                <UserTable users={users} meId={meId} pendingIds={pendingIds} onView={openView} onToggleBlocked={toggleBlocked} />
              )}

              {!loading && (
                <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <CalendarPanel
                    className="h-full"
                    icon={CalendarDays}
                    tone={5}
                    title="Login calendar"
                    subtitle="The day each user last signed in, over the last 26 weeks."
                    data={analytics.loginDays}
                    label="logins"
                  />
                  <ChartPanel
                    className="h-full"
                    icon={TrendingUp}
                    tone={1}
                    delay={60}
                    title="New users"
                    subtitle="Sign-ups per month, last 12 months"
                    action={<span className="text-xs text-muted">{analytics.newThisMonth} this month</span>}
                  >
                    <TrendGraph data={analytics.signupsYear} color="var(--graph-1)" empty="No sign-ups yet." />
                  </ChartPanel>
                </div>
              )}
            </TabPanel>
          )}

          {tab === 'activity' && (
            <TabPanel key="activity" className="space-y-4">
              {loading ? (
                <PanelSkeleton />
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <CalendarPanel icon={CalendarDays} tone={5} delay={0} title="Last login" subtitle="Users by the day they last signed in" data={analytics.loginDays} label="logins" />
                    <CalendarPanel icon={TrendingUp} tone={2} delay={60} title="Sign-ups" subtitle="New accounts per day" data={analytics.joinDays} label="sign-ups" />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartPanel
                      icon={TrendingUp}
                      tone={1}
                      delay={120}
                      title="New users by month"
                      subtitle="Last 6 months"
                      action={<span className="text-xs text-muted">{analytics.newThisMonth} this month</span>}
                    >
                      <ColumnChart items={signupItems} color="var(--graph-1)" />
                    </ChartPanel>
                    <ChartPanel
                      icon={Clock}
                      tone={6}
                      delay={180}
                      title="Login time of day"
                      subtitle={analytics.peakHour === null ? 'Hour of the last login (your local time)' : `Busiest around ${String(analytics.peakHour).padStart(2, '0')}:00`}
                      action={<span className="text-xs text-muted">{analytics.today} today · {analytics.never} never</span>}
                    >
                      <ColumnChart items={hourItems} color="var(--graph-6)" height={120} labelEvery={3} highlightPeak />
                    </ChartPanel>
                  </div>
                </>
              )}
            </TabPanel>
          )}

          {tab === 'methods' && (
            <TabPanel key="methods" className="space-y-4">
              {loading ? (
                <PanelSkeleton />
              ) : analytics.methodList.length === 0 ? (
                <StateCard icon={KeyRound} title="No sign-in data yet." message="Methods appear once users sign up." />
              ) : (
                <>
                  <MethodTiles items={analytics.methodList} total={analytics.total} selected={calendarMethod} onSelect={setCalendarMethod} />
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <CalendarPanel
                      key={calendarMethod || 'all'}
                      icon={CalendarDays}
                      tone={calendarMethod ? providerMeta(calendarMethod).color : 6}
                      title={calendarMethod ? `${providerMeta(calendarMethod).label} logins` : 'Logins by method'}
                      subtitle={calendarMethod ? 'Click the tile again to see every method' : 'Pick a method above to filter the calendar'}
                      data={methodCalendar}
                      label={calendarLabel}
                    />
                    <ChartPanel icon={KeyRound} tone={6} delay={60} title="Share of users" subtitle="How accounts were created">
                      <MethodBars items={analytics.methodList} total={analytics.total} />
                    </ChartPanel>
                  </div>
                </>
              )}
            </TabPanel>
          )}

          {tab === 'roles' && (
            <TabPanel key="roles" className="space-y-4">
              {loading ? (
                <PanelSkeleton />
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartPanel icon={ShieldCheck} tone={3} title="Users by role" subtitle="Customers become loyal after repeat orders">
                      <RoleDonut data={analytics.roles} total={analytics.total} />
                    </ChartPanel>
                    <ChartPanel icon={ShieldCheck} tone={4} delay={60} title="Team" subtitle="Admin, support and manager accounts">
                      <TeamList users={analytics.team} onView={openView} />
                    </ChartPanel>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartPanel icon={TrendingUp} tone={7} delay={120} title="Top customers" subtitle="By total spent">
                      <SpenderList users={analytics.spenders} onView={openView} />
                    </ChartPanel>
                    <ChartPanel icon={MapPin} tone={2} delay={180} title="Where they order from" subtitle="Last known city">
                      <CityChips data={analytics.cities} />
                    </ChartPanel>
                  </div>
                </>
              )}
            </TabPanel>
          )}
        </>
      )}

      <UserForm open={formOpen} userId={viewId} meId={meId} onClose={() => setFormOpen(false)} onToggleBlocked={toggleBlocked} />

      <ConfirmDialog
        open={blockOpen}
        danger
        busy={blocking}
        title="Block this user?"
        message={toBlock ? `${toBlock.name || toBlock.email} will only see the blocked page, on every URL, until you unblock them.` : ''}
        confirmLabel="Block user"
        onConfirm={confirmBlock}
        onCancel={() => setBlockOpen(false)}
      />
    </div>
  );
}