import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { selectMe } from '../../../store/slices/userSlice';
import {
  dismissAlert,
  fetchAlertBars,
  fetchAlertPopups,
  markAlertSeen,
  selectAlertBars,
  selectAlertPopups,
  selectVisitorAlertsStatus,
  trackAlertImpression,
} from '../../../store/slices/alertSlice';
import { STAFF_ROLES } from '../../../lib/appwrite/order';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import useEntered from '../../../ui/custom/motion/useEntered';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import Segmented from '../../../ui/custom/input/Segmented';
import HeatmapCalendar from '../../../ui/graphs/HeatmapCalendar';
import { formatDateTime } from '../../../components/user/profile/profileMeta';

// Look of each alert type. `tone` is the graph colour number used by <Segmented>.
const TYPES = {
  info: { label: 'Info', icon: Info, color: 'var(--graph-5)', tone: 5 },
  success: { label: 'Success', icon: CheckCircle2, color: 'var(--success)', tone: 7 },
  warning: { label: 'Warning', icon: AlertTriangle, color: 'var(--warning)', tone: 3 },
  error: { label: 'Important', icon: XCircle, color: 'var(--error)', tone: 4 },
  promo: { label: 'Offer', icon: Sparkles, color: 'var(--graph-6)', tone: 6 },
};
const typeOf = (alert) => TYPES[alert?.type] || TYPES.info;

const TYPE_FILTERS = [
  { value: 'all', label: 'All', tone: 1 },
  ...Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label, icon: t.icon, tone: t.tone })),
];
const SORTS = [
  { value: 'priority', label: 'Most important first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

// "just now", "25s ago", "4m ago" ... re-rendered every 10 seconds
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

// ---------- Small pieces ----------

// Slides down + fades in on mount; the page removes it after a few seconds.
function Notice({ type, text, onDismiss }) {
  const entered = useEntered();
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : Check;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-300 motion-reduce:transition-none ${
        isError ? 'border-error/40 bg-error/10 text-error' : 'border-success/40 bg-success/10 text-success'
      } ${entered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
    >
      <Icon size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-full p-1 transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function StatTile({ icon: Icon, label, color, children }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--tile)]" style={{ '--tile': color }}>
      <span
        className="grid size-11 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="truncate font-display text-xl font-semibold text-text">{children}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-surface-alt text-muted">
        <Icon size={26} aria-hidden="true" />
      </span>
      <p className="mt-4 font-medium text-text">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
    </div>
  );
}

function AlertCard({ alert, onSeen, onDismiss }) {
  const t = typeOf(alert);
  const Icon = t.icon;
  const isExternal = /^https?:\/\//i.test(alert.link || '');
  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--tile)] hover:bg-surface-alt sm:p-5"
      style={{ '--tile': t.color }}
    >
      {/* coloured edge */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: t.color }} />

      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110"
          style={{ background: `color-mix(in srgb, ${t.color} 15%, transparent)`, color: t.color }}
        >
          <Icon size={20} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="heading-sm break-words text-text">{alert.title}</h3>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: `color-mix(in srgb, ${t.color} 15%, transparent)`, color: t.color }}
            >
              {t.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-medium text-muted">
              {alert.popup ? <BellRing size={11} aria-hidden="true" /> : <Megaphone size={11} aria-hidden="true" />}
              {alert.popup ? 'Popup' : 'Announcement'}
            </span>
          </div>

          <p className="mt-1.5 whitespace-pre-line break-words text-sm text-muted">{alert.message}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} aria-hidden="true" />
              {alert.endsAt ? `Ends ${formatDateTime(alert.endsAt)}` : `Posted ${formatDateTime(alert.startsAt || alert.$createdAt)}`}
            </span>
            {alert.userId && (
              <span className="inline-flex items-center gap-1.5 text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Just for you
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {alert.link && (
              <a
                href={alert.link}
                {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="btn btn-primary !min-h-10 gap-1.5 !px-4 !py-2 !text-sm"
              >
                Open
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            )}
            <button type="button" onClick={() => onSeen(alert)} className="btn btn-ghost !min-h-10 gap-1.5 !px-4 !py-2 !text-sm">
              <Check size={15} aria-hidden="true" />
              {alert.buttonText || 'Got it'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(alert)}
          aria-label={`Hide “${alert.title}” until your next visit`}
          title="Hide until your next visit"
          className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

// ---------- Page ----------

function AlertsView({ me }) {
  const dispatch = useAppDispatch();
  const entered = useEntered();
  const noticeTimer = useRef(null);

  const bars = useAppSelector(selectAlertBars);
  const popups = useAppSelector(selectAlertPopups);
  const status = useAppSelector(selectVisitorAlertsStatus);

  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('priority');
  const [notice, setNotice] = useState(null); // { type, text, id }
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  const isStaff = STAFF_ROLES.includes(me.role);

  const notify = (kind, text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ type: kind, text, id: Date.now() });
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([dispatch(fetchAlertBars()), dispatch(fetchAlertPopups())]);
    const ok = fetchAlertBars.fulfilled.match(a) && fetchAlertPopups.fulfilled.match(b);
    if (ok) setUpdatedAt(new Date());
    return ok;
  }, [dispatch]);

  // load on open (and again if the signed-in account changes)
  useEffect(() => {
    load();
  }, [load, me.$id]);

  const refresh = async () => {
    setRefreshing(true);
    const ok = await load();
    if (!ok) notify('error', 'Could not refresh your alerts. Try again in a moment.');
    setRefreshing(false);
  };

  // Everything this person can see right now, one list.
  const all = useMemo(
    () => [...popups.map((a) => ({ ...a, popup: true })), ...bars.map((a) => ({ ...a, popup: false }))],
    [bars, popups]
  );

  // Count each alert as "viewed" once per session (the service ignores repeats).
  useEffect(() => {
    if (isStaff) return;
    all.forEach((alert) => dispatch(trackAlertImpression({ alert })));
  }, [all, dispatch, isStaff]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = all.filter((a) => {
      if (tab === 'announcements' && a.popup) return false;
      if (tab === 'popups' && !a.popup) return false;
      if (type !== 'all' && a.type !== type) return false;
      if (q && !`${a.title} ${a.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const time = (a) => new Date(a.startsAt || a.$createdAt).getTime() || 0;
    if (sort === 'newest') list.sort((x, y) => time(y) - time(x));
    else if (sort === 'oldest') list.sort((x, y) => time(x) - time(y));
    else list.sort((x, y) => (Number(y.priority) || 0) - (Number(x.priority) || 0) || time(y) - time(x));
    return list;
  }, [all, tab, type, query, sort]);

  const heatData = useMemo(
    () => all.map((a) => ({ date: new Date(a.startsAt || a.$createdAt), value: 1 })),
    [all]
  );

  const urgent = all.filter((a) => a.type === 'warning' || a.type === 'error').length;
  const offers = all.filter((a) => a.type === 'promo').length;
  const filtersOn = query.trim() !== '' || type !== 'all' || sort !== 'priority';
  const resetFilters = () => {
    setQuery('');
    setType('all');
    setSort('priority');
  };

  const onSeen = (alert) => {
    dispatch(markAlertSeen({ alert }));
    notify('ok', 'Got it. We won’t show this one again.');
  };
  const onDismiss = (alert) => {
    dispatch(dismissAlert({ alertId: alert.$id }));
    notify('ok', 'Hidden for now. It may come back on your next visit.');
  };

  const loading = status === 'loading' && all.length === 0;
  const busy = refreshing || status === 'loading';

  const tabs = [
    { id: 'all', label: 'All', icon: Layers, color: 'var(--graph-1)' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, color: 'var(--graph-2)' },
    { id: 'popups', label: 'Popups', icon: BellRing, color: 'var(--graph-6)' },
  ];

  return (
    <div
      className={`space-y-5 transition-all duration-500 motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Alerts</h1>
          <p className="mt-1 text-sm text-muted">News, offers and notices from the store.</p>
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
            onClick={refresh}
            disabled={busy}
            title="Fetch your latest alerts from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-graph-1 hover:bg-surface-alt hover:text-graph-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {notice && <Notice key={notice.id} type={notice.type} text={notice.text} onDismiss={() => setNotice(null)} />}

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-2xl p-5 text-center text-white sm:flex-row sm:gap-7 sm:p-7 sm:text-left"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-white/60 transition-transform duration-500 group-hover:scale-x-100" />

        <div className="relative shrink-0">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full border-2 border-white/70" />
          <div className="relative grid size-24 place-items-center rounded-full border-2 border-white/40 bg-white/15 text-white/90 sm:size-28">
            <BellRing size={44} aria-hidden="true" />
            {all.length > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-7 place-items-center rounded-full border-2 border-white bg-white px-1.5 py-0.5 text-xs font-bold text-[color:var(--brown)]">
                {all.length}
              </span>
            )}
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Your inbox</span>
          <span className="heading mt-1 block text-2xl sm:text-3xl">
            {all.length === 0 ? 'You’re all caught up' : all.length === 1 ? '1 alert for you' : `${all.length} alerts for you`}
          </span>
          <p className="mt-2 text-sm text-white/80">
            Press “Got it” to stop seeing an alert for good, or the X to hide it until your next visit.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={BellRing} label="Alerts for you" color="var(--graph-1)">
          <CountUp value={all.length} />
        </StatTile>
        <StatTile icon={Megaphone} label="Announcements" color="var(--graph-2)">
          <CountUp value={bars.length} />
        </StatTile>
        <StatTile icon={Sparkles} label="Offers" color="var(--graph-6)">
          <CountUp value={offers} />
        </StatTile>
        <StatTile icon={AlertTriangle} label="Needs attention" color="var(--graph-3)">
          <CountUp value={urgent} />
        </StatTile>
      </div>

      {/* Activity heatmap */}
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="heading-sm text-text">Alert activity</h2>
          <span className="text-xs text-muted">When your current alerts started</span>
        </div>
        <HeatmapCalendar data={heatData} label="alerts" />
      </section>

      {isStaff && (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          <Info size={16} className="shrink-0 text-graph-5" aria-hidden="true" />
          Staff accounts don’t receive customer alerts. Manage them from the admin panel.
        </div>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <TabPanel key={tab} className="space-y-4">
        {/* Filters */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <SearchInput value={query} onSearch={setQuery} placeholder="Search your alerts" label="Search alerts" size="sm" />
          <SelectInput size="sm" value={sort} onChange={setSort} options={SORTS} aria-label="Sort alerts" />
        </div>
        <Segmented options={TYPE_FILTERS} value={type} onChange={setType} aria-label="Filter by type" />

        {loading ? (
          <div role="status" className="flex items-center gap-2 py-8 text-muted">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Loading your alerts…
          </div>
        ) : status === 'failed' && all.length === 0 ? (
          <EmptyState icon={AlertCircle} title="Could not load your alerts" text="Please check your connection and press Refresh." />
        ) : visible.length === 0 ? (
          filtersOn || tab !== 'all' ? (
            <EmptyState icon={Layers} title="No alerts match" text="Try another type or clear your search." />
          ) : (
            <EmptyState icon={CheckCircle2} title="Nothing new" text="When the store posts news or offers, they will show up here." />
          )
        ) : (
          <div className="space-y-3">
            {filtersOn && (
              <button type="button" onClick={resetFilters} className="text-xs font-medium text-accent hover:underline">
                Clear filters
              </button>
            )}
            {visible.map((alert) => (
              <AlertCard key={alert.$id} alert={alert} onSeen={onSeen} onDismiss={onDismiss} />
            ))}
          </div>
        )}
      </TabPanel>
    </div>
  );
}

// User > Alerts
// Shows the announcement bars and popups the store has posted for the signed-in customer.
export default function Alerts() {
  const me = useAppSelector(selectMe);

  if (!me) {
    return (
      <div role="status" className="flex items-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        Loading your alerts…
      </div>
    );
  }

  // key: start with fresh state if the account ever changes.
  return <AlertsView key={me.$id} me={me} />;
}