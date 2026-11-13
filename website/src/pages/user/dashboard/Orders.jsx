// src/pages/user/dashboard/Orders.jsx   (route: /:username/orders)
// Same look as Profile.jsx: gradient hero, StatTile cards, rounded-xl bordered surfaces,
// graph-colour accents, Notice banner, Refresh button with "Updated x ago".
import PanelPageTitle from '../../../ui/custom/PanelPageTitle';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  Undo2,
  X,
  XCircle,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  fetchMyOrders,
  updateOrderItemQuantity,
  updateOrderDetails,
  cancelMyOrder,
  clearLastPlacedOrder,
  clearOrderUpdateError,
  canEditOrder,
  parseOrderItems,
  orderItemKey,
  selectMyOrders,
  selectMyOrdersStatus,
  selectMyOrdersError,
  selectOrderUpdating,
  selectOrderUpdateError,
  selectLastPlacedOrder,
  selectLastPlacedKind,
} from '../../../store/slices/ordersSlice';
import { getProductImageUrl } from '../../../store/slices/productsSlice';
import { PATHS } from '../../../router/path';

import ActionButton from '../../../ui/custom/button/ActionButton';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';
import useEntered from '../../../ui/custom/motion/useEntered';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import HeatmapCalendar from '../../../ui/graphs/HeatmapCalendar';
import { capitalize, formatDateTime, formatMoney } from '../../../components/user/profile/profileMeta';
import { paidAmountForOrder } from '../../../lib/orderMath';
import AppIcon from '../../../ui/custom/AppIcon';

/* =====================================================================
   CONFIG
   ===================================================================== */

const PAGE_SIZE = 6;
const FETCH_SIZE = 100;
const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

// One colour per real status (graph palette, so it follows light/dark).
const STATUS = {
  pending:    { label: 'Received',       color: 'var(--accent-tone-3)', icon: Clock,        note: 'We have your order and will confirm it soon.' },
  confirmed:  { label: 'Confirmed',      color: 'var(--accent-tone-5)', icon: Check,        note: 'Your order is confirmed.' },
  processing: { label: 'Being prepared', color: 'var(--accent-tone-1)', icon: PackageCheck, note: 'We are getting your order ready.' },
  shipped:    { label: 'Shipped',        color: 'var(--accent-tone-6)', icon: Truck,        note: 'Your order is on its way. It can no longer be changed.' },
  delivered:  { label: 'Delivered',      color: 'var(--accent-tone-7)', icon: Check,        note: 'Your order was delivered.' },
  cancelled:  { label: 'Cancelled',      color: 'var(--accent-tone-8)', icon: XCircle,      note: 'This order was cancelled.' },
  returned:   { label: 'Returned',       color: 'var(--accent-tone-4)', icon: Undo2,        note: 'This order was returned.' },
};
const FILTERS = ['all', ...Object.keys(STATUS)];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest total' },
  { value: 'lowest', label: 'Lowest total' },
];

/* =====================================================================
   THIN WRAPPERS around your custom components.
   If a prop name differs in your SearchInput / SelectInput / HeatmapCalendar,
   fix it HERE only. The rest of the page does not touch them.
   ===================================================================== */

// SearchInput commits through onSearch (debounced, Enter, or clear).
function SearchBox({ value, onSearch }) {
  return (
    <SearchInput
      value={value}
      onSearch={onSearch}
      size="sm"
      label="Search orders"
      placeholder="Search order number, product or city"
    />
  );
}

// No visible label (it made this row taller than the search box). aria-label keeps it accessible.
function SortSelect({ value, onChange }) {
  return <SelectInput value={value} onChange={onChange} options={SORTS} size="sm" aria-label="Sort orders" />;
}

// data: [{ date: 'YYYY-MM-DD', value: number }]
function OrdersHeatmap({ data }) {
  return <HeatmapCalendar data={data} label="orders" />;
}

/* =====================================================================
   HELPERS
   ===================================================================== */

const dayKey = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

const searchText = (order) =>
  [
    order.orderNumber,
    order.city,
    order.trackingId,
    ...parseOrderItems(order).map((i) => i.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/* =====================================================================
   SMALL PIECES (same look as Profile)
   ===================================================================== */

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

function StatTile({ icon: Icon, appIcon, label, color, tone, sensitive = false, children }) {
  const [hidden, setHidden] = useState(false);
  return (
    <div
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--tile)]"
      style={{ '--tile': color }}
    >
      {appIcon ? (
        <AppIcon name={appIcon} tone={tone} className="size-11 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <span
          className="grid size-11 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <Icon size={20} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted">{label}</p>
          {sensitive && (
            <button
              type="button"
              onClick={() => setHidden((current) => !current)}
              aria-label={`${hidden ? 'Show' : 'Hide'} ${label}`}
              aria-pressed={hidden}
              title={`${hidden ? 'Show' : 'Hide'} amount`}
              className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          )}
        </div>
        <p className="truncate font-display text-xl font-semibold text-text">{hidden ? '••••••' : children}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const meta = STATUS[status] || { label: capitalize(status), color: 'var(--accent-tone-8)', icon: Clock };
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
    >
      <Icon size={13} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

// pending -> confirmed -> processing -> shipped -> delivered
function Stepper({ status }) {
  const entered = useEntered();
  const index = STEPS.indexOf(status);
  if (index === -1) return null;
  const pct = (index / (STEPS.length - 1)) * 100;
  return (
    <div className="px-1 pb-1 pt-2">
      <div className="relative">
        <div className="absolute left-0 right-0 top-[7px] h-1 rounded-full bg-surface-alt" />
        <div
          className="absolute left-0 top-[7px] h-1 rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: entered ? `${pct}%` : '0%', background: 'linear-gradient(90deg, var(--accent-tone-1), var(--accent-tone-7))' }}
        />
        <ol className="relative flex justify-between">
          {STEPS.map((step, i) => {
            const done = i <= index;
            return (
              <li key={step} className="flex flex-col items-center gap-1.5">
                <span
                  className="size-4 rounded-full border-2 transition-colors duration-500"
                  style={{
                    borderColor: done ? 'var(--accent-tone-1)' : 'var(--border)',
                    background: done ? 'var(--accent-tone-1)' : 'var(--surface)',
                  }}
                />
                <span className={`hidden text-[11px] sm:block ${done ? 'font-medium text-text' : 'text-muted'}`}>
                  {STATUS[step].label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Line({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className={strong ? 'font-semibold text-text' : 'text-muted'}>{label}</dt>
      <dd className={`tabular-nums text-text ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-medium text-muted">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

/* =====================================================================
   ONE ORDER
   ===================================================================== */

function OrderCard({ order, busy, username, index }) {
  const dispatch = useAppDispatch();
  const entered = useEntered();
  const items = useMemo(() => parseOrderItems(order), [order]);
  const editable = canEditOrder(order);
  const meta = STATUS[order.status] || STATUS.pending;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const startEdit = () => {
    setDraft({
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      city: order.city || '',
      address: order.address || '',
      notes: order.notes || '',
    });
    setEditing(true);
    setOpen(true);
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    const res = await dispatch(updateOrderDetails({ orderId: order.$id, data: draft, toast: true }));
    if (updateOrderDetails.fulfilled.match(res)) setEditing(false);
  };

  const setQty = (item, quantity) =>
    dispatch(updateOrderItemQuantity({ orderId: order.$id, itemKey: orderItemKey(item), quantity, toast: true }));

  const confirmCancel = async () => {
    setCancelError('');
    const res = await dispatch(cancelMyOrder({ orderId: order.$id, toast: true }));
    if (cancelMyOrder.fulfilled.match(res)) setCancelOpen(false);
    else setCancelError(res.payload || 'Could not cancel this order.');
  };

  return (
    <li
      className={`overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-all duration-500 hover:border-[color:var(--tile)] motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{ '--tile': meta.color, transitionDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      {/* header, click to expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:gap-4 sm:p-5"
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
        >
          <ShoppingBag size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-heading text-base font-semibold text-text">Order {order.orderNumber}</span>
          <span className="block truncate text-xs text-muted">
            {formatDateTime(order.$createdAt)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill status={order.status} />
          <span className="font-display text-lg font-semibold tabular-nums text-text">{formatMoney(order.total)}</span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* thumbnails when collapsed */}
      {!open && items.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-4 sm:px-5">
          {items.slice(0, 5).map((item) => {
            const img = getProductImageUrl(item.fileId);
            return (
              <span key={orderItemKey(item)} className="size-10 overflow-hidden rounded-md border border-border bg-surface-alt">
                {img && <img src={img} alt="" loading="lazy" className="size-full object-cover" />}
              </span>
            );
          })}
          {items.length > 5 && <span className="text-xs text-muted">+{items.length - 5} more</span>}
        </div>
      )}

      {open && (
        <div className="space-y-5 border-t border-border p-4 sm:p-5">
          <Stepper status={order.status} />
          <p className="text-sm text-muted">{meta.note}</p>
          {order.trackingId && (
            <p className="text-sm text-text">
              Tracking number: <span className="font-semibold">{order.trackingId}</span>
            </p>
          )}

          {/* items */}
          <ul className="divide-y divide-border rounded-xl border border-border">
            {items.map((item) => {
              const img = getProductImageUrl(item.fileId);
              return (
                <li key={orderItemKey(item)} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                  <span className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-surface-alt">
                    {img && <img src={img} alt="" loading="lazy" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text">{item.name}</span>
                    <span className="text-xs text-muted">
                      {formatMoney(item.price)} each{item.variant ? ` · ${item.variant}` : ''}
                    </span>
                  </span>

                  {editable ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="flex items-center overflow-hidden rounded-lg border border-border" role="group" aria-label={`Quantity of ${item.name}`}>
                        <button
                          type="button"
                          onClick={() => setQty(item, item.quantity - 1)}
                          disabled={busy || item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="grid size-8 place-items-center text-text transition-colors hover:bg-surface-alt disabled:opacity-40"
                        >
                          <Minus size={14} aria-hidden="true" />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums text-text">{item.quantity}</span>
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQty(item, 0)}
                          disabled={busy}
                          aria-label={`Remove ${item.name}`}
                          className="grid size-8 place-items-center rounded-lg text-error transition-colors hover:bg-error/10 disabled:opacity-40"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm tabular-nums text-muted">× {item.quantity}</span>
                  )}

                  <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-text">
                    {formatMoney(item.price * item.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* money */}
          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <Line label="Subtotal" value={formatMoney(order.subtotal)} />
            <Line label="Delivery" value={Number(order.deliveryCharges) ? formatMoney(order.deliveryCharges) : 'Free'} />
            {Number(order.discount) > 0 && <Line label="Discount" value={`− ${formatMoney(order.discount)}`} />}
            <Line label="Total" value={formatMoney(order.total)} strong />
            <Line label="To pay on delivery" value={formatMoney(order.codAmount)} />
          </dl>

          {/* delivery details */}
          {editing ? (
            <form onSubmit={saveDetails} className="space-y-3 rounded-xl border border-border bg-surface-alt p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input value={draft.customerName} maxLength={128} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <input value={draft.customerPhone} maxLength={20} onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <input type="email" value={draft.customerEmail} onChange={(e) => setDraft({ ...draft, customerEmail: e.target.value })} />
                </Field>
                <Field label="City">
                  <input value={draft.city} maxLength={100} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                </Field>
              </div>
              <Field label="Address">
                <textarea rows={2} value={draft.address} maxLength={500} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </Field>
              <Field label="Notes">
                <textarea rows={2} value={draft.notes} maxLength={1000} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <ActionButton type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </ActionButton>
                <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Phone size={15} style={{ color: 'var(--accent-tone-3)' }} aria-hidden="true" />
                  Contact
                </div>
                <p className="mt-2 text-sm font-medium text-text">{order.customerName}</p>
                <p className="break-words text-sm text-muted">
                  {order.customerPhone}
                  {order.customerEmail ? ` · ${order.customerEmail}` : ''}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <MapPin size={15} style={{ color: 'var(--accent-tone-7)' }} aria-hidden="true" />
                  Delivery address
                </div>
                <p className="mt-2 break-words text-sm font-medium text-text">
                  {order.address}, {order.city}
                </p>
                {order.notes && <p className="mt-1 text-sm italic text-muted">Note: {order.notes}</p>}
              </div>
            </div>
          )}

          {/* actions: only until the order ships */}
          {editable && !editing && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={startEdit}
                disabled={busy}
                className="btn btn-ghost !min-h-10 gap-2 !px-4 !py-2 text-sm disabled:opacity-50"
              >
                <Pencil size={15} aria-hidden="true" />
                Change delivery details
              </button>
              <Link to={PATHS.products} className="btn btn-ghost !min-h-10 !px-4 !py-2 text-sm">
                Add more products
              </Link>
              <button
                type="button"
                onClick={() => { setCancelError(''); setCancelOpen(true); }}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-error/40 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
              >
                <XCircle size={15} aria-hidden="true" />
                Cancel order
              </button>
              <p className="w-full text-xs text-muted">
                You can change or cancel this order until it ships. To add products, put them in your cart and choose
                “Add to order” at <Link to={PATHS.user.checkout(username)} className="underline">checkout</Link>.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={cancelOpen}
        danger
        busy={busy}
        error={cancelError}
        title={`Cancel order ${order.orderNumber}?`}
        message="This cannot be undone. If you still want these items, you will need to place a new order."
        confirmLabel="Yes, cancel order"
        onConfirm={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </li>
  );
}

/* =====================================================================
   PAGE
   ===================================================================== */

export default function Orders() {
  const dispatch = useAppDispatch();
  const { username } = useParams();
  const entered = useEntered();

  const orders = useAppSelector(selectMyOrders);
  const status = useAppSelector(selectMyOrdersStatus);
  const error = useAppSelector(selectMyOrdersError);
  const updating = useAppSelector(selectOrderUpdating);
  const updateError = useAppSelector(selectOrderUpdateError);
  const placed = useAppSelector(selectLastPlacedOrder);
  const placedKind = useAppSelector(selectLastPlacedKind);

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  // The stats and the heatmap need every order, so load all pages (100 at a time).
  const loadAll = useCallback(async () => {
    let offset = 0;
    for (let guard = 0; guard < 50; guard++) {
      const res = await dispatch(fetchMyOrders({ limit: FETCH_SIZE, offset }));
      if (!fetchMyOrders.fulfilled.match(res)) return false;
      const { rows, total: all } = res.payload;
      offset += rows.length;
      if (!rows.length || offset >= all) break;
    }
    setUpdatedAt(new Date());
    return true;
  }, [dispatch]);

  useEffect(() => {
    loadAll();
    return () => {
      dispatch(clearOrderUpdateError());
    };
  }, [dispatch, loadAll]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  // Back to the first page whenever the filters change.
  useEffect(() => setVisible(PAGE_SIZE), [filter, query, sort]);

  /* ----- numbers for tiles, chips and heatmap ----- */
  const stats = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(STATUS).map((s) => [s, 0]));
    let spent = 0;
    const days = new Map();
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status] += 1;
      spent += paidAmountForOrder(o);
      const key = dayKey(o.$createdAt);
      if (key) days.set(key, (days.get(key) || 0) + 1);
    });
    return {
      counts,
      spent,
      open: counts.pending + counts.confirmed + counts.processing,
      heat: [...days.entries()].map(([date, value]) => ({ date, value })),
    };
  }, [orders]);

  /* ----- filter + search + sort ----- */
  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = orders.filter((o) => (filter === 'all' || o.status === filter) && (!term || searchText(o).includes(term)));
    const by = {
      newest: (a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || ''),
      oldest: (a, b) => (a.$createdAt || '').localeCompare(b.$createdAt || ''),
      highest: (a, b) => (Number(b.total) || 0) - (Number(a.total) || 0),
      lowest: (a, b) => (Number(a.total) || 0) - (Number(b.total) || 0),
    }[sort];
    return [...rows].sort(by);
  }, [orders, filter, query, sort]);

  const phrases = useMemo(
    () => [
      'Your orders',
      stats.open ? `${stats.open} ${stats.open === 1 ? 'order' : 'orders'} on the way` : 'Nothing waiting on you',
      `${orders.length} placed so far`,
    ],
    [stats.open, orders.length]
  );

  const loadingFirst = status === 'idle' || (status === 'loading' && orders.length === 0 && !refreshing);
  const busy = refreshing || updating;

  if (loadingFirst) {
    return (
      <div role="status" className="flex items-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        Loading your orders…
      </div>
    );
  }

  if (status === 'failed' && orders.length === 0) {
    return (
      <div role="alert" className="space-y-4">
        <p className="text-error">{error || 'Could not load your orders.'}</p>
        <ActionButton type="button" onClick={refresh}>Try again</ActionButton>
      </div>
    );
  }

  return (
    <div
      className={`space-y-5 transition-all duration-500 motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <PanelPageTitle icon="list" className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Orders</PanelPageTitle>
          <p className="mt-1 hidden text-sm text-muted lg:block">Track, change or cancel your orders until they ship.</p>
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
            title="Fetch your latest orders from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {placed && (
        <Notice
          type="ok"
          text={
            placedKind === 'added'
              ? `Your items were added to order ${placed.orderNumber}. The new total is ${formatMoney(placed.total)}.`
              : `Thank you. Order ${placed.orderNumber} is placed. You can change it until it ships.`
          }
          onDismiss={() => dispatch(clearLastPlacedOrder())}
        />
      )}
      {updateError && <Notice type="error" text={updateError} onDismiss={() => dispatch(clearOrderUpdateError())} />}

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex flex-col items-center gap-4 overflow-hidden rounded-2xl p-5 text-center text-white sm:flex-row sm:gap-6 sm:p-7 sm:text-left"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-white/60 transition-transform duration-500 group-hover:scale-x-100" />

        <div className="relative grid size-20 shrink-0 place-items-center rounded-full border-2 border-white/40 bg-white/15">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full border-2 border-white/70" />
          <ShoppingBag size={34} aria-hidden="true" />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Order history</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-2xl sm:text-3xl">
            <Typewriter phrases={phrases} icon="list" tone={3} />
          </span>
        </div>
        <Link
          to={PATHS.products}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 hover:scale-105 hover:text-[color:var(--brown)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ShoppingBag size={16} aria-hidden="true" />
          Shop more
        </Link>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile appIcon="list" label="Orders placed" color="var(--accent-tone-1)" tone={1}>
          <CountUp value={orders.length} />
        </StatTile>
        <StatTile appIcon="clock" label="Still changeable" color="var(--accent-tone-3)" tone={3}>
          <CountUp value={stats.open} />
        </StatTile>
        <StatTile appIcon="truck" label="Delivered" color="var(--accent-tone-7)" tone={7}>
          <CountUp value={stats.counts.delivered} />
        </StatTile>
        <StatTile appIcon="wallet" label="Total spent" color="var(--accent-tone-2)" tone={2} sensitive>
          {formatMoney(stats.spent)}
        </StatTile>
      </div>

      {/* Heatmap */}
      {orders.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="heading-sm">Order activity</h2>
            <span className="text-xs text-muted">Orders per day</span>
          </div>
          <OrdersHeatmap data={stats.heat} />
        </section>
      )}

      {/* Search + sort */}
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_14rem]">
        <SearchBox value={query} onSearch={setQuery} />
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {/* Status filter */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter orders by status">
        {FILTERS.map((key) => {
          const isAll = key === 'all';
          const color = isAll ? 'var(--accent)' : STATUS[key].color;
          const count = isAll ? orders.length : stats.counts[key];
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-px active:scale-95"
              style={{
                borderColor: active ? color : 'var(--border)',
                background: active ? `color-mix(in srgb, ${color} 14%, transparent)` : 'var(--surface)',
                color: active ? color : 'var(--text-muted)',
              }}
            >
              {isAll ? 'All' : STATUS[key].label}
              <span
                className="rounded-full px-1.5 text-xs tabular-nums"
                style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
            <ShoppingBag size={26} aria-hidden="true" />
          </span>
          <p className="mt-4 font-heading text-lg font-semibold text-text">No orders yet</p>
          <p className="mt-1 text-sm text-muted">When you place an order it will show up here.</p>
          <Link to={PATHS.products} className="btn btn-primary mt-6 hover:text-on-brown">Browse products</Link>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <Search size={26} className="mx-auto text-muted" aria-hidden="true" />
          <p className="mt-3 font-medium text-text">No orders match</p>
          <p className="mt-1 text-sm text-muted">Try another status or a different search.</p>
          <button
            type="button"
            onClick={() => { setFilter('all'); setQuery(''); }}
            className="btn btn-ghost mt-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {list.slice(0, visible).map((o, i) => (
              <OrderCard key={o.$id} order={o} busy={busy} username={username} index={i} />
            ))}
          </ul>
          {list.length > visible && (
            <div className="flex justify-center">
              <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn btn-ghost">
                Show more ({list.length - visible} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}