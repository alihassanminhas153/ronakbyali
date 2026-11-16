import PageHeader from '../../../ui/custom/PageHeader';
import AppIcon from '../../../ui/custom/AppIcon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, ListOrdered, RefreshCw } from 'lucide-react';

import {
  DELIVERY_TYPES,
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  clearStaffWarning,
  fetchStaffCounts,
  fetchStaffConfirmedOrders,
  fetchStaffOrderAnalytics,
  fetchStaffOrders,
  fetchTrackerDetails,
  searchStaffOrders,
  selectStaffCounts,
  selectStaffConfirmedOrders,
  selectStaffConfirmedOrdersError,
  selectStaffConfirmedOrdersStatus,
  selectStaffError,
  selectStaffOrderAnalytics,
  selectStaffOrderAnalyticsError,
  selectStaffOrderAnalyticsStatus,
  selectStaffOrders,
  selectStaffStatus,
  selectStaffTotal,
  selectTrackerDetails,
} from '../../../store/slices/ordersSlice';
import {
  DELIVERY_LABEL,
  METHOD_LABEL,
  OrderForm,
  OrderTable,
  OrderTableSkeleton,
  PAYMENT_META,
  STATUS_META,
  toOptions,
  toneColor,
} from '../../../components/admin/orders';
import OrderAnalytics from '../../../components/admin/orders/OrderAnalytics';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';

const PAGE = 10;
const EMPTY = { term: '', status: '', paymentStatus: '', deliveryType: '', paymentMethod: '', isCustom: null };

const PAYMENT_OPTIONS = toOptions(PAYMENT_STATUS, PAYMENT_META);
const DELIVERY_OPTIONS = toOptions(DELIVERY_TYPES, DELIVERY_LABEL);
const METHOD_OPTIONS = toOptions(PAYMENT_METHODS, METHOD_LABEL);
const TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal orders' },
  { value: 'custom', label: 'Custom orders' },
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

// Admin > Orders   (/team/:username/orders)
export default function Orders() {
  const dispatch = useDispatch();
  const rows = useSelector(selectStaffOrders);
  const total = useSelector(selectStaffTotal);
  const status = useSelector(selectStaffStatus);
  const error = useSelector(selectStaffError);
  const counts = useSelector(selectStaffCounts);
  const analyticsOrders = useSelector(selectStaffOrderAnalytics);
  const analyticsStatus = useSelector(selectStaffOrderAnalyticsStatus);
  const analyticsError = useSelector(selectStaffOrderAnalyticsError);
  const trackerDetails = useSelector(selectTrackerDetails);
  const confirmedOrders = useSelector(selectStaffConfirmedOrders);
  const confirmedStatus = useSelector(selectStaffConfirmedOrdersStatus);
  const confirmedError = useSelector(selectStaffConfirmedOrdersError);

  const [view, setView] = useState('orders');
  const [filters, setFilters] = useState(EMPTY);
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0); // new key = fresh form; 0 = never opened
  const [visibleSearch, setVisibleSearch] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  // Search reads every order and filters in the browser, the normal list is paged by Appwrite.
  const rowCount = useRef(0);
  rowCount.current = rows.length;
  const load = useCallback(
    (f, append = false) => {
      const term = f.term.trim();
      if (term) return dispatch(searchStaffOrders({ term, status: f.status, isCustom: f.isCustom }));
      return dispatch(
        fetchStaffOrders({
          limit: PAGE,
          offset: append ? rowCount.current : 0,
          status: f.status,
          paymentStatus: f.paymentStatus,
          deliveryType: f.deliveryType,
          paymentMethod: f.paymentMethod,
          isCustom: f.isCustom,
        })
      );
    },
    [dispatch]
  );

  useEffect(() => {
    dispatch(clearStaffWarning());
    load(EMPTY);
    dispatch(fetchStaffCounts());
    dispatch(fetchStaffOrderAnalytics());
  }, [dispatch, load]);

  const applyFilters = useCallback(
    (patch) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      setVisibleSearch(PAGE);
      load(next);
    },
    [filters, load]
  );
  const onSearch = useCallback((term) => applyFilters({ term }), [applyFilters]);

  // The payment / delivery filters also apply to search results.
  const orders = useMemo(
    () =>
      rows.filter(
        (o) =>
          (!filters.paymentStatus || o.paymentStatus === filters.paymentStatus) &&
          (!filters.deliveryType || o.deliveryType === filters.deliveryType) &&
          (!filters.paymentMethod || o.paymentMethod === filters.paymentMethod) &&
          (filters.isCustom === null || Boolean(o.isCustom) === filters.isCustom)
      ),
    [rows, filters]
  );
  const orderIds = useMemo(() => orders.map((order) => order.$id), [orders]);

  useEffect(() => {
    if (orderIds.length) dispatch(fetchTrackerDetails(orderIds));
  }, [dispatch, orderIds]);

  // Refresh button: pull the latest rows from Appwrite (list and tab counts).
  const refresh = async () => {
    setRefreshing(true);
    try {
      if (view === 'confirmed') {
        await Promise.all([
          dispatch(fetchStaffConfirmedOrders({ limit: 100, offset: 0 })),
          dispatch(fetchStaffOrders({ status: 'confirmed', limit: 100, offset: 0 })),
        ]);
      } else {
        await Promise.all([load(filters), dispatch(fetchStaffCounts()), dispatch(fetchStaffOrderAnalytics())]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const openConfirmedOrders = async () => {
    setView('confirmed');
    await Promise.all([
      dispatch(fetchStaffConfirmedOrders({ limit: 100, offset: 0 })),
      dispatch(fetchStaffOrders({ status: 'confirmed', limit: 100, offset: 0 })),
    ]);
  };
  const openOrders = () => {
    setView('orders');
    load(filters);
  };

  const openOrder = (order) => {
    setSelectedId(order.$id);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  // list finished loading (first load, filter, refresh) -> remember when
  useEffect(() => {
    if (status === 'succeeded') setUpdatedAt(new Date());
  }, [status]);

  const loading = status === 'loading';
  const searching = Boolean(filters.term.trim());
  const filtered = Boolean(searching || filters.status || filters.paymentStatus || filters.deliveryType || filters.paymentMethod || filters.isCustom !== null);
  const hasMore = !searching && rows.length < total;
  const visibleOrders = searching ? orders.slice(0, visibleSearch) : orders;
  const busy = refreshing || loading || analyticsStatus === 'loading';

  const pending = counts?.pending || 0;
  const allCount = Object.values(counts || {}).reduce((s, n) => s + (Number(n) || 0), 0);
  const phrases = useMemo(
    () => [
      pending ? `${pending} ${pending === 1 ? 'order is' : 'orders are'} waiting` : 'No orders waiting',
      'Confirm, pack and ship',
      'Add the courier tracking link',
    ],
    [pending]
  );

  const tabs = [
    { id: 'all', label: 'All', icon: ListOrdered, color: 'var(--accent-tone-1)', badge: allCount || undefined },
    ...ORDER_STATUS.map((s) => ({
      id: s,
      label: STATUS_META[s].label,
      icon: STATUS_META[s].icon,
      color: toneColor(STATUS_META[s].tone),
      badge: counts?.[s] || undefined,
    })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        art="orders"
        title="Orders"
        subtitle={loading && !rows.length ? 'Loading…' : (
          <>
            <CountUp value={searching ? orders.length : total} className="font-semibold text-text" />{' '}
            {(searching ? orders.length : total) === 1 ? 'order' : 'orders'}
            {filtered ? ' match' : ''}
          </>
        )}
        actions={(
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
              title="Fetch the latest orders from the database"
              className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
            >
              <RefreshCw size={16} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
              <span>{busy ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        )}
      />

      <Tabs
        tabs={[
          { id: 'orders', label: 'Orders', icon: ListOrdered },
          { id: 'confirmed', label: 'Confirmed orders', badge: confirmedOrders.length || undefined },
        ]}
        value={view}
        onChange={(selected) => selected === 'confirmed' ? openConfirmedOrders() : openOrders()}
      />

      {view === 'orders' ? (
      <>
      {/* Big pending button (same block as "Add product") */}
      <button
        type="button"
        onClick={() => applyFilters({ status: 'pending' })}
        className="group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left text-text transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] sm:gap-6 sm:p-7"
      >
        {/* decorative shapes */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-surface-alt transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-surface-alt/60 sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-accent transition-transform duration-500 group-hover:scale-x-100" />

        <span className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-16 sm:w-16">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-2xl border-2 border-accent" />
          <span className="grid h-full w-full place-items-center rounded-2xl border border-border bg-surface-alt transition-transform duration-500 ease-out group-hover:-rotate-6 group-hover:scale-105">
            <AppIcon name="list" entity="order" hueRotate={false} className="size-10 object-contain sm:size-12" />
          </span>
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Order desk</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-xl sm:text-3xl">
            <Typewriter key={pending} phrases={phrases} />
          </span>
          <span className="mt-0.5 hidden text-sm text-muted sm:block">Change the status, add tracking and keep the customer informed.</span>
        </span>

        <span className="relative hidden shrink-0 items-center gap-2 rounded-full border border-border bg-surface-alt px-5 py-2.5 text-sm font-semibold text-text transition-transform duration-300 group-hover:scale-105 sm:inline-flex">
          Review pending
          <ArrowRight size={16} className="group-hover:animate-nudge" />
        </span>
      </button>

      <Tabs iconOnly tabs={tabs} value={filters.status || 'all'} onChange={(id) => applyFilters({ status: id === 'all' ? '' : id })} />

      <TabPanel key={filters.status || 'all'} className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_12rem]">
          <SearchInput
            size="sm"
            value={filters.term}
            onSearch={onSearch}
            loading={loading && searching}
            placeholder="Search order no., name, phone, tracking"
            label="Search orders"
            className="sm:col-span-2 lg:col-span-1"
          />
          <SelectInput
            size="sm"
            aria-label="Filter by payment"
            placeholder="Any payment"
            options={PAYMENT_OPTIONS}
            value={filters.paymentStatus}
            onChange={(value) => applyFilters({ paymentStatus: value || '' })}
            clearable
          />
          <SelectInput
            size="sm"
            aria-label="Filter by delivery"
            placeholder="Any delivery"
            options={DELIVERY_OPTIONS}
            value={filters.deliveryType}
            onChange={(value) => applyFilters({ deliveryType: value || '' })}
            clearable
          />
          <SelectInput
            size="sm"
            aria-label="Filter by payment method"
            placeholder="Any method"
            options={METHOD_OPTIONS}
            value={filters.paymentMethod}
            onChange={(value) => applyFilters({ paymentMethod: value || '' })}
            clearable
          />
          <SelectInput
            size="sm"
            aria-label="Filter by order type"
            placeholder="All order types"
            options={TYPE_OPTIONS}
            value={filters.isCustom === true ? 'custom' : filters.isCustom === false ? 'normal' : ''}
            onChange={(value) => applyFilters({ isCustom: value ? value === 'custom' : null })}
            clearable
          />
        </div>

        {status === 'failed' && !rows.length ? (
          <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-6 text-center text-sm text-error">
            {error || 'Could not load orders.'}{' '}
            <button type="button" onClick={() => load(filters)} className="font-medium underline">Try again</button>
          </div>
        ) : loading && !rows.length ? (
          <OrderTableSkeleton />
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="font-display text-2xl font-semibold text-text">{filtered ? 'No orders match' : 'No orders yet'}</p>
            <p className="mt-1 text-sm text-muted">
              {filtered ? 'Try a different search or clear the filters.' : 'New orders from your store will show up here.'}
            </p>
            {filtered && (
              <ActionButton variant="secondary" onClick={() => { setFilters(EMPTY); load(EMPTY); }} className="mt-5">Clear filters</ActionButton>
            )}
          </div>
        ) : (
          <>
            <OrderTable orders={visibleOrders} onView={openOrder} trackerDetails={trackerDetails} />
            {searching && orders.length > visibleOrders.length && (
              <div className="flex justify-center">
                <ActionButton variant="secondary" onClick={() => setVisibleSearch((count) => count + PAGE)}>
                  Show more ({orders.length - visibleOrders.length} left)
                </ActionButton>
              </div>
            )}
            {hasMore && (
              <div className="flex justify-center">
                <ActionButton variant="secondary" loading={loading} onClick={() => load(filters, true)}>Load more</ActionButton>
              </div>
            )}
          </>
        )}
      </TabPanel>
      </>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-xl font-semibold text-text">Confirmed orders</h2>
            <p className="mt-1 text-sm text-muted">Confirmation records for normal and customized orders.</p>
          </div>
          {confirmedStatus === 'failed' ? (
            <p role="alert" className="p-5 text-sm text-error">{confirmedError || 'Could not load confirmed orders.'}</p>
          ) : confirmedStatus === 'loading' ? (
            <p role="status" className="p-5 text-sm text-muted">Loading confirmed orders…</p>
          ) : confirmedOrders.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">No confirmed orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-surface-alt text-xs text-muted">
                  <tr><th className="px-4 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Contact</th><th className="px-4 py-3 font-medium">Confirmed</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {confirmedOrders.map((confirmation) => {
                    const matchingOrder = rows.find((row) => row.$id === confirmation.orderId);
                    return (
                      <tr key={confirmation.$id}>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => matchingOrder && openOrder(matchingOrder)} disabled={!matchingOrder} className="font-semibold text-text hover:text-accent disabled:cursor-default">
                            {confirmation.orderNumber || 'Order'}
                          </button>
                          {confirmation.isCustom && <span className="ml-2 rounded-full bg-accent-tone-6/10 px-2 py-0.5 text-xs font-medium text-accent-tone-6">Custom</span>}
                        </td>
                        <td className="px-4 py-3 text-text">{matchingOrder?.customerName || '—'}</td>
                        <td className="px-4 py-3 tabular-nums text-text">{`Rs ${Number(confirmation.total || 0).toLocaleString('en-PK')}`}</td>
                        <td className="px-4 py-3 capitalize text-muted">{confirmation.contactMethod || '—'}</td>
                        <td className="px-4 py-3 text-muted">{confirmation.confirmedAt ? new Date(confirmation.confirmedAt).toLocaleString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <OrderAnalytics
        orders={analyticsOrders}
        status={analyticsStatus}
        error={analyticsError}
        onRetry={() => dispatch(fetchStaffOrderAnalytics())}
      />

      {formKey > 0 && (
        <OrderForm key={formKey} open={formOpen} orderId={selectedId} onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
}