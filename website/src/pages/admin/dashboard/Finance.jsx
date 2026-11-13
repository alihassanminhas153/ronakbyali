import PanelPageTitle from '../../../ui/custom/PanelPageTitle';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Boxes, CalendarDays, Download, Heart, LayoutList, PackagePlus, PieChart, Plus, RefreshCw, TrendingUp, Trophy, LineChart as LineIcon } from 'lucide-react';

import {
  DemandTab, InventoryTab, LedgerForm, LedgerTable, OverviewTab, PERIODS, ProfitTab, RestockForm,
  TYPE_META, TYPE_ORDER, buildFinance, entriesToCsv, prettyDate, rs, toDateKey, useFinanceData,
} from '../../../components/admin/finance';
import financeService from '../../../lib/appwrite/finance';
import { ChartCard, Donut, HeatmapCalendar, StatTile, TrendGraph, compact, countByDay } from '../../../ui/graphs';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import Segmented from '../../../ui/custom/input/Segmented';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';

const CTA_PHRASES = ['Record an investment', 'Add an expense', 'Log a withdrawal', 'Add other income'];
const SORTS = ['Newest', 'Oldest', 'Highest amount', 'Lowest amount'];
const TYPE_LABELS = TYPE_ORDER.map((t) => TYPE_META[t].label);
const TYPE_BY_LABEL = Object.fromEntries(TYPE_ORDER.map((t) => [TYPE_META[t].label, t]));
const PAGE = 20;
const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.id, label: p.label, icon: CalendarDays, tone: 1 }));

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

// Admin > Finance   (/team/:username/finance)
export default function Finance() {
  const data = useFinanceData();
  const { ledger, products, loading, error, reload, reloadLedger } = data;

  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  // ledger filters
  const [search, setSearch] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('Newest');
  const [visible, setVisible] = useState(PAGE);

  // entry form
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [formType, setFormType] = useState('expense');
  // restock form
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockKey, setRestockKey] = useState(0);
  const [restockPreset, setRestockPreset] = useState(null);
  // delete
  const [toDelete, setToDelete] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!loading) setUpdatedAt(new Date());
  }, [loading]);

  const { orders, carts, wishlists } = data;
  const m = useMemo(
    () => buildFinance({ orders, products, carts, wishlists, ledger }, period),
    [orders, products, carts, wishlists, ledger, period]
  );
  const categories = useMemo(() => [...new Set(ledger.map((e) => e.category).filter(Boolean))].sort(), [ledger]);

  /* ---------- ledger list ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const type = TYPE_BY_LABEL[typeLabel];
    const rows = ledger.filter(
      (e) =>
        (!type || e.type === type) &&
        (!category || e.category === category) &&
        (!q || [e.title, e.category, e.note].some((v) => String(v || '').toLowerCase().includes(q)))
    );
    const by = {
      Newest: (a, b) => new Date(b.date) - new Date(a.date),
      Oldest: (a, b) => new Date(a.date) - new Date(b.date),
      'Highest amount': (a, b) => b.amount - a.amount,
      'Lowest amount': (a, b) => a.amount - b.amount,
    }[sort];
    return [...rows].sort(by);
  }, [ledger, search, typeLabel, category, sort]);
  const isFiltered = Boolean(search || typeLabel || category);
  const moneyIn = filtered.filter((e) => TYPE_META[e.type].sign > 0).reduce((s, e) => s + Number(e.amount || 0), 0);
  const moneyOut = filtered.filter((e) => TYPE_META[e.type].sign < 0).reduce((s, e) => s + Number(e.amount || 0), 0);

  const resetFilters = () => { setSearch(''); setTypeLabel(''); setCategory(''); setVisible(PAGE); };
  const onSearch = useCallback((text) => { setSearch(text); setVisible(PAGE); }, []);

  /* ---------- actions ---------- */
  const openAdd = (type = 'expense') => {
    setEditing(null);
    setFormType(type);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (entry) => {
    setEditing(entry);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openRestock = (product = null) => {
    setRestockPreset(product);
    setRestockKey((k) => k + 1);
    setRestockOpen(true);
  };

  const onEntrySaved = () => { setFormOpen(false); reloadLedger(); };
  const onRestocked = () => { setRestockOpen(false); reload(); };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    const ok = await financeService.deleteEntry(toDelete.$id);
    setDeleting(false);
    if (!ok) { setDeleteError(financeService.lastError || 'Could not delete the entry.'); return; }
    setDeleteOpen(false);
    reloadLedger();
  };

  const exportCsv = () => {
    const blob = new Blob([entriesToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-${toDateKey()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp, color: 'var(--accent-tone-1)' },
    { id: 'ledger', label: 'Ledger', icon: LayoutList, color: 'var(--accent-tone-4)', badge: ledger.length || undefined },
    { id: 'inventory', label: 'Inventory', icon: Boxes, color: 'var(--accent-tone-2)' },
    { id: 'demand', label: 'Carts & wishlists', icon: Heart, color: 'var(--accent-tone-6)' },
    { id: 'profit', label: 'Product profit', icon: Trophy, color: 'var(--accent-tone-3)' },
  ];
  const showPeriod = tab === 'overview' || tab === 'profit';

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <PanelPageTitle icon="wallet" className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Finance</PanelPageTitle>
          <p className="mt-1 hidden text-sm text-muted lg:block">
            {loading && !ledger.length && !products.length ? (
              'Loading…'
            ) : (
              <>
                Net {m.all.net < 0 ? 'loss' : 'profit'} all time{' '}
                <CountUp value={Math.abs(m.all.net)} format={(n) => rs(n)} className="font-semibold" />
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-accent-tone-3' : 'bg-accent-tone-7'}`} />
              {loading ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            title="Fetch the latest orders, products, carts and entries"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{loading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">Try again</button>
        </div>
      )}

      {/* Big add button */}
<button
  type="button"
  onClick={() => openAdd()}
  style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
  className="group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-2xl p-5 text-left text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] sm:gap-6 sm:p-7"
>
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
    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">New entry</span>
    <span className="heading mt-1 block min-h-[1.6em] truncate text-xl sm:text-3xl"><Typewriter phrases={CTA_PHRASES} icon="wallet" tone={5} /></span>
    <span className="mt-0.5 hidden text-sm text-white/75 sm:block">Keep every rupee that comes in or goes out in one place.</span>
  </span>

  <span className="relative hidden shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 group-hover:scale-105 sm:inline-flex">
    Add entry
    <ArrowRight size={16} className="group-hover:animate-nudge" />
  </span>
</button>

      {/* quick operations */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Restock a product', icon: PackagePlus, tone: 2, onClick: () => openRestock() },
          { label: 'Export ledger (CSV)', icon: Download, tone: 5, onClick: exportCsv },
        ].map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            style={{ '--op': `var(--accent-tone-${a.tone})` }}
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-px hover:border-[var(--op)] hover:text-[var(--op)] active:translate-y-0 active:scale-95"
          >
            <a.icon size={16} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
            {a.label}
          </button>
        ))}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {showPeriod && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Showing numbers for</p>
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} aria-label="Period" />
        </div>
      )}

      {tab === 'overview' && <TabPanel key="overview"><OverviewTab m={m} /></TabPanel>}

      {tab === 'ledger' && (
        <TabPanel key="ledger" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem]">
            <SearchInput size="sm" value={search} onSearch={onSearch} placeholder="Search title, category, note" label="Search entries" className="sm:col-span-2 lg:col-span-1" />
            <SearchSelect aria-label="Filter by type" options={TYPE_LABELS} value={typeLabel} onChange={(v) => { setTypeLabel(v); setVisible(PAGE); }} creatable={false} placeholder="All types" searchPlaceholder="Search types…" />
            <SearchSelect aria-label="Filter by category" options={categories} value={category} onChange={(v) => { setCategory(v); setVisible(PAGE); }} creatable={false} placeholder="All categories" searchPlaceholder="Search categories…" />
            <SearchSelect aria-label="Sort entries" options={SORTS} value={sort} onChange={(v) => setSort(v || 'Newest')} creatable={false} clearable={false} placeholder="Sort" searchPlaceholder="Search…" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label={isFiltered ? 'Money in (filtered)' : 'Money in'} value={moneyIn} format={(n) => `Rs ${compact(n)}`} hint="investment + other income" appIcon="pkr" sensitive tone={7} />
            <StatTile label={isFiltered ? 'Money out (filtered)' : 'Money out'} value={moneyOut} format={(n) => `Rs ${compact(n)}`} hint="expenses + withdrawals" appIcon="wallet" sensitive tone={4} delay={50} />
            <StatTile label="Difference" value={moneyIn - moneyOut} format={(n) => `${n < 0 ? '-' : ''}Rs ${compact(Math.abs(n))}`} hint={`${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`} appIcon="coins" sensitive tone={1} delay={100} />
          </div>

          {ledger.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">No entries yet</p>
              <p className="mt-1 text-sm text-muted">Record your first investment or expense to start tracking profit.</p>
              <ActionButton icon={Plus} onClick={() => openAdd('investment')} className="mt-5">Add entry</ActionButton>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">No entries match</p>
              <p className="mt-1 text-sm text-muted">Try a different search or clear the filters.</p>
              <button type="button" onClick={resetFilters} className="mt-4 text-sm font-medium text-accent-tone-1 underline">Clear filters</button>
            </div>
          ) : (
            <>
              <LedgerTable entries={filtered.slice(0, visible)} onEdit={openEdit} onDelete={(e) => { setToDelete(e); setDeleteError(''); setDeleteOpen(true); }} />
              {visible < filtered.length && (
                <div className="flex justify-center">
                  <ActionButton variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>Load more ({filtered.length - visible} left)</ActionButton>
                </div>
              )}
            </>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Entries per day" subtitle="Last 6 months" icon={CalendarDays} tone={4}>
              <HeatmapCalendar data={countByDay(ledger, (e) => e.date)} weeks={26} label="entries" />
            </ChartCard>
            <ChartCard title="Expenses per month" subtitle="Operating expenses, last 12 months" icon={LineIcon} tone={4} delay={80}>
              <TrendGraph data={m.months.map((x) => ({ label: x.label, value: x.expenses }))} color="var(--accent-tone-4)" format={(n) => `Rs ${compact(n)}`} />
            </ChartCard>
            <ChartCard title="Money by type" subtitle="All entries" icon={PieChart} tone={6} delay={160} className="lg:col-span-2">
              <Donut
                centerLabel="recorded"
                format={(n) => `Rs ${compact(n)}`}
                data={TYPE_ORDER.map((t) => ({
                  label: TYPE_META[t].label,
                  value: ledger.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount || 0), 0),
                  color: `var(--accent-tone-${TYPE_META[t].tone})`,
                }))}
                empty="No entries yet."
              />
            </ChartCard>
          </div>
        </TabPanel>
      )}

      {tab === 'inventory' && <TabPanel key="inventory"><InventoryTab m={m} onRestock={openRestock} /></TabPanel>}
      {tab === 'demand' && <TabPanel key="demand"><DemandTab m={m} onRestock={openRestock} /></TabPanel>}
      {tab === 'profit' && <TabPanel key="profit"><ProfitTab m={m} onChanged={reload} /></TabPanel>}

      {formKey > 0 && (
        <LedgerForm key={formKey} open={formOpen} entry={editing} defaultType={formType} entries={ledger} onClose={() => setFormOpen(false)} onSaved={onEntrySaved} />
      )}
      {restockKey > 0 && (
        <RestockForm key={restockKey} open={restockOpen} products={products} preset={restockPreset} onClose={() => setRestockOpen(false)} onSaved={onRestocked} />
      )}

      <ConfirmDialog
        open={deleteOpen}
        danger
        busy={deleting}
        error={deleteError}
        title="Delete entry?"
        message={toDelete ? `“${toDelete.title}” (${rs(toDelete.amount)}, ${prettyDate(toDelete.date)}) will be removed permanently.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}