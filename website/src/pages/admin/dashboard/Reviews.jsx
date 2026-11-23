import PageHeader from '../../../ui/custom/PageHeader';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Calculator, CalendarDays, Check, CheckCheck, Download, LineChart as LineIcon, MessageSquare,
  PieChart, RefreshCw, Star, TrendingUp, Trophy, X,
} from 'lucide-react';

import {
  PERIODS, ProductRatingRow, RATING_LABELS, REVIEW_SORTERS, RatingBars, ReviewCard, SORTS, SelectBox,
  STATUS_META, STATUS_ORDER, buildProductStats, buildReviewStats, prettyDate, reviewsToCsv,
} from '../../../components/admin/reviews';
import {
  approveMany, approveReview, clearReviewError, deleteReview, fetchReviews, recalculateProduct, rejectMany,
  rejectReview, replyToReview, syncAllProducts,
} from '../../../store/slices/reviewSlice';
import { ChartCard, Donut, HeatmapCalendar, StatTile, TrendGraph, countByDay } from '../../../ui/graphs';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import SelectionGrid from '../../../ui/custom/input/SelectionGrid';
import Segmented from '../../../ui/custom/input/Segmented';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';

const PAGE = 10;
const STATUS_LABELS = STATUS_ORDER.map((s) => STATUS_META[s].label);
const STATUS_BY_LABEL = Object.fromEntries(STATUS_ORDER.map((s) => [STATUS_META[s].label, s]));
const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.id, label: p.label, icon: CalendarDays, tone: 1 }));
const PRODUCT_SORTS = [
  { value: 'count', label: 'Most reviewed', icon: MessageSquare, tone: 1 },
  { value: 'high', label: 'Top rated', icon: Trophy, tone: 7 },
  { value: 'low', label: 'Lowest rated', icon: Star, tone: 4 },
];
const PRODUCT_SORTERS = {
  count: (a, b) => b.total - a.total,
  high: (a, b) => b.average - a.average || b.approved - a.approved,
  low: (a, b) => (a.approved ? a.average : 6) - (b.approved ? b.average : 6) || b.approved - a.approved,
};
const whole = (n) => String(Math.round(n));
const noun = (n) => (n === 1 ? 'review' : 'reviews');

// Same button look as the review card actions. --op is the hover colour.
const BULK_BTN =
  'group inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-px hover:border-[var(--op)] hover:text-[var(--op)] active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-50';

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

// Admin > Reviews   (/team/:username/reviews)
export default function Reviews() {
  const dispatch = useDispatch();
  const { items, status, error, loadedAt, busy, actionError, syncing, bulkBusy } = useSelector((s) => s.reviews);
  const loading = status === 'loading';

  const [tab, setTab] = useState('reviews');
  const [period, setPeriod] = useState('30d');
  const [notice, setNotice] = useState('');
  const updatedAt = useMemo(() => (loadedAt ? new Date(loadedAt) : null), [loadedAt]);
  const ago = useTimeAgo(updatedAt);

  // review filters
  const [search, setSearch] = useState('');
  const [statusLabel, setStatusLabel] = useState('');
  const [ratingLabel, setRatingLabel] = useState('');
  const [productName, setProductName] = useState('');
  const [sort, setSort] = useState('Newest');
  const [visible, setVisible] = useState(PAGE);
  // product tab
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState('count');
  const [visibleProducts, setVisibleProducts] = useState(PAGE);
  // delete
  const [toDelete, setToDelete] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  // selection + bulk actions
  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState(null); // { action: 'approve' | 'reject', rows } waiting for confirmation
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const reload = useCallback(() => dispatch(fetchReviews()), [dispatch]);
  useEffect(() => {
    if (status === 'idle') reload();
  }, [status, reload]);

  const m = useMemo(() => buildReviewStats(items, period), [items, period]);
  const pending = m.pending;
  const productNames = useMemo(() => [...new Set(items.map((r) => r.productName).filter(Boolean))].sort(), [items]);
  const productStats = useMemo(() => buildProductStats(items), [items]);

  /* ---------- review list ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const wanted = STATUS_BY_LABEL[statusLabel];
    const stars = ratingLabel ? Number(ratingLabel[0]) : 0;
    const rows = items.filter(
      (r) =>
        (!wanted || r.status === wanted) &&
        (!stars || r.rating === stars) &&
        (!productName || r.productName === productName) &&
        (!q || [r.title, r.message, r.productName, r.reviewerName, r.username, r.adminReply].some((v) => String(v || '').toLowerCase().includes(q)))
    );
    return [...rows].sort(REVIEW_SORTERS[sort]);
  }, [items, search, statusLabel, ratingLabel, productName, sort]);
  const isFiltered = Boolean(search || statusLabel || ratingLabel || productName);

  const resetFilters = () => { setSearch(''); setStatusLabel(''); setRatingLabel(''); setProductName(''); setVisible(PAGE); };
  const onSearch = useCallback((text) => { setSearch(text); setVisible(PAGE); }, []);

  /* ---------- selection ---------- */
  // Only reviews that are in the current filtered list count, so what you see is what you act on.
  const picked = useMemo(() => filtered.filter((r) => selected.has(r.$id)), [filtered, selected]);
  const allPicked = filtered.length > 0 && picked.length === filtered.length;
  const toggleOne = useCallback((r, on) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(r.$id);
      else next.delete(r.$id);
      return next;
    });
  }, []);
  const toggleAll = () => setSelected(allPicked ? new Set() : new Set(filtered.map((r) => r.$id)));
  const approvable = (rows) => rows.filter((r) => r.status !== 'approved');
  const rejectable = (rows) => rows.filter((r) => r.status !== 'rejected');

  /* ---------- product list ---------- */
  const shownProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return productStats.filter((p) => !q || p.name.toLowerCase().includes(q)).sort(PRODUCT_SORTERS[productSort]);
  }, [productStats, productSearch, productSort]);
  useEffect(() => setVisibleProducts(PAGE), [productSearch, productSort]);

  /* ---------- actions ---------- */
  const onApprove = (r) => dispatch(approveReview(r.$id));
  const onReject = (r) => dispatch(rejectReview(r.$id));
  const onReply = (r, text) => dispatch(replyToReview({ id: r.$id, text })).unwrap().then(() => true, () => false);
  const onRecalculate = (productId) => dispatch(recalculateProduct(productId));

  const onSync = () => {
    setNotice('');
    dispatch(syncAllProducts())
      .unwrap()
      .then(
        (n) => setNotice(`Updated the rating of ${n} ${n === 1 ? 'product' : 'products'}.`),
        () => {}
      );
  };

  // Runs approveMany / rejectMany. Resolves '' on success or an error message.
  const runBulk = async (action, rows) => {
    const list = action === 'approve' ? approvable(rows) : rejectable(rows);
    if (!list.length) return '';
    setNotice('');
    try {
      const res = await dispatch((action === 'approve' ? approveMany : rejectMany)(list)).unwrap();
      const n = res.updated.length;
      setNotice(`${action === 'approve' ? 'Approved' : 'Rejected'} ${n} ${noun(n)}${res.failed ? ` (${res.failed} failed)` : ''}.`);
      setSelected(new Set());
      return '';
    } catch (e) {
      return typeof e === 'string' ? e : 'Something went wrong.';
    }
  };

  const askBulk = (action, rows) => {
    setBulk({ action, rows: action === 'approve' ? approvable(rows) : rejectable(rows) });
    setBulkError('');
    setBulkOpen(true);
  };

  const confirmBulk = async () => {
    const message = await runBulk(bulk.action, bulk.rows);
    if (message) setBulkError(message);
    else setBulkOpen(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await dispatch(deleteReview(toDelete.$id)).unwrap();
      setDeleteOpen(false);
    } catch (e) {
      setDeleteError(typeof e === 'string' ? e : 'Could not delete the review.');
    }
    setDeleting(false);
  };

  const exportCsv = () => {
    const blob = new Blob([reviewsToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, color: 'var(--accent-tone-4)', badge: pending || undefined },
    { id: 'products', label: 'Product ratings', icon: Star, color: 'var(--accent-tone-3)' },
    { id: 'overview', label: 'Overview', icon: TrendingUp, color: 'var(--accent-tone-1)' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        art="reviews"
        title="Reviews"
        subtitle={loading && !items.length ? 'Loading…' : pending ? (
          <>
            <CountUp value={pending} format={whole} className="font-semibold" /> {pending === 1 ? 'review is' : 'reviews are'} waiting for a decision
          </>
        ) : 'Every review has been moderated'}
        actions={(
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
              title="Fetch the latest reviews"
              className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
              <span>{loading ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        )}
      />

      {error && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">Try again</button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {actionError}{' '}
          <button type="button" onClick={() => dispatch(clearReviewError())} className="font-medium underline">Dismiss</button>
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-border bg-surface-alt px-4 py-3 text-sm text-text">
          {notice}{' '}
          <button type="button" onClick={() => setNotice('')} className="font-medium underline">Dismiss</button>
        </div>
      )}

      {/* quick operations */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: syncing ? 'Updating products…' : 'Sync product ratings', icon: Calculator, tone: 2, onClick: onSync, disabled: syncing },
          { label: 'Export reviews (CSV)', icon: Download, tone: 5, onClick: exportCsv, disabled: !filtered.length },
        ].map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            style={{ '--op': `var(--accent-tone-${a.tone})` }}
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-px hover:border-[var(--op)] hover:text-[var(--op)] active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
          >
            <a.icon size={16} className={`transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${a.disabled && syncing ? 'animate-pulse' : ''}`} />
            {a.label}
          </button>
        ))}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Showing numbers for</p>
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} aria-label="Period" />
        </div>
      )}

      {/* ---------------- Overview ---------------- */}
      {tab === 'overview' && (
        <TabPanel key="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Reviews" value={m.total} format={whole} hint={`${m.approved} approved`} appIcon="reviews" tone={1} />
            <StatTile label="Average rating" value={m.average} format={(n) => `${n.toFixed(1)} / 5`} hint="approved reviews only" appIcon="trophy" tone={3} delay={50} />
            <StatTile label="Waiting" value={pending} format={whole} hint="need a decision" appIcon="wrist_watch" tone={2} delay={100} />
            <StatTile label="Reply rate" value={m.replyRate} format={(n) => `${Math.round(n)}%`} hint="reviews you answered" appIcon="network" tone={5} delay={150} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Rating breakdown" subtitle="Approved reviews" icon={Star} tone={3}>
              {m.approved ? <RatingBars counts={m.counts} total={m.approved} /> : <p className="py-6 text-center text-sm text-muted">No approved reviews in this period.</p>}
            </ChartCard>
            <ChartCard title="Review status" subtitle="Reviews in this period" icon={PieChart} tone={6} delay={80}>
              <Donut
                centerLabel="reviews"
                format={whole}
                data={STATUS_ORDER.map((s) => ({
                  label: STATUS_META[s].label,
                  value: m.statusCounts[s],
                  color: `var(--accent-tone-${STATUS_META[s].tone})`,
                }))}
                empty="No reviews yet."
              />
            </ChartCard>
            <ChartCard title="Reviews per day" subtitle="Last 6 months" icon={CalendarDays} tone={4} delay={160}>
              <HeatmapCalendar data={countByDay(items, (r) => r.$createdAt)} weeks={26} label="reviews" />
            </ChartCard>
            <ChartCard title="Reviews per month" subtitle="Last 12 months" icon={LineIcon} tone={1} delay={240}>
              <TrendGraph data={m.months} color="var(--accent-tone-1)" format={whole} />
            </ChartCard>
          </div>
        </TabPanel>
      )}

      {/* ---------------- Reviews ---------------- */}
      {tab === 'reviews' && (
        <TabPanel key="reviews" className="space-y-6">
          <div className="space-y-3">
            <SearchInput size="sm" value={search} onSearch={onSearch} placeholder="Search review, product, customer" label="Search reviews" className="w-full min-w-0" />
            <SelectionGrid>
              <SearchSelect aria-label="Filter by status" options={STATUS_LABELS} value={statusLabel} onChange={(v) => { setStatusLabel(v); setVisible(PAGE); }} creatable={false} placeholder="All statuses" searchPlaceholder="Search statuses…" />
              <SearchSelect aria-label="Filter by rating" options={RATING_LABELS} value={ratingLabel} onChange={(v) => { setRatingLabel(v); setVisible(PAGE); }} creatable={false} placeholder="All ratings" searchPlaceholder="Search ratings…" />
              <SearchSelect aria-label="Filter by product" options={productNames} value={productName} onChange={(v) => { setProductName(v); setVisible(PAGE); }} creatable={false} placeholder="All products" searchPlaceholder="Search products…" />
              <SearchSelect aria-label="Sort reviews" options={SORTS} value={sort} onChange={(v) => setSort(v || 'Newest')} creatable={false} clearable={false} placeholder="Sort" searchPlaceholder="Search…" />
            </SelectionGrid>
          </div>

          <p className="text-xs text-muted">
            {isFiltered ? `${filtered.length} of ${items.length} reviews match` : `${items.length} ${items.length === 1 ? 'review' : 'reviews'}`}
            {updatedAt ? ` · last checked ${prettyDate(updatedAt.toISOString())}` : ''}
          </p>

          {filtered.length > 0 && (
            <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/95 px-3.5 py-2.5 shadow-soft backdrop-blur">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-text">
                <SelectBox
                  checked={allPicked}
                  indeterminate={picked.length > 0 && !allPicked}
                  onChange={toggleAll}
                  label={allPicked ? 'Clear selection' : `Select all ${filtered.length} matching reviews`}
                />
                <span>{picked.length ? `${picked.length} selected` : `Select all ${filtered.length}${isFiltered ? ' matching' : ''}`}</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {picked.length > 0 ? (
                  <>
                    <button type="button" disabled={bulkBusy || !approvable(picked).length} onClick={() => runBulk('approve', picked)} style={{ '--op': 'var(--accent-tone-7)' }} className={BULK_BTN}>
                      <Check size={16} /> Approve selected ({approvable(picked).length})
                    </button>
                    <button type="button" disabled={bulkBusy || !rejectable(picked).length} onClick={() => runBulk('reject', picked)} style={{ '--op': 'var(--accent-tone-4)' }} className={BULK_BTN}>
                      <X size={16} /> Reject selected ({rejectable(picked).length})
                    </button>
                    <button type="button" disabled={bulkBusy} onClick={() => setSelected(new Set())} style={{ '--op': 'var(--accent-tone-2)' }} className={BULK_BTN}>
                      Clear
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={bulkBusy || !approvable(filtered).length} onClick={() => askBulk('approve', filtered)} style={{ '--op': 'var(--accent-tone-7)' }} className={BULK_BTN}>
                      <CheckCheck size={16} /> Approve all ({approvable(filtered).length})
                    </button>
                    <button type="button" disabled={bulkBusy || !rejectable(filtered).length} onClick={() => askBulk('reject', filtered)} style={{ '--op': 'var(--accent-tone-4)' }} className={BULK_BTN}>
                      <X size={16} /> Reject all ({rejectable(filtered).length})
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {items.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">No reviews yet</p>
              <p className="mt-1 text-sm text-muted">When customers review a product it shows up here for you to approve.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">No reviews match</p>
              <p className="mt-1 text-sm text-muted">Try a different search or clear the filters.</p>
              <button type="button" onClick={resetFilters} className="mt-4 text-sm font-medium text-accent-tone-1 underline">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filtered.slice(0, visible).map((r, i) => (
                  <ReviewCard
                    key={r.$id}
                    review={r}
                    index={i}
                    busy={Boolean(busy[r.$id])}
                    selected={selected.has(r.$id)}
                    onSelect={toggleOne}
                    onApprove={onApprove}
                    onReject={onReject}
                    onReply={onReply}
                    onDelete={(rev) => { setToDelete(rev); setDeleteError(''); setDeleteOpen(true); }}
                  />
                ))}
              </div>
              {visible < filtered.length && (
                <div className="flex justify-center">
                  <ActionButton variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>Load more ({filtered.length - visible} left)</ActionButton>
                </div>
              )}
            </>
          )}
        </TabPanel>
      )}

      {/* ---------------- Product ratings ---------------- */}
      {tab === 'products' && (
        <TabPanel key="products" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput size="sm" value={productSearch} onSearch={setProductSearch} placeholder="Search products" label="Search products" className="w-full sm:w-72" />
            <Segmented options={PRODUCT_SORTS} value={productSort} onChange={setProductSort} aria-label="Sort products" />
          </div>

          {shownProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">{productStats.length ? 'No products match' : 'No reviewed products yet'}</p>
              <p className="mt-1 text-sm text-muted">{productStats.length ? 'Try a different search.' : 'Products appear here once customers review them.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shownProducts.slice(0, visibleProducts).map((p, i) => (
                <ProductRatingRow key={p.productId} product={p} index={i} busy={Boolean(busy[`p:${p.productId}`])} onRecalculate={onRecalculate} />
              ))}
              {shownProducts.length > visibleProducts && (
                <div className="flex justify-center">
                  <ActionButton variant="secondary" onClick={() => setVisibleProducts((count) => count + PAGE)}>
                    Show more ({shownProducts.length - visibleProducts} left)
                  </ActionButton>
                </div>
              )}
            </div>
          )}
        </TabPanel>
      )}

      <ConfirmDialog
        open={bulkOpen}
        danger={bulk?.action === 'reject'}
        busy={bulkBusy}
        error={bulkError}
        title={bulk?.action === 'approve' ? 'Approve all these reviews?' : 'Reject all these reviews?'}
        message={
          bulk
            ? `${bulk.rows.length} ${noun(bulk.rows.length)}${isFiltered ? ' matching your filters' : ''} will be ${bulk.action === 'approve' ? 'made public and counted in each product’s rating' : 'hidden from the shop'}. Reviews already ${bulk.action === 'approve' ? 'approved' : 'rejected'} are skipped.`
            : ''
        }
        confirmLabel={bulk?.action === 'approve' ? 'Approve all' : 'Reject all'}
        onConfirm={confirmBulk}
        onCancel={() => setBulkOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        danger
        busy={deleting}
        error={deleteError}
        title="Delete review?"
        message={toDelete ? `${toDelete.reviewerName || toDelete.username || 'This customer'}’s ${toDelete.rating}-star review of ${toDelete.productName || 'this product'} and its photos will be removed permanently.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}