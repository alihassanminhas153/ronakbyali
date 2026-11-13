// src/pages/user/dashboard/Cart.jsx   (route: /:username/cart)
// Same look as Profile.jsx / Orders.jsx. Uses the existing cartSlice unchanged.
import PanelPageTitle from '../../../ui/custom/PanelPageTitle';
import AppIcon from '../../../ui/custom/AppIcon';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CircleDollarSign,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  fetchCart,
  setCartQuantity,
  removeFromCart,
  clearCart,
  selectCartLines,
  selectCartCount,
  selectCartSubtotal,
  selectCartDeliveryCharges,
  selectCartTotal,
  selectCartStatus,
  selectCartUpdating,
  selectCartError,
} from '../../../store/slices/cartSlice';
import { getMainImageUrl } from '../../../store/slices/productsSlice';
import { PATHS } from '../../../router/path';

import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';
import useEntered from '../../../ui/custom/motion/useEntered';
import { formatMoney } from '../../../components/user/profile/profileMeta';

/* ---------- helpers ---------- */

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

// Stock state of one cart line.
function stockOf(line) {
  const p = line.product;
  const remaining = p.remaining == null ? null : Number(p.remaining);
  const out = p.status === 'outOfStock' || (remaining != null && remaining <= 0);
  const over = !out && remaining != null && Number(line.quantity) > remaining;
  return { remaining, out, over };
}

const lineKey = (l) => `${l.productId}:${l.variant ?? ''}`;

/* ---------- small pieces (same look as Profile) ---------- */

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
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-full p-1 transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, color, children }) {
  return (
    <div className="group flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--tile)]" style={{ '--tile': color }}>
      <p className="min-w-0 truncate text-xs text-muted">{label}</p>
      <div className="flex min-w-0 items-end gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110 sm:size-11" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <p className="min-w-0 truncate font-display text-xl font-semibold text-text">{children}</p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={strong ? 'font-semibold text-text' : 'text-muted'}>{label}</dt>
      <dd className={`tabular-nums text-text ${strong ? 'font-display text-xl font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}

/* ---------- one cart line ---------- */

function CartLine({ line, busy, onQty, onRemove, index }) {
  const entered = useEntered();
  const p = line.product;
  const qty = Number(line.quantity) || 0;
  const { remaining, out, over } = stockOf(line);
  const max = remaining != null ? Math.max(1, remaining) : 99;
  const img = getMainImageUrl(p);
  const href = PATHS.product(p.category, p.group, p.slug);
  const problem = out || over;
  const color = problem ? 'var(--error)' : 'var(--accent-tone-1)';

  return (
    <li
      className={`flex gap-4 rounded-xl border bg-surface p-3 shadow-soft transition-all duration-500 hover:border-[color:var(--tile)] motion-reduce:transition-none sm:p-4 ${
        problem ? 'border-error/50' : 'border-border'
      } ${entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
      style={{ '--tile': color, transitionDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <Link to={href} className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-alt sm:h-32 sm:w-28">
        {img && <img src={img} alt="" loading="lazy" className={`size-full object-cover ${out ? 'opacity-50' : ''}`} />}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link to={href} className="block truncate font-heading text-base font-semibold text-text hover:text-accent">
              {p.name}
            </Link>
            <p className="truncate text-xs text-muted">
              {[p.category, line.variant && `Option: ${line.variant}`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <p className="shrink-0 font-display text-lg font-semibold tabular-nums text-text">
            {formatMoney((Number(p.price) || 0) * qty)}
          </p>
        </div>

        <p className="mt-0.5 text-xs tabular-nums text-muted">{formatMoney(p.price)} each</p>

        {out && <p className="mt-1 text-xs font-medium text-error">Out of stock. Remove it to continue.</p>}
        {over && <p className="mt-1 text-xs font-medium text-warning">Only {remaining} available. Lower the quantity.</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="flex items-center overflow-hidden rounded-lg border border-border" role="group" aria-label={`Quantity of ${p.name}`}>
            <button
              type="button"
              onClick={() => onQty(qty - 1)}
              disabled={busy || qty <= 1}
              aria-label="Decrease quantity"
              className="grid size-9 place-items-center text-text transition-colors hover:bg-surface-alt active:scale-90 disabled:opacity-40"
            >
              <Minus size={15} aria-hidden="true" />
            </button>
            <span className="w-9 text-center text-sm tabular-nums text-text">{qty}</span>
            <button
              type="button"
              onClick={() => onQty(qty + 1)}
              disabled={busy || out || qty >= max}
              aria-label="Increase quantity"
              className="grid size-9 place-items-center text-text transition-colors hover:bg-surface-alt active:scale-90 disabled:opacity-40"
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-error transition-colors hover:bg-error/10 disabled:opacity-40"
          >
            <Trash2 size={15} aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

/* ---------- page ---------- */

export default function Cart() {
  const dispatch = useAppDispatch();
  const { username } = useParams();
  const entered = useEntered();

  const lines = useAppSelector(selectCartLines);
  const count = useAppSelector(selectCartCount);
  const subtotal = useAppSelector(selectCartSubtotal);
  const delivery = useAppSelector(selectCartDeliveryCharges);
  const total = useAppSelector(selectCartTotal);
  const status = useAppSelector(selectCartStatus);
  const updating = useAppSelector(selectCartUpdating);
  const error = useAppSelector(selectCartError);

  const [clearOpen, setClearOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [errorShown, setErrorShown] = useState(true);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const ago = useTimeAgo(updatedAt);

  // Refresh prices and stock whenever the page opens.
  useEffect(() => {
    dispatch(fetchCart()).then(() => setUpdatedAt(new Date()));
  }, [dispatch]);

  // A new error should show again even if an old one was dismissed.
  useEffect(() => setErrorShown(true), [error]);

  const refresh = async () => {
    setRefreshRequested(true);
    try {
      await dispatch(fetchCart());
      setUpdatedAt(new Date());
    } finally {
      setRefreshRequested(false);
    }
  };

  const setQty = (line, quantity) =>
    dispatch(setCartQuantity({ productId: line.productId, quantity, variant: line.variant ?? undefined }));
  const remove = (line) => dispatch(removeFromCart({ productId: line.productId, variant: line.variant ?? undefined }));

  const confirmClear = async () => {
    await dispatch(clearCart());
    setClearOpen(false);
  };

  const hasProblem = useMemo(
    () =>
      lines.some((l) => {
        const s = stockOf(l);
        return s.out || s.over;
      }),
    [lines]
  );

  const phrases = useMemo(
    () => ['Your cart', `${count} ${count === 1 ? 'item' : 'items'} ready`, `${formatMoney(total)} to pay`],
    [count, total]
  );

  const loadingFirst = status === 'idle' || (status === 'loading' && lines.length === 0 && !refreshRequested);
  const refreshing = refreshRequested || (status === 'loading' && lines.length > 0);
  const busy = updating || refreshing;

  if (loadingFirst) {
    return (
      <div role="status" className="flex items-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        Loading your cart…
      </div>
    );
  }

  if (status === 'failed' && lines.length === 0) {
    return (
      <div role="alert" className="space-y-4">
        <p className="text-error">{error || 'Could not load your cart.'}</p>
        <button type="button" onClick={refresh} className="btn btn-primary">Try again</button>
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
          <PanelPageTitle icon="cart" className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Cart</PanelPageTitle>
          <p className="mt-1 hidden text-sm text-muted lg:block">Review your items, then check out.</p>
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
            title="Fetch the latest prices and stock"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error && errorShown && <Notice type="error" text={error} onDismiss={() => setErrorShown(false)} />}

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
          <AppIcon name="cart" entity="cart" hueRotate={false} className="size-14 object-contain sm:size-16" />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Shopping cart</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-2xl sm:text-3xl">
            <Typewriter phrases={phrases} />
          </span>
        </div>
        {lines.length > 0 ? (
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={busy}
            className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:bg-white/25 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          >
            <Trash2 size={16} aria-hidden="true" />
            Clear cart
          </button>
        ): (
          <Link
            to={PATHS.products}
            className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 hover:scale-105 hover:text-[color:var(--brown)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            Browse products
          </Link>
        )}
      </section>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
            <ShoppingBag size={26} aria-hidden="true" />
          </span>
          <p className="mt-4 font-heading text-lg font-semibold text-text">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted">Add something you like and it will wait for you here.</p>
          <Link to={PATHS.products} className="btn btn-primary mt-6 hover:text-on-brown">Browse products</Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={ShoppingBag} label="Items" color="var(--accent-tone-1)">
              <CountUp value={count} />
            </StatTile>
            <StatTile icon={Wallet} label="Subtotal" color="var(--accent-tone-2)">
              {formatMoney(subtotal)}
            </StatTile>
            <StatTile icon={Truck} label="Delivery" color="var(--accent-tone-3)">
              {delivery === 0 ? 'Free' : formatMoney(delivery)}
            </StatTile>
            <StatTile icon={CircleDollarSign} label="Total" color="var(--accent-tone-7)">
              {formatMoney(total)}
            </StatTile>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <ul className={`space-y-3 transition-opacity ${updating ? 'opacity-70' : ''}`} aria-busy={updating}>
              {lines.map((line, i) => (
                <CartLine
                  key={lineKey(line)}
                  line={line}
                  index={i}
                  busy={busy}
                  onQty={(q) => setQty(line, q)}
                  onRemove={() => remove(line)}
                />
              ))}
            </ul>

            <aside className="rounded-xl border border-border bg-surface p-5 shadow-soft lg:sticky lg:top-6">
              <h2 className="heading-sm">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label={`Subtotal (${count})`} value={formatMoney(subtotal)} />
                <Row label="Delivery" value={delivery === 0 ? 'Free' : formatMoney(delivery)} />
                <div className="border-t border-border pt-3">
                  <Row label="Total" value={formatMoney(total)} strong />
                </div>
              </dl>

              {hasProblem && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Some items are unavailable or over stock. Fix the highlighted items to continue.
                </p>
              )}

              {hasProblem || busy ? (
                <button type="button" disabled className="btn btn-primary mt-5 w-full opacity-50">
                  Checkout
                </button>
              ) : (
                <Link
                  to={PATHS.user.checkout(username)}
                  className="btn btn-primary group mt-5 w-full gap-2 hover:text-on-brown"
                >
                  Checkout
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              )}
              <Link to={PATHS.products} className="mt-3 block text-center text-sm text-muted hover:text-accent">
                Continue shopping
              </Link>
            </aside>
          </div>
        </>
      )}

      <ConfirmDialog
        open={clearOpen}
        danger
        busy={updating}
        title="Clear your cart?"
        message="Every item will be removed from your cart."
        confirmLabel="Clear cart"
        onConfirm={confirmClear}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  );
}