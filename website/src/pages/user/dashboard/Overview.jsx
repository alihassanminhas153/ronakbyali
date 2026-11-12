// user overview page (styled like the admin overview, wired to the user's own slices)

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  KeyRound,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  User,
  UserRound,
} from 'lucide-react';

import { STATUS_TONE, LinkTile, Mini, OverviewCard, StatusBadge } from '../../../components/admin/overview';
import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { getAvatarUrl } from '../../../store/slices/authSlice';
import { refreshMyProfile, selectMe, selectMeStatus } from '../../../store/slices/userSlice';
import { getUserId } from '../../../store/slices/utils';
import { canEditOrder, fetchMyOrders, selectMyOrders, selectMyOrdersStatus, selectMyOrdersTotal } from '../../../store/slices/ordersSlice';
import { fetchCart, selectCartCount, selectCartLines, selectCartStatus, selectCartSubtotal } from '../../../store/slices/cartSlice';
import { fetchWishlist, selectWishlistProducts, selectWishlistStatus } from '../../../store/slices/wishlistSlice';
import { fetchMyReviews, selectMyReviews, selectMyReviewsStatus } from '../../../store/slices/reviewSlice';
import { fetchAlertBars, selectAlertBars } from '../../../store/slices/alertSlice';
import { BarChart, Donut, TrendGraph, compact, toneVar } from '../../../ui/graphs';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';
import useEntered from '../../../ui/custom/motion/useEntered';
import { formatInt, formatMoney } from '../../../components/admin/users/userFields';
import { paidAmountForOrder } from '../../../lib/orderMath';

/*
 * Route segments are relative to the user dashboard (this page is its index
 * route), so "orders" becomes /user/<username>/orders. Change them here if
 * your router uses other names. SHOP_PATH is the public store page.
 */
const SHOP_PATH = '/products';
const grid = 'grid gap-4 lg:grid-cols-2';

const short = (n) => `Rs ${compact(n)}`;
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '—');
const capitalize = cap;
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
};
const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—';
};
const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Last 6 calendar months, oldest first: [{ key, label }]
const lastMonths = (count = 6) => {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en', { month: 'short' }) };
  });
};
const monthKey = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${d.getMonth()}` : null;
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

// ---------- Pieces ----------

function CompletionRing({ percent }) {
  const entered = useEntered(200);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`Profile ${percent}% complete`}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-surface-alt" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="var(--graph-7)"
          strokeDasharray={circumference}
          strokeDashoffset={entered ? circumference * (1 - percent / 100) : circumference}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-2xl font-semibold text-text">
        <span><CountUp value={percent} />%</span>
      </span>
    </div>
  );
}

function SnapshotRow({ icon: Icon, label, children }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-muted">
        <Icon size={15} aria-hidden="true" />
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium text-text">{children}</span>
    </li>
  );
}

function EmptyBox({ children }) {
  return <div className="grid h-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted">{children}</div>;
}

// ---------- Page ----------

function OverviewView({ me }) {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.auth.profile);
  const userId = getUserId(profile) || me.$id;

  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [brokenUrl, setBrokenUrl] = useState('');
  const ago = useTimeAgo(updatedAt);

  // data from the slices
  const orders = useAppSelector(selectMyOrders);
  const ordersTotal = useAppSelector(selectMyOrdersTotal);
  const ordersStatus = useAppSelector(selectMyOrdersStatus);
  const cartLines = useAppSelector(selectCartLines);
  const cartCount = useAppSelector(selectCartCount);
  const cartSubtotal = useAppSelector(selectCartSubtotal);
  const cartStatus = useAppSelector(selectCartStatus);
  const wishProducts = useAppSelector(selectWishlistProducts);
  const wishStatus = useAppSelector(selectWishlistStatus);
  const myReviews = useAppSelector(selectMyReviews);
  const reviewsStatus = useAppSelector(selectMyReviewsStatus);
  const bars = useAppSelector(selectAlertBars);

  const loadAll = useCallback(
    () =>
      Promise.all([
        dispatch(fetchMyOrders({ limit: 100, offset: 0 })),
        dispatch(fetchCart()),
        dispatch(fetchWishlist()),
        dispatch(fetchMyReviews(userId)),
        dispatch(fetchAlertBars()),
      ]),
    [dispatch, userId]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loading = [ordersStatus, cartStatus, wishStatus, reviewsStatus].includes('loading');
  const busy = refreshing || loading;

  const refresh = async () => {
    setRefreshing(true);
    const [result] = await Promise.all([dispatch(refreshMyProfile()), loadAll()]);
    if (refreshMyProfile.fulfilled.match(result)) setUpdatedAt(new Date());
    setRefreshing(false);
  };

  // profile
  const avatarUrl = getAvatarUrl(me.avatarFileId);
  const showAvatar = Boolean(avatarUrl) && avatarUrl !== brokenUrl;
  const firstName = (me.name || me.username || '').split(' ')[0];
  const checklist = [
    { label: 'Profile photo', done: showAvatar },
    { label: 'Phone number', done: Boolean(me.phone) },
    { label: 'City', done: Boolean(me.lastCity) },
    { label: 'Delivery address', done: Boolean(me.lastAddress) },
  ];
  const percent = Math.round(((2 + checklist.filter((i) => i.done).length) / (2 + checklist.length)) * 100);

  // numbers
  const orderCount = Number(me.ordersCount) || ordersTotal || 0;
  const spent = Number(me.totalSpent) || 0;

  const o = useMemo(() => {
    const counts = {};
    orders.forEach((x) => {
      counts[x.status] = (counts[x.status] || 0) + 1;
    });
    const months = lastMonths(6);
    const perMonthSpend = Object.fromEntries(months.map((m) => [m.key, 0]));
    const perMonthCount = Object.fromEntries(months.map((m) => [m.key, 0]));
    orders.forEach((x) => {
      const k = monthKey(x.$updatedAt || x.$createdAt);
      if (k in perMonthSpend) {
        perMonthSpend[k] += paidAmountForOrder(x);
        if (x.status !== 'cancelled') perMonthCount[k] += 1;
      }
    });

    const approved = myReviews.filter((r) => r.status === 'approved');
    const rated = approved.filter((r) => Number(r.rating) > 0);
    const stars = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}★`, value: rated.filter((r) => Math.round(Number(r.rating)) === n).length }));

    return {
      pending: counts.pending || 0,
      delivered: counts.delivered || 0,
      open: orders.filter(canEditOrder).length,
      byStatus: Object.entries(counts).map(([label, value]) => ({ label, value })),
      recent: orders.slice(0, 5),
      spendTrend: months.map((m) => ({ label: m.label, value: perMonthSpend[m.key] })),
      countTrend: months.map((m) => ({ label: m.label, value: perMonthCount[m.key] })),
      reviews: {
        total: myReviews.length,
        pending: myReviews.filter((r) => r.status === 'pending').length,
        approved: approved.length,
        average: rated.length ? rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length : 0,
        stars,
      },
      wish: {
        total: wishProducts.length,
        out: wishProducts.filter((p) => p.status === 'outOfStock').length,
      },
    };
  }, [orders, myReviews, wishProducts]);

  const attention = useMemo(() => {
    const list = [];
    if (o.open > 0) list.push({ key: 'open', count: o.open, text: `${o.open} ${o.open === 1 ? 'order' : 'orders'} on the way`, to: 'orders' });
    if (cartCount > 0) list.push({ key: 'cart', count: cartCount, text: `${cartCount} ${cartCount === 1 ? 'item' : 'items'} waiting in your cart`, to: 'cart' });
    if (bars.length > 0) list.push({ key: 'alerts', count: bars.length, text: `${bars.length} new ${bars.length === 1 ? 'alert' : 'alerts'}`, to: 'alerts' });
    if (percent < 100) list.push({ key: 'profile', count: checklist.filter((i) => !i.done).length, text: 'details missing in your profile', to: 'profile' });
    return list;
  }, [o.open, cartCount, bars.length, percent, checklist]);

  const hello = useMemo(greeting, []);
  const heroPhrases = useMemo(
    () => [
      `${hello}, ${firstName}`,
      ...(attention.length
        ? [`${attention.length} ${attention.length === 1 ? 'thing needs' : 'things need'} your attention`, ...attention.map((a) => a.text)]
        : ['You are all caught up']),
    ],
    [hello, firstName, attention]
  );
  const firstLoad = loading && !orders.length && !cartLines.length;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Overview</h1>
          <p className="mt-1 hidden text-sm text-muted lg:block">
            {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })} · everything in your account
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
            onClick={refresh}
            disabled={busy}
            title="Fetch your latest account details"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-graph-1 hover:bg-surface-alt hover:text-graph-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{busy ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Welcome / needs attention */}
      <section
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="animate-rise relative isolate overflow-hidden rounded-2xl p-5 text-white sm:p-7"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />

        <div className="relative flex items-center gap-4 sm:gap-6">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-16 sm:w-16">
            {attention.length > 0 && (
              <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-2xl border-2 border-white/70" />
            )}
            <span className="grid h-full w-full place-items-center overflow-hidden rounded-2xl border border-white/25 bg-white/15">
              {showAvatar ? (
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setBrokenUrl(avatarUrl)} className="size-full object-cover" />
              ) : attention.length ? (
                <User size={28} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={28} strokeWidth={2.5} aria-hidden="true" />
              )}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{capitalize(me.role)} account</p>
            <p className="heading mt-1 min-h-[1.6em] truncate text-xl sm:text-3xl">
              {firstLoad ? 'Checking your account…' : <Typewriter phrases={heroPhrases} />}
            </p>
            <p className="mt-0.5 hidden text-sm text-white/75 sm:block">
              {orderCount > 0
                ? `You’ve placed ${formatInt(orderCount)} ${orderCount === 1 ? 'order' : 'orders'} with us. Thank you!`
                : 'Your first order is one click away.'}
            </p>
          </div>

          <Link
            to={SHOP_PATH}
            className="group relative hidden shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            Shop now
            <ArrowRight size={16} className="group-hover:animate-nudge" aria-hidden="true" />
          </Link>
        </div>

        {attention.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {attention.map((a) => (
              <Link
                key={a.key}
                to={a.to}
                className="group inline-flex min-h-9 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-semibold text-[color:var(--brown)] transition-transform duration-300 hover:scale-105 active:scale-95"
              >
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[color:var(--brown)] px-1 text-[11px] font-semibold tabular-nums text-white">
                  {a.count}
                </span>
                {a.text.replace(/^\d+\s/, '')}
                <ArrowRight size={14} className="group-hover:animate-nudge" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Key numbers: every tile opens its page */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <LinkTile to="orders" label="Orders placed" value={orderCount} hint={`${o.delivered} delivered`} appIcon="list" tone={1} delay={0} />
        <LinkTile to="orders" label="Total spent" value={spent} format={short} hint={orderCount ? `${short(spent / orderCount)} per order` : 'no orders yet'} appIcon="wallet" sensitive tone={2} delay={40} />
        <LinkTile to="orders" label="Orders on the way" value={o.open} hint={`${o.pending} pending`} appIcon="truck" tone={3} delay={80} />
        <LinkTile to="cart" label="Value in cart" value={cartSubtotal} format={short} hint={`${cartCount} ${cartCount === 1 ? 'item' : 'items'}`} appIcon="cart" sensitive tone={1} delay={120} />
        <LinkTile to="wishlist" label="Wishlist" value={o.wish.total} hint={`${o.wish.out} out of stock`} appIcon="popular" tone={4} delay={160} />
        <LinkTile to="reviews" label="Reviews written" value={o.reviews.total} hint={o.reviews.pending ? `${o.reviews.pending} awaiting approval` : 'all reviewed'} appIcon="reviews" tone={5} delay={200} />
        <LinkTile to="alerts" label="New alerts" value={bars.length} hint="offers and updates" appIcon="alert" tone={6} delay={240} />
        <LinkTile to="profile" label="Profile complete" value={percent} format={(n) => `${Math.round(n)}%`} hint={percent === 100 ? 'all set' : 'finish in Profile'} appIcon="user" tone={7} delay={280} />
      </div>

      <div className={grid}>
        <OverviewCard to="orders" cta="Orders" title="Spending trend" subtitle="What you paid, last 6 months" appIcon="histogram" tone={2}>
          <TrendGraph data={o.spendTrend} color="var(--graph-2)" format={short} />
        </OverviewCard>
        <OverviewCard to="orders" cta="Orders" title="Orders per month" subtitle="Last 6 months" appIcon="clock" tone={1} delay={80}>
          <TrendGraph data={o.countTrend} color="var(--graph-1)" />
        </OverviewCard>
      </div>

      {/* One card per section */}
      <div className={grid}>
        <OverviewCard to="orders" cta="My orders" title="Orders" subtitle={`${orderCount} in total`} appIcon="list" tone={1} className="lg:col-span-2">
          <Mini items={[
            { label: 'Pending', value: o.pending, tone: 3 },
            { label: 'On the way', value: o.open, tone: 5 },
            { label: 'Delivered', value: o.delivered, tone: 7 },
          ]} />
          <div className="grid gap-5 md:grid-cols-2">
            <Donut
              centerLabel="orders"
              data={o.byStatus.map((d) => ({ ...d, label: cap(d.label), color: toneVar(STATUS_TONE[d.label] || 8) }))}
              empty="No orders yet."
            />
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Latest orders</p>
              {o.recent.length === 0 ? (
                <EmptyBox>No orders yet.</EmptyBox>
              ) : (
                <ul className="divide-y divide-border">
                  {o.recent.map((ord, i) => (
                    <li key={ord.$id} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{ord.orderNumber}</p>
                        <p className="truncate text-xs text-muted">{formatDate(ord.$createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums text-text">{formatMoney(ord.total)}</p>
                        <StatusBadge status={ord.status} tone={STATUS_TONE[ord.status] || 8} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </OverviewCard>

        <OverviewCard to="cart" cta="Cart" title="Cart" subtitle="Pick up where you left off" appIcon="cart" tone={3} delay={80}>
          <Mini items={[
            { label: 'Items', value: cartCount, tone: 1 },
            { label: 'Subtotal', value: cartSubtotal, format: short, tone: 7 },
            { label: 'Lines', value: cartLines.length, tone: 3 },
          ]} />
          <BarChart
            data={cartLines.slice(0, 5).map((l) => ({
              label: l.product?.name || 'Item',
              value: Number(l.quantity) || 0,
              hint: formatMoney((Number(l.product?.price) || 0) * (Number(l.quantity) || 0)),
            }))}
            empty="Your cart is empty."
          />
        </OverviewCard>

        <OverviewCard to="wishlist" cta="Wishlist" title="Wishlist" subtitle="Pieces you’ve saved for later" appIcon="popular" tone={4} delay={160}>
          <Mini items={[
            { label: 'Saved', value: o.wish.total, tone: 4 },
            { label: 'Available', value: o.wish.total - o.wish.out, tone: 7 },
            { label: 'Out of stock', value: o.wish.out, tone: 3 },
          ]} />
          {wishProducts.length === 0 ? (
            <EmptyBox>Nothing saved yet.</EmptyBox>
          ) : (
            <ul className="divide-y divide-border">
              {wishProducts.slice(0, 4).map((p, i) => (
                <li key={p.$id} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise flex items-center gap-3 py-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">{p.name}</p>
                  <p className="text-sm font-medium tabular-nums text-text">{formatMoney(p.price)}</p>
                </li>
              ))}
            </ul>
          )}
        </OverviewCard>

        <OverviewCard to="reviews" cta="My reviews" title="Reviews" subtitle={`${o.reviews.total} written`} appIcon="reviews" tone={5} delay={240} className="lg:col-span-2">
          <Mini items={[
            { label: 'Awaiting approval', value: o.reviews.pending, tone: 3 },
            { label: 'Average rating', value: o.reviews.average ? `${o.reviews.average.toFixed(1)} / 5` : '—', tone: 7 },
            { label: 'Approved', value: o.reviews.approved, tone: 1 },
          ]} />
          <BarChart
            orientation="vertical"
            height={150}
            data={o.reviews.stars.map((s, i) => ({ ...s, color: `var(--graph-${[4, 3, 8, 5, 7][i]})` }))}
            format={(n) => n}
            empty="No approved reviews yet."
          />
        </OverviewCard>
      </div>

      {/* Account */}
      <div className={grid}>
        <section className="rounded-xl border border-border border-t-2 bg-surface p-4 sm:p-5" style={{ borderTopColor: 'var(--graph-7)' }}>
          <div className="flex items-center gap-4">
            <CompletionRing percent={percent} />
            <div className="min-w-0">
              <h2 className="heading-sm text-text">{percent === 100 ? 'Profile complete' : 'Complete your profile'}</h2>
              <p className="mt-1 text-xs text-muted">
                {percent === 100 ? 'Checkout will prefill everything for you.' : 'Saved details make checkout faster.'}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
                    item.done ? 'border-graph-7 bg-graph-7 text-white' : 'border-dashed border-border text-transparent'
                  }`}
                >
                  <Check size={12} aria-hidden="true" />
                </span>
                <span className={item.done ? 'text-muted line-through' : 'text-text'}>{item.label}</span>
              </li>
            ))}
          </ul>
          {percent < 100 && (
            <Link
              to="profile"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-all hover:gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Finish in Profile
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="heading-sm text-text">Account snapshot</h2>
          <ul className="mt-2 divide-y divide-border">
            <SnapshotRow icon={ShieldCheck} label="Account type">{capitalize(me.role)}</SnapshotRow>
            <SnapshotRow icon={KeyRound} label="Sign-in">{capitalize(me.authProvider)}</SnapshotRow>
            <SnapshotRow icon={CalendarDays} label="Member since">{formatDate(me.$createdAt)}</SnapshotRow>
            <SnapshotRow icon={Clock} label="Last login">{formatDateTime(me.lastLoginAt)}</SnapshotRow>
          </ul>
        </section>
      </div>

      {/* Quick links */}
      <nav aria-label="Account pages" className="flex flex-wrap gap-2 pt-1">
        {[
          ['orders', 'My orders', Receipt, 1], ['cart', 'Cart', ShoppingCart, 2], ['wishlist', 'Wishlist', Heart, 4],
          ['reviews', 'Reviews', Star, 3], ['alerts', 'Alerts', Bell, 6], ['profile', 'Profile', UserRound, 7],
        ].map(([to, label, Icon, tone]) => (
          <Link
            key={to}
            to={to}
            style={{ '--op': toneVar(tone) }}
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-px hover:border-[var(--op)] hover:text-[var(--op)] active:translate-y-0 active:scale-95"
          >
            <Icon size={16} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

// User > Overview (index route of the user dashboard)
export default function Overview() {
  const me = useAppSelector(selectMe);
  const meStatus = useAppSelector(selectMeStatus);

  if (!me) {
    return (
      <div role="status" className="flex items-center gap-2 text-muted">
        {meStatus === 'failed' ? (
          'Could not load your account. Please try again in a moment.'
        ) : (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Loading your overview…
          </>
        )}
      </div>
    );
  }

  return <OverviewView key={me.$id} me={me} />;
}