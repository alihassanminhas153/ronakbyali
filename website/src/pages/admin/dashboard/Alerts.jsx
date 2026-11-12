import PanelPageTitle from '../../../ui/custom/PanelPageTitle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Eye, LayoutList, Plus, RefreshCw, Shapes, Activity } from 'lucide-react';

import {
  fetchAlertsPage,
  fetchAllAlerts,
  removeAlert,
  resetAlertSeen,
  selectAlertById,
  selectAlertError,
  selectAlertRows,
  selectAlertStatus,
  selectAlertTotal,
  selectAllAlerts,
  selectAllAlertsStatus,
  setAlertStatus,
  syncExpiredAlerts,
} from '../../../store/slices/alertSlice';
import {
  AlertForm,
  AlertTable,
  CreationCharts,
  DISPLAY_OPTIONS,
  ReachTab,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  StatusTab,
  TYPE_OPTIONS,
  TypesTab,
} from '../../../components/admin/alerts';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';

const PAGE_SIZE = 10;
const CTA_PHRASES = ['Announce a sale', 'Show a popup to customers', 'Schedule a notice'];
const NO_FILTERS = { type: '', display: '', status: '', sort: 'newest' };

const byNewest = (a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || '');
const SORTERS = {
  newest: byNewest,
  oldest: (a, b) => -byNewest(a, b),
  priority: (a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0) || byNewest(a, b),
};

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

// Admin > Alerts   (/team/:username/alerts)
export default function Alerts() {
  const dispatch = useDispatch();
  const rows = useSelector(selectAlertRows);
  const total = useSelector(selectAlertTotal);
  const status = useSelector(selectAlertStatus);
  const error = useSelector(selectAlertError);
  const all = useSelector(selectAllAlerts);
  const allStatus = useSelector(selectAllAlertsStatus);

  const [tab, setTab] = useState('alerts');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0); // new key = fresh form; 0 = never opened
  const [editingId, setEditingId] = useState(null); // null = add
  const [toDelete, setToDelete] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toReset, setToReset] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);
  const editing = useSelector(selectAlertById(editingId));

  const load = useCallback(
    (p = page) =>
      dispatch(
        fetchAlertsPage({
          limit: PAGE_SIZE,
          offset: (p - 1) * PAGE_SIZE,
          status: filters.status,
          type: filters.type,
          popup: filters.display === '' ? '' : filters.display === 'popup',
          sort: filters.sort,
        })
      ),
    [dispatch, page, filters]
  );
  const loadRef = useRef(load);
  loadRef.current = load;

  // the list follows the page and the filters
  useEffect(() => { load(); }, [load]);

  // on open: load the charts' data and mark overdue alerts as expired
  useEffect(() => {
    dispatch(fetchAllAlerts());
    dispatch(syncExpiredAlerts())
      .unwrap()
      .then((changed) => {
        if (!changed) return;
        loadRef.current();
        dispatch(fetchAllAlerts());
      })
      .catch(() => {});
  }, [dispatch]);

  // chart data finished loading (first load or refresh) -> remember when
  useEffect(() => {
    if (allStatus === 'succeeded' || allStatus === 'failed') setUpdatedAt(new Date());
  }, [allStatus]);

  const applyFilters = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const onSearch = useCallback((term) => {
    setSearch(term || '');
    setPage(1);
  }, []);

  // While searching, the list is filtered here from every loaded alert and paged locally.
  // Without a search it is the server page.
  const term = search.trim().toLowerCase();
  const matches = useMemo(
    () =>
      term
        ? all
            .filter(
              (a) =>
                (!filters.status || a.status === filters.status) &&
                (!filters.type || a.type === filters.type) &&
                (!filters.display || a.popup === (filters.display === 'popup')) &&
                `${a.title} ${a.message}`.toLowerCase().includes(term)
            )
            .sort(SORTERS[filters.sort] || byNewest)
        : null,
    [all, term, filters]
  );
  const shownRows = matches ? matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : rows;
  const shownTotal = matches ? matches.length : total;

  const loading = !matches && status === 'loading';
  const filtered = Boolean(term || filters.type || filters.display || filters.status);
  const busy = refreshing || loading || allStatus === 'loading';

  // Refresh button: pull the latest rows from Appwrite (list and charts).
  const refresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(syncExpiredAlerts());
      await Promise.all([load(), dispatch(fetchAllAlerts())]);
    } finally {
      setRefreshing(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (alert) => {
    setEditingId(alert.$id);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const onSaved = () => {
    const wasAdd = !editingId;
    setFormOpen(false);
    if (wasAdd && page !== 1) setPage(1); // newest first, so a new alert lands on page 1
    else load();
  };

  const toggleStatus = async (alert) => {
    setBusyId(alert.$id);
    try {
      await dispatch(setAlertStatus({ alertId: alert.$id, status: alert.status === 'active' ? 'inactive' : 'active' })).unwrap();
      load();
    } catch {
      /* the row simply keeps its old value */
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await dispatch(removeAlert({ alertId: toDelete.$id })).unwrap();
      setDeleteOpen(false);
      if (shownRows.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      setDeleteError(typeof err === 'string' ? err : err?.message || 'Could not delete the alert.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmReset = async () => {
    setResetting(true);
    setResetError('');
    try {
      await dispatch(resetAlertSeen({ alertId: toReset.$id })).unwrap();
      setResetOpen(false);
    } catch (err) {
      setResetError(typeof err === 'string' ? err : err?.message || 'Could not reset who has seen it.');
    } finally {
      setResetting(false);
    }
  };

  const tabs = [
    { id: 'alerts', label: 'Alerts', icon: LayoutList, color: 'var(--accent-tone-1)', badge: all.length || undefined },
    { id: 'status', label: 'Status', icon: Activity, color: 'var(--accent-tone-2)' },
    { id: 'types', label: 'Types', icon: Shapes, color: 'var(--accent-tone-6)' },
    { id: 'reach', label: 'Reach', icon: Eye, color: 'var(--accent-tone-3)' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <PanelPageTitle icon="alert" className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Alerts</PanelPageTitle>
          <p className="mt-1 hidden text-sm text-muted lg:block">
            {loading && !shownRows.length ? (
              'Loading…'
            ) : (
              <>
                <CountUp value={shownTotal} className="font-semibold text-text" /> {shownTotal === 1 ? 'alert' : 'alerts'}
                {filtered ? ' match' : ''}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${busy ? 'animate-pulse bg-accent-tone-3' : 'bg-accent-tone-7'}`} />
              {busy ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            title="Fetch the latest alerts from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{busy ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Big add button */}
      <button
        type="button"
        onClick={openAdd}
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-2xl p-5 text-left text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] sm:gap-6 sm:p-7"
      >
        {/* decorative shapes */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-white/60 transition-transform duration-500 group-hover:scale-x-100" />

        <span className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-16 sm:w-16">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-2xl border-2 border-white/70" />
          <span className="grid h-full w-full place-items-center rounded-2xl border border-white/25 bg-white/15 transition-transform duration-500 ease-out group-hover:rotate-90 group-hover:scale-105">
            <Plus size={28} strokeWidth={2.5} />
          </span>
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">New alert</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-xl sm:text-3xl">
            <Typewriter phrases={CTA_PHRASES} />
          </span>
          <span className="mt-0.5 hidden text-sm text-white/75 sm:block">Write it once and customers see it as a bar or a popup.</span>
        </span>

        <span className="relative hidden shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 group-hover:scale-105 sm:inline-flex">
          Add alert
          <ArrowRight size={16} className="group-hover:animate-nudge" />
        </span>
      </button>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'alerts' && (
        <TabPanel key="alerts" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem_11rem]">
            <SearchInput
              size="sm"
              value={search}
              onSearch={onSearch}
              placeholder="Search title and message"
              label="Search alerts"
              className="sm:col-span-2 lg:col-span-1"
            />
            <SelectInput
              size="sm"
              aria-label="Filter by type"
              placeholder="All types"
              options={TYPE_OPTIONS}
              value={filters.type}
              onChange={(value) => applyFilters({ type: value || '' })}
              clearable
            />
            <SelectInput
              size="sm"
              aria-label="Filter by display"
              placeholder="Bars and popups"
              options={DISPLAY_OPTIONS}
              value={filters.display}
              onChange={(value) => applyFilters({ display: value || '' })}
              clearable
            />
            <SelectInput
              size="sm"
              aria-label="Filter by status"
              placeholder="Any status"
              options={STATUS_OPTIONS}
              value={filters.status}
              onChange={(value) => applyFilters({ status: value || '' })}
              clearable
            />
            <SelectInput
              size="sm"
              aria-label="Sort alerts"
              options={SORT_OPTIONS}
              value={filters.sort}
              onChange={(value) => applyFilters({ sort: value || 'newest' })}
            />
          </div>

          {status === 'failed' && !shownRows.length ? (
            <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-6 text-center text-sm text-error">
              {error || 'Could not load alerts.'}{' '}
              <button type="button" onClick={() => load()} className="font-medium underline">Try again</button>
            </div>
          ) : shownRows.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">{filtered ? 'No alerts match' : 'No alerts yet'}</p>
              <p className="mt-1 text-sm text-muted">
                {filtered ? 'Try a different search or clear the filters.' : 'Add your first alert to get started.'}
              </p>
              {!filtered && <ActionButton icon={Plus} onClick={openAdd} className="mt-5">Add alert</ActionButton>}
            </div>
          ) : (
            <AlertTable
              rows={shownRows}
              loading={loading}
              busyId={busyId}
              page={page}
              pageSize={PAGE_SIZE}
              total={shownTotal}
              onPage={setPage}
              onOpen={openEdit}
              onToggle={toggleStatus}
              onReset={(alert) => { setToReset(alert); setResetError(''); setResetOpen(true); }}
              onDelete={(alert) => { setToDelete(alert); setDeleteError(''); setDeleteOpen(true); }}
            />
          )}

          <CreationCharts rows={all} />
        </TabPanel>
      )}

      {tab !== 'alerts' && allStatus === 'failed' && !all.length ? (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-6 text-center text-sm text-error">
          Could not load the chart data.{' '}
          <button type="button" onClick={() => dispatch(fetchAllAlerts())} className="font-medium underline">Try again</button>
        </div>
      ) : (
        <>
          {tab === 'status' && <TabPanel key="status"><StatusTab rows={all} /></TabPanel>}
          {tab === 'types' && <TabPanel key="types"><TypesTab rows={all} /></TabPanel>}
          {tab === 'reach' && <TabPanel key="reach"><ReachTab rows={all} /></TabPanel>}
        </>
      )}

      {formKey > 0 && (
        <AlertForm key={formKey} open={formOpen} alert={editing} onClose={() => setFormOpen(false)} onSaved={onSaved} />
      )}

      <ConfirmDialog
        open={deleteOpen}
        danger
        busy={deleting}
        error={deleteError}
        title="Delete alert?"
        message={toDelete ? `“${toDelete.title}” and its view counts will be removed permanently.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
      <ConfirmDialog
        open={resetOpen}
        busy={resetting}
        error={resetError}
        title="Show this popup again?"
        message={toReset ? `Everyone who pressed the button on “${toReset.title}” will see it again.` : ''}
        confirmLabel="Show again"
        onConfirm={confirmReset}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}