// src/pages/user/dashboard/Wishlist.jsx   (route: /:username/wishlist)
// Same look as Profile.jsx / Orders.jsx. Uses the existing wishlistSlice and cartSlice unchanged.
import PanelPageTitle from '../../../ui/custom/PanelPageTitle';
import AppIcon from '../../../ui/custom/AppIcon';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
  Check,
  Heart,
  Layers,
  Loader2,
  PackageX,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  fetchWishlist,
  toggleWishlist,
  clearWishlist,
  selectWishlistIds,
  selectWishlistProducts,
  selectWishlistStatus,
  selectWishlistError,
} from '../../../store/slices/wishlistSlice';
import { addToCart, selectCartLines, selectCartUpdating } from '../../../store/slices/cartSlice';
import { getMainImageUrl } from '../../../store/slices/productsSlice';
import { PATHS } from '../../../router/path';

import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';
import useEntered from '../../../ui/custom/motion/useEntered';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import { formatMoney } from '../../../components/user/profile/profileMeta';
import { entityColorStep, toneColor } from '../../../lib/entityColors';

/* ---------- config ---------- */

const PAGE_SIZE = 10;

const SORTS = [
  { value: 'recent', label: 'Recently saved' },
  { value: 'low', label: 'Price: low to high' },
  { value: 'high', label: 'Price: high to low' },
  { value: 'name', label: 'Name A to Z' },
];

const FILTERS = [
  { key: 'all', label: 'All products', icon: Layers, color: toneColor(entityColorStep('productState', 'all')) },
  { key: 'in', label: 'In stock', icon: Check, color: toneColor(entityColorStep('productState', 'inStock')) },
  { key: 'out', label: 'Out of stock', icon: PackageX, color: toneColor(entityColorStep('productState', 'outOfStock')) },
  { key: 'sale', label: 'On sale', icon: Tag, color: toneColor(entityColorStep('productState', 'onSale')) },
];

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

const isOut = (p) => {
  const remaining = p.remaining == null ? null : Number(p.remaining);
  return p.status === 'outOfStock' || (remaining != null && remaining <= 0);
};
const isSale = (p) => (Number(p.originalPrice) || 0) > (Number(p.price) || 0);

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
    <div
      className="group flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--tile)]"
      style={{ '--tile': color }}
    >
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

/* ---------- one saved product ---------- */

function WishCard({ product: p, inCart, cartBusy, onRemove, onAdd, index }) {
  const entered = useEntered();
  const out = isOut(p);
  const price = Number(p.price) || 0;
  const original = Number(p.originalPrice) || 0;
  const sale = original > price;
  const off = sale ? Math.round(((original - price) / original) * 100) : 0;
  const rating = Number(p.ratingAverage) || 0;
  const img = getMainImageUrl(p);
  const href = PATHS.product(p.category, p.group, p.slug);

  return (
    <li
      className={`group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-all duration-500 hover:-translate-y-0.5 hover:border-accent motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{ transitionDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-alt">
        <Link to={href} className="block size-full" aria-label={p.name}>
          {img && (
            <img
              src={img}
              alt=""
              loading="lazy"
              className={`size-full object-cover transition-transform duration-500 group-hover:scale-105 ${out ? 'opacity-50' : ''}`}
            />
          )}
        </Link>

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {out && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
              <PackageX size={12} aria-hidden="true" />
              Out of stock
            </span>
          )}
          {sale && !out && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-tone-3 px-2.5 py-1 text-[11px] font-semibold text-white">
              <Tag size={12} aria-hidden="true" />
              {off}% off
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${p.name} from wishlist`}
          className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/90 text-error shadow-soft transition-transform duration-200 hover:scale-110 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Heart size={17} fill="currentColor" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link to={href} className="truncate font-heading text-sm font-semibold text-text hover:text-accent sm:text-base">
          {p.name}
        </Link>
        <p className="truncate text-xs text-muted">{p.category}</p>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-lg font-semibold tabular-nums text-text">{p.priceFormat || formatMoney(price)}</span>
          {sale && <span className="text-xs tabular-nums text-muted line-through">{formatMoney(original)}</span>}
        </div>

        {rating > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
            <Star size={13} fill="currentColor" className="text-accent-tone-3" aria-hidden="true" />
            {rating.toFixed(1)}
            {Number(p.reviewCount) > 0 && <span>({p.reviewCount})</span>}
          </p>
        )}

        <button
          type="button"
          onClick={onAdd}
          disabled={out || cartBusy}
          className={`mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
            inCart
              ? 'border-accent-tone-7 bg-accent-tone-7/10 text-accent-tone-7 hover:bg-accent-tone-7/20'
              : 'border-brown bg-brown text-on-brown hover:bg-brown-hover'
          }`}
        >
          {out ? (
            'Unavailable'
          ) : inCart ? (
            <>
              <Check size={16} aria-hidden="true" />
              In cart · add one more
            </>
          ) : (
            <>
              <ShoppingCart size={16} aria-hidden="true" />
              Add to cart
            </>
          )}
        </button>
      </div>
    </li>
  );
}

/* ---------- page ---------- */

export default function Wishlist() {
  const dispatch = useAppDispatch();
  const entered = useEntered();

  const ids = useAppSelector(selectWishlistIds);
  const products = useAppSelector(selectWishlistProducts);
  const status = useAppSelector(selectWishlistStatus);
  const error = useAppSelector(selectWishlistError);
  const cartLines = useAppSelector(selectCartLines);
  const cartBusy = useAppSelector(selectCartUpdating);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [errorShown, setErrorShown] = useState(true);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  useEffect(() => {
    dispatch(fetchWishlist()).then(() => setUpdatedAt(new Date()));
  }, [dispatch]);
  useEffect(() => setErrorShown(true), [error]);
  useEffect(() => setVisible(PAGE_SIZE), [query, category, sort, filter]);

  const refresh = async () => {
    setRefreshRequested(true);
    try {
      await dispatch(fetchWishlist());
      setUpdatedAt(new Date());
    } finally {
      setRefreshRequested(false);
    }
  };

  // Filtering by ids makes removal instant, and a failed save puts the card back.
  const items = useMemo(() => products.filter((p) => ids.includes(p.$id)), [products, ids]);
  const inCartIds = useMemo(() => new Set(cartLines.map((l) => l.productId)), [cartLines]);

  const stats = useMemo(() => {
    const out = items.filter(isOut).length;
    return {
      out,
      inStock: items.length - out,
      sale: items.filter(isSale).length,
      inCart: items.filter((p) => inCartIds.has(p.$id)).length,
    };
  }, [items, inCartIds]);

  const categories = useMemo(() => [...new Set(items.map((p) => p.category).filter(Boolean))].sort(), [items]);

  const counts = { all: items.length, in: stats.inStock, out: stats.out, sale: stats.sale };

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = items.filter((p) => {
      if (filter === 'in' && isOut(p)) return false;
      if (filter === 'out' && !isOut(p)) return false;
      if (filter === 'sale' && !isSale(p)) return false;
      if (category && p.category !== category) return false;
      if (term && !`${p.name} ${p.category} ${p.group || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
    if (sort === 'low') return [...rows].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (sort === 'high') return [...rows].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sort === 'name') return [...rows].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    // "recent": the order of ids is the order they were saved, newest last
    return [...rows].sort((a, b) => ids.indexOf(b.$id) - ids.indexOf(a.$id));
  }, [items, ids, filter, category, query, sort]);

  const phrases = useMemo(
    () => [
      'Your wishlist',
      `${items.length} saved ${items.length === 1 ? 'product' : 'products'}`,
      stats.sale ? `${stats.sale} on sale right now` : 'Keep what you love',
    ],
    [items.length, stats.sale]
  );

  const confirmClear = async () => {
    setClearBusy(true);
    await dispatch(clearWishlist());
    setClearBusy(false);
    setClearOpen(false);
  };

  const loadingFirst = status === 'idle' || (status === 'loading' && products.length === 0 && !refreshRequested);
  const refreshing = refreshRequested || (status === 'loading' && products.length > 0);

  if (loadingFirst) {
    return (
      <div role="status" className="flex items-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        Loading your wishlist…
      </div>
    );
  }

  if (status === 'failed' && products.length === 0) {
    return (
      <div role="alert" className="space-y-4">
        <p className="text-error">{error || 'Could not load your wishlist.'}</p>
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
          <PanelPageTitle icon="popular" className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Wishlist</PanelPageTitle>
          <p className="mt-1 hidden text-sm text-muted lg:block">Products you saved for later.</p>
        </div>
        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? 'animate-pulse bg-accent-tone-3' : 'bg-accent-tone-7'}`} />
              {refreshing ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
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
          <AppIcon name="popular" entity="wishlist" hueRotate={false} className="size-14 object-contain sm:size-16" />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Saved for later</span>
          <span className="heading mt-1 block min-h-[1.6em] truncate text-2xl sm:text-3xl">
            <Typewriter phrases={phrases} />
          </span>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:bg-white/25 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Trash2 size={16} aria-hidden="true" />
            Clear wishlist
          </button>
        ) : (
          <Link
            to={PATHS.products}
            className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 hover:scale-105 hover:text-[color:var(--brown)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            Browse products
          </Link>
        )}
      </section>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
            <Heart size={26} aria-hidden="true" />
          </span>
          <p className="mt-4 font-heading text-lg font-semibold text-text">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted">Tap the heart on any product to keep it here.</p>
          <Link to={PATHS.products} className="btn btn-primary mt-6 hover:text-on-brown">Browse products</Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Heart} label="Saved products" color={toneColor(entityColorStep('entity', 'wishlist'))}>
              <CountUp value={items.length} />
            </StatTile>
            <StatTile icon={Check} label="In stock" color={toneColor(entityColorStep('stockStatus', 'in'))}>
              <CountUp value={stats.inStock} />
            </StatTile>
            <StatTile icon={Tag} label="On sale" color={toneColor(entityColorStep('productState', 'onSale'))}>
              <CountUp value={stats.sale} />
            </StatTile>
            <StatTile icon={ShoppingCart} label="Already in cart" color={toneColor(entityColorStep('entity', 'cart'))}>
              <CountUp value={stats.inCart} />
            </StatTile>
          </div>

          {/* Search, category, sort */}
          <div className="grid items-start gap-3 sm:grid-cols-[1fr_12rem_13rem]">
            <SearchInput
              value={query}
              onSearch={setQuery}
              size="sm"
              label="Search wishlist"
              placeholder="Search your wishlist"
            />
            <SelectInput
              value={category}
              onChange={setCategory}
              options={categories}
              placeholder="All categories"
              searchable
              clearable
              size="sm"
              aria-label="Filter by category"
            />
            <SelectInput value={sort} onChange={setSort} options={SORTS} size="sm" aria-label="Sort wishlist" />
          </div>

          {/* Availability filter */}
          <div className="flex items-center gap-3">
          <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by availability">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-label={f.label}
                  title={f.label}
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className="inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-full border text-sm font-medium transition-all duration-200 hover:-translate-y-px active:scale-95"
                  style={{
                    borderColor: active ? f.color : 'var(--border)',
                    background: active ? `color-mix(in srgb, ${f.color} 14%, transparent)` : 'var(--surface)',
                    color: active ? f.color : 'var(--text-muted)',
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span
                    className="rounded-full px-1 text-[10px] tabular-nums"
                    style={{ background: `color-mix(in srgb, ${f.color} 15%, transparent)`, color: f.color }}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="shrink-0 text-sm font-medium text-text" aria-live="polite">
            {FILTERS.find((option) => option.key === filter)?.label}
          </span>
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <Search size={26} className="mx-auto text-muted" aria-hidden="true" />
              <p className="mt-3 font-medium text-text">No saved products match</p>
              <p className="mt-1 text-sm text-muted">Try another filter or a different search.</p>
              <button
                type="button"
                onClick={() => { setFilter('all'); setCategory(''); setQuery(''); }}
                className="btn btn-ghost mt-4"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {list.slice(0, visible).map((p, i) => (
                  <WishCard
                    key={p.$id}
                    product={p}
                    index={i}
                    inCart={inCartIds.has(p.$id)}
                    cartBusy={cartBusy}
                    onRemove={() => dispatch(toggleWishlist({ productId: p.$id }))}
                    onAdd={() => dispatch(addToCart({ productId: p.$id, quantity: 1, toast: true }))}
                  />
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
        </>
      )}

      <ConfirmDialog
        open={clearOpen}
        danger
        busy={clearBusy}
        title="Clear your wishlist?"
        message="All saved products will be removed from your wishlist."
        confirmLabel="Clear wishlist"
        onConfirm={confirmClear}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  );
}