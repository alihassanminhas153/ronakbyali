import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight, Banknote, Bell, Boxes, CalendarDays, CheckCircle2, Clock, Heart, LineChart as LineIcon, RefreshCw,
  Settings, ShoppingBag, ShoppingCart, Star, TrendingDown, TrendingUp, Users, Wallet,
} from 'lucide-react';

import {
  STATUS_TONE, LinkTile, Mini, OverviewCard, StatusBadge, buildOverview, useAdminLink, useOverviewData,
} from '../../../components/admin/overview';
import { rs } from '../../../components/admin/finance';
import useSession from '../../../router/useSession';
import { PATHS } from '../../../router/path';
import { BarChart, Donut, HeatmapCalendar, TrendGraph, colorFor, compact, toneVar } from '../../../ui/graphs';
import CountUp from '../../../ui/custom/motion/CountUp';
import Typewriter from '../../../ui/custom/motion/Typewriter';

const short = (n) => `Rs ${compact(n)}`;
const colored = (data) => data.map((d) => ({ ...d, color: colorFor(d.label) }));
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const grid = 'grid gap-4 lg:grid-cols-2';

// Every key used in this page -> the matching helper in router/path.js (PATHS.admin).
// Wrong or missing keys used to fall through to another page, so they are all listed here.
const ROUTES = {
  overview: 'overview', orders: 'orders', products: 'products', users: 'users', finance: 'finance',
  alerts: 'alerts', settings: 'settings', reviews: 'reviews',
  carts: 'cartAndWishlist', cart: 'cartAndWishlist', wishlist: 'cartAndWishlist', wishlists: 'cartAndWishlist',
  'cart-and-wishlist': 'cartAndWishlist', cartAndWishlist: 'cartAndWishlist',
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

// Admin > Overview   (/team/:username)
export default function Overview() {
  const baseLink = useAdminLink();
  const { username } = useSession();
  // Known keys always use PATHS (the same URLs as the sidebar); anything else falls back to the old helper.
  const link = useCallback(
    (key) => (ROUTES[key] && username ? PATHS.admin[ROUTES[key]](username) : baseLink(key)),
    [username, baseLink]
  );
  const data = useOverviewData();
  const { loading, error, reload } = data;
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  useEffect(() => {
    if (!loading) setUpdatedAt(new Date());
  }, [loading]);

  const { orders, products, users, alerts, reviews, carts, wishlists, ledger } = data;
  const o = useMemo(
    () => buildOverview({ orders, products, users, alerts, reviews, carts, wishlists, ledger }),
    [orders, products, users, alerts, reviews, carts, wishlists, ledger]
  );
  const { fin, orderStats, productStats, userStats, alertStats, reviewStats, attention } = o;

  const heroPhrases = useMemo(
    () => (attention.length ? [`${attention.length} ${attention.length === 1 ? 'thing needs' : 'things need'} your attention`, ...attention.map((a) => a.text)] : ['You are all caught up']),
    [attention]
  );
  const loss = fin.all.net < 0;
  const firstLoad = loading && !orders.length && !products.length;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Overview</h1>
          <p className="mt-1 hidden text-sm text-muted lg:block">
            {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })} · everything in your store
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-graph-3' : 'bg-graph-7'}`} />
              {loading ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            title="Fetch the latest data from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-graph-1 hover:bg-surface-alt hover:text-graph-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{loading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error} <button type="button" onClick={reload} className="font-medium underline">Try again</button>
        </div>
      )}

      {/* Needs attention */}
      <section
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="animate-rise relative isolate overflow-hidden rounded-2xl p-5 text-white sm:p-7"
      >
        {/* decorative shapes */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />

        <div className="relative flex items-center gap-4 sm:gap-6">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-16 sm:w-16">
            {attention.length > 0 && (
              <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-2xl border-2 border-white/70" />
            )}
            <span className="grid h-full w-full place-items-center rounded-2xl border border-white/25 bg-white/15">
              {attention.length ? <Clock size={28} strokeWidth={2.5} /> : <CheckCircle2 size={28} strokeWidth={2.5} />}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Needs attention</p>
            <p className="heading mt-1 min-h-[1.6em] truncate text-xl sm:text-3xl">
              {firstLoad ? 'Checking your store…' : <Typewriter phrases={heroPhrases} />}
            </p>
          </div>
        </div>

        {attention.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {attention.map((a) => (
              <Link
                key={a.key}
                to={link(a.to)}
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
        <LinkTile to={link('finance')} label="Revenue (30 days)" value={fin.now.revenue} format={short} hint={`${fin.deliveredCount} delivered orders`} icon={Banknote} tone={1} delay={0} />
        <LinkTile to={link('finance')} label={loss ? 'Net loss (all time)' : 'Net profit (all time)'} value={Math.abs(fin.all.net)} format={short} hint={fin.roi == null ? 'add an investment' : `${Math.round(fin.roi)}% return`} icon={loss ? TrendingDown : TrendingUp} tone={loss ? 4 : 7} delay={40} />
        <LinkTile to={link('orders')} label="Pending orders" value={orderStats.pending} hint={`${orderStats.open} open in total`} icon={Clock} tone={3} delay={80} />
        <LinkTile to={link('users')} label="Customers" value={userStats.customers} hint={`${userStats.fresh} new in 30 days`} icon={Users} tone={6} delay={120} />
        <LinkTile to={link('products')} label="Products in stock" value={productStats.inStock} hint={`${productStats.out} out of stock`} icon={Boxes} tone={2} delay={160} />
        <LinkTile to={link('alerts')} label="Active alerts" value={alertStats.active} hint={`${alertStats.popups} popups`} icon={Bell} tone={5} delay={200} />
        <LinkTile to={link('carts')} label="Value in carts" value={fin.demand.cartValue} format={short} hint={`${fin.demand.cartsWithItems} carts with items`} icon={ShoppingCart} tone={1} delay={240} />
        <LinkTile to={link('reviews')} label="Reviews to approve" value={reviewStats.pending} hint={reviewStats.average ? `${reviewStats.average.toFixed(1)} / 5 average` : 'no reviews yet'} icon={Star} tone={4} delay={280} />
      </div>

      <div className={grid}>
        <OverviewCard to={link('finance')} cta="Finance" title="Revenue trend" subtitle="Delivered orders, last 12 months" icon={LineIcon} tone={1}>
          <TrendGraph data={fin.months.map((m) => ({ label: m.label, value: m.revenue }))} color="var(--graph-1)" format={short} />
        </OverviewCard>
        <OverviewCard to={link('orders')} cta="Orders" title="Orders per day" subtitle="Last 6 months" icon={CalendarDays} tone={2} delay={80}>
          <HeatmapCalendar data={fin.ordersHeat} weeks={26} label="orders" />
        </OverviewCard>
      </div>

      {/* One card per section */}
      <div className={grid}>
        <OverviewCard to={link('orders')} cta="All orders" title="Orders" subtitle={`${orderStats.total} in total`} icon={ShoppingBag} tone={1} className="lg:col-span-2">
          <Mini items={[
            { label: 'Pending', value: orderStats.pending, tone: 3 },
            { label: 'Open', value: orderStats.open, tone: 5 },
            { label: 'Delivered', value: orderStats.delivered, tone: 7 },
          ]} />
          <div className="grid gap-5 md:grid-cols-2">
            <Donut
              centerLabel="orders"
              data={orderStats.byStatus.map((d) => ({ ...d, label: cap(d.label), color: toneVar(STATUS_TONE[d.label] || 8) }))}
              empty="No orders yet."
            />
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Latest orders</p>
              {orderStats.recent.length === 0 ? (
                <div className="grid h-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted">No orders yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {orderStats.recent.map((ord, i) => (
                    <li key={ord.$id} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{ord.orderNumber}</p>
                        <p className="truncate text-xs text-muted">{ord.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums text-text">{rs(ord.total)}</p>
                        <StatusBadge status={ord.status} tone={STATUS_TONE[ord.status] || 8} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </OverviewCard>

        <OverviewCard to={link('products')} cta="Products" title="Products" subtitle={`${productStats.total} in the store`} icon={Boxes} tone={2} delay={80}>
          <Mini items={[
            { label: 'In stock', value: productStats.inStock, tone: 2 },
            { label: 'Out of stock', value: productStats.out, tone: 4 },
            { label: 'Running low', value: productStats.low, tone: 3 },
          ]} />
          <BarChart data={colored(productStats.byCategory.slice(0, 6))} empty="No products yet." />
        </OverviewCard>

        <OverviewCard to={link('users')} cta="Users" title="Customers" subtitle="New sign-ups, last 6 months" icon={Users} tone={6} delay={160}>
          <Mini items={[
            { label: 'Accounts', value: userStats.total, tone: 6 },
            { label: 'New (30 days)', value: userStats.fresh, tone: 7 },
            { label: 'Blocked', value: userStats.blocked, tone: 4 },
          ]} />
          <TrendGraph data={userStats.signups.map((s) => ({ label: s.label, value: s.value }))} color="var(--graph-6)" />
        </OverviewCard>

        <OverviewCard to={link('alerts')} cta="Alerts" title="Alerts" subtitle={`${alertStats.total} created · ${Math.round(alertStats.seenRate)}% seen`} icon={Bell} tone={5} delay={240}>
          <Mini items={[
            { label: 'Active', value: alertStats.active, tone: 5 },
            { label: 'Scheduled', value: alertStats.scheduled, tone: 3 },
            { label: 'Popups', value: alertStats.popups, tone: 6 },
          ]} />
          <Donut centerLabel="alerts" data={colored(alertStats.byState.map((d) => ({ ...d, label: cap(d.label) })))} empty="No alerts yet." />
        </OverviewCard>

        <OverviewCard to={link('carts')} cta="Carts & wishlists" title="Carts & wishlists" subtitle="What shoppers are about to buy" icon={ShoppingCart} tone={3} delay={320}>
          <Mini items={[
            { label: 'Carts', value: fin.demand.cartsWithItems, tone: 1 },
            { label: 'In carts', value: fin.demand.cartValue, format: short, tone: 7 },
            { label: 'Wishlisted', value: fin.demand.wishTotal, tone: 4 },
          ]} />
          <BarChart data={fin.demand.topCarted.slice(0, 5).map((l) => ({ label: l.name, value: l.carts, hint: `${l.qty} pcs` }))} empty="No carts yet." />
        </OverviewCard>

        <OverviewCard to={link('finance')} cta="Finance" title="Finance" subtitle="Net profit per month, below the line = loss" icon={Wallet} tone={7} delay={400}>
          <Mini items={[
            { label: 'Cash in hand', value: fin.cash, format: short, tone: fin.cash < 0 ? 4 : 2 },
            { label: 'Invested', value: fin.all.invested, format: short, tone: 6 },
            { label: 'Expenses (30d)', value: fin.now.opex, format: short, tone: 4 },
          ]} />
          <TrendGraph data={fin.months.map((m) => ({ label: m.label, value: m.profit }))} color="var(--graph-7)" format={short} />
        </OverviewCard>

        <OverviewCard to={link('reviews')} cta="All reviews" title="Reviews" subtitle={`${reviewStats.total} in total`} icon={Star} tone={4} delay={480} className="lg:col-span-2">
          <Mini items={[
            { label: 'To approve', value: reviewStats.pending, tone: 3 },
            { label: 'Average rating', value: reviewStats.average ? `${reviewStats.average.toFixed(1)} / 5` : '—', tone: 7 },
            { label: 'Approved 5★', value: reviewStats.stars[4].value, tone: 1 },
          ]} />
          <BarChart orientation="vertical" height={150} data={reviewStats.stars.map((s, i) => ({ ...s, color: `var(--graph-${[4, 3, 8, 5, 7][i]})` }))} format={(n) => n} empty="No approved reviews yet." />
        </OverviewCard>
      </div>

      {/* Quick links */}
      <nav aria-label="Admin pages" className="flex flex-wrap gap-2 pt-1">
        {[
          ['orders', 'Orders', ShoppingBag, 1], ['products', 'Products', Boxes, 2], ['users', 'Users', Users, 6], ['alerts', 'Alerts', Bell, 5],
          ['carts', 'Carts & wishlists', Heart, 4], ['reviews', 'Reviews', Star, 3], ['finance', 'Finance', Wallet, 7], ['settings', 'Settings', Settings, 8],
        ].map(([to, label, Icon, tone]) => (
          <Link
            key={to}
            to={link(to)}
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