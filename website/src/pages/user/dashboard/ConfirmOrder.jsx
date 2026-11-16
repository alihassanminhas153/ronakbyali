import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
} from 'lucide-react';

import PageHeader from '../../../ui/custom/PageHeader';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import EmptyState from '../../../ui/art/EmptyState';
import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  fetchMyOrders,
  selectMyOrders,
  selectMyOrdersError,
  selectMyOrdersStatus,
  selectMyOrdersTotal,
} from '../../../store/slices/ordersSlice';
import orderConfirmService from '../../../lib/appwrite/orderConfirm';
import orderService from '../../../lib/appwrite/order';
import { formatDateTime, formatMoney } from '../../../components/user/profile/profileMeta';

const PAGE_SIZE = 100;

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All order types' },
  { value: 'standard', label: 'Standard orders' },
  { value: 'custom', label: 'Custom orders' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest total' },
  { value: 'lowest', label: 'Lowest total' },
];

function isWithinPeriod(order, period) {
  if (period === 'all') return true;
  const createdAt = new Date(order.$createdAt || '');
  if (Number.isNaN(createdAt.getTime())) return false;

  const now = new Date();
  if (period === 'today') {
    return createdAt.getFullYear() === now.getFullYear()
      && createdAt.getMonth() === now.getMonth()
      && createdAt.getDate() === now.getDate();
  }

  const start = new Date(now);
  start.setDate(start.getDate() - Number(period));
  return createdAt >= start && createdAt <= now;
}

function orderSearchText(order) {
  const items = orderService.parseItems(order);
  return [
    order.$id,
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.city,
    order.address,
    ...items.map((item) => item.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function OrderCard({ order, busy, onConfirm }) {
  const items = orderService.parseItems(order);
  const quantity = items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-lg font-semibold text-text">
                Order {order.orderNumber || order.$id}
              </h2>
              {order.isCustom && (
                <span className="rounded-full bg-accent-tone-6/10 px-2.5 py-1 text-xs font-medium text-accent-tone-6">
                  Custom order
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays size={14} aria-hidden="true" />
              {formatDateTime(order.$createdAt)} · {quantity} {quantity === 1 ? 'item' : 'items'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tone-3/10 px-3 py-1.5 text-xs font-semibold text-accent-tone-3">
            <Clock size={14} aria-hidden="true" />
            Awaiting confirmation
          </span>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.length > 0 ? items.map((item, index) => {
            const count = Number(item.quantity) || 0;
            return (
              <li key={`${item.productId || item.name || 'item'}-${index}`} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm">
                <span className="min-w-0 text-text">
                  {item.name || 'Product'} <span className="text-muted">× {count}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-text">
                  Rs {formatMoney((Number(item.price) || 0) * count)}
                </span>
              </li>
            );
          }) : (
            <li className="px-3 py-2.5 text-sm text-muted">No item details available.</li>
          )}
          <li className="flex justify-between gap-4 px-3 py-3 text-sm font-semibold">
            <span className="text-text">Order total</span>
            <span className="tabular-nums text-text">Rs {formatMoney(order.total)}</span>
          </li>
        </ul>

        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p className="flex min-w-0 items-start gap-2">
            <UserRound size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{order.customerName || 'Name not provided'}</span>
          </p>
          <p className="flex min-w-0 items-start gap-2">
            <Phone size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{order.customerPhone || 'Phone not provided'}</span>
          </p>
          <p className="flex min-w-0 items-start gap-2 sm:col-span-2">
            <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{[order.address, order.city].filter(Boolean).join(', ') || 'Address not provided'}</span>
          </p>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={() => onConfirm(order)}
            disabled={busy}
            className="btn btn-primary min-w-40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <BadgeCheck size={16} aria-hidden="true" />}
            {busy ? 'Confirming…' : 'Confirm order'}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function ConfirmOrder() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectMyOrders);
  const total = useAppSelector(selectMyOrdersTotal);
  const status = useAppSelector(selectMyOrdersStatus);
  const error = useAppSelector(selectMyOrdersError);
  const [params] = useSearchParams();
  const linkedOrderId = params.get('orderId') || '';

  const [query, setQuery] = useState(linkedOrderId);
  const [period, setPeriod] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [confirmingId, setConfirmingId] = useState('');
  const [confirmedIds, setConfirmedIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const fetchPage = useCallback(async (offset = 0) => {
    const result = await dispatch(fetchMyOrders({ limit: PAGE_SIZE, offset }));
    if (fetchMyOrders.fulfilled.match(result)) {
      setLoadedCount((current) => (
        offset === 0
          ? Math.max(current, result.payload.rows.length)
          : offset + result.payload.rows.length
      ));
    }
    return result;
  }, [dispatch]);

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  useEffect(() => {
    if (linkedOrderId) setQuery(linkedOrderId);
  }, [linkedOrderId]);

  const confirmableOrders = useMemo(
    () => orders.filter((order) => order.status === 'processing' && !order.isConfirmed && !confirmedIds.has(order.$id)),
    [orders, confirmedIds]
  );

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = confirmableOrders.filter((order) => (
      (!term || orderSearchText(order).includes(term))
      && isWithinPeriod(order, period)
      && (type === 'all' || (type === 'custom' ? Boolean(order.isCustom) : !order.isCustom))
    ));

    const comparators = {
      newest: (a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || ''),
      oldest: (a, b) => (a.$createdAt || '').localeCompare(b.$createdAt || ''),
      highest: (a, b) => (Number(b.total) || 0) - (Number(a.total) || 0),
      lowest: (a, b) => (Number(a.total) || 0) - (Number(b.total) || 0),
    };
    return [...filtered].sort(comparators[sort]);
  }, [confirmableOrders, query, period, type, sort]);

  const hasFilters = Boolean(query.trim()) || period !== 'all' || type !== 'all';
  const loadingFirst = status === 'idle' || (status === 'loading' && orders.length === 0);
  const busy = refreshing || Boolean(confirmingId);

  const refresh = async () => {
    setRefreshing(true);
    await fetchPage(0);
    setRefreshing(false);
  };

  const confirmOrder = async (order) => {
    if (confirmingId || order.status !== 'processing' || order.isConfirmed) return;
    setConfirmingId(order.$id);
    setNotice(null);
    try {
      const result = await orderConfirmService.confirm({ orderId: order.$id });
      if (!result?.ok) {
        setNotice({ ok: false, text: result?.message || 'Could not confirm this order.' });
        return;
      }

      setConfirmedIds((current) => new Set(current).add(order.$id));
      setNotice({ ok: true, text: `Order ${order.orderNumber || ''} confirmed successfully.`.trim() });
      await fetchPage(0);
    } catch (confirmError) {
      setNotice({ ok: false, text: confirmError?.message || 'Could not confirm this order.' });
    } finally {
      setConfirmingId('');
    }
  };

  const clearFilters = () => {
    setQuery('');
    setPeriod('all');
    setType('all');
    setSort('newest');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        art="orderSuccess"
        title="Confirm orders"
        subtitle={`${confirmableOrders.length} ${confirmableOrders.length === 1 ? 'order is' : 'orders are'} waiting for your confirmation.`}
        actions={(
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            title="Refresh your orders"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-text shadow-soft transition-colors hover:bg-surface-alt disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        )}
      />

      {notice && (
        <p role={notice.ok ? 'status' : 'alert'} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${notice.ok ? 'border-success/40 bg-success/10 text-success' : 'border-error/40 bg-error/10 text-error'}`}>
          {notice.ok && <Check size={16} aria-hidden="true" />}
          {notice.text}
        </p>
      )}

      <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
        <SearchInput
          value={query}
          onSearch={setQuery}
          size="sm"
          label="Search orders to confirm"
          placeholder="Search order number, product, name or address"
          className="sm:col-span-2 xl:col-span-1"
        />
        <SelectInput
          value={period}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
          size="sm"
          aria-label="Filter by order date"
        />
        <SelectInput
          value={type}
          onChange={setType}
          options={TYPE_OPTIONS}
          size="sm"
          aria-label="Filter by order type"
        />
        <SelectInput
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
          size="sm"
          aria-label="Sort orders"
        />
      </div>

      {loadingFirst ? (
        <div role="status" className="flex items-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          Loading orders to confirm…
        </div>
      ) : status === 'failed' && orders.length === 0 ? (
        <div role="alert" className="space-y-4">
          <p className="text-error">{error || 'Could not load orders to confirm.'}</p>
          <button type="button" onClick={refresh} className="btn btn-ghost">Try again</button>
        </div>
      ) : filteredOrders.length === 0 ? (
        hasFilters ? (
          <EmptyState
            art="noResults"
            title="No matching orders"
            message="No orders waiting for confirmation match these filters."
            action={<button type="button" onClick={clearFilters} className="btn btn-ghost">Clear filters</button>}
          />
        ) : (
          <EmptyState
            art="orders"
            title="No orders to confirm"
            message="Orders that need your confirmation will appear here."
          />
        )
      ) : (
        <ul className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.$id}
              order={order}
              busy={Boolean(confirmingId)}
              onConfirm={confirmOrder}
            />
          ))}
        </ul>
      )}

      {loadedCount < total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchPage(loadedCount)}
            disabled={status === 'loading'}
            className="btn btn-ghost"
          >
            {status === 'loading' ? 'Loading…' : `Load more orders (${total - loadedCount} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
