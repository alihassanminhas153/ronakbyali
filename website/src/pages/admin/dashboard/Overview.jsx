import PageHeader from '../../../ui/custom/PageHeader';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight, Bell, Boxes, Heart, RefreshCw,
  Settings, ShoppingBag, Star, Users, Wallet,
} from 'lucide-react';

import {
  STATUS_TONE, LinkTile, Mini, OverviewCard, StatusBadge, buildOverview, useAdminLink, useOverviewData,
} from '../../../components/admin/overview';
import { rs } from '../../../components/admin/finance';
import useSession from '../../../router/useSession';
import { PATHS } from '../../../router/path';
import { BarChart, Donut, HeatmapCalendar, TrendGraph, colorFor, compact, toneVar } from '../../../ui/graphs';
import { formatCardMoney } from '../../../ui/graphs/CardMoney';
import usePanelAccess from '../../../lib/layout/usePanelAccess';
import useUserLabels from '../../../lib/layout/useUserLabels';
import { visiblePages } from '../../../lib/layout/layoutRegistry';
import { isAccessDeniedError } from '../../../lib/appwrite/accessErrors';
import { useAppDispatch } from '../../../store/slices/hooks';
import { addToast } from '../../../store/slices/uiSlice';

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
  const dispatch = useAppDispatch();
  const baseLink = useAdminLink();
  const { username } = useSession();
  // Known keys always use PATHS (the same URLs as the sidebar); anything else falls back to the old helper.
  const link = useCallback(
    (key) => (ROUTES[key] && username ? PATHS.admin[ROUTES[key]](username) : baseLink(key)),
    [username, baseLink]
  );
  const data = useOverviewData();
  const { loading, error, accessDenied, reload } = data;
  const { rows: layoutRows, statusCode: accessStatusCode } = usePanelAccess();
  const userLabels = useUserLabels();
  const visiblePageKeys = useMemo(
    () => new Set(visiblePages('admin', layoutRows, userLabels).map((page) => page.key)),
    [layoutRows, userLabels]
  );
  const canShowPage = useCallback((key) => visiblePageKeys.has(key), [visiblePageKeys]);
  const showAccessWarning = accessDenied || isAccessDeniedError({ code: accessStatusCode });
  const [updatedAt, setUpdatedAt] = useState(null);
  const ago = useTimeAgo(updatedAt);

  useEffect(() => {
    if (!loading) setUpdatedAt(new Date());
  }, [loading]);

  useEffect(() => {
    if (showAccessWarning) {
      dispatch(addToast({
        type: 'warning',
        message: "You don't have access to all the data needed for this page.",
        position: 'top-center',
        duration: 4500,
      }));
    }
  }, [showAccessWarning, dispatch]);

  const { orders, products, users, alerts, reviews, carts, wishlists, ledger } = data;
  const o = useMemo(
    () => buildOverview({ orders, products, users, alerts, reviews, carts, wishlists, ledger }),
    [orders, products, users, alerts, reviews, carts, wishlists, ledger]
  );
  const { fin, orderStats, productStats, userStats, alertStats, reviewStats } = o;
  const loss = fin.all.net < 0;
  const hasOrders = Array.isArray(orders) && orders.length > 0;
  const hasProducts = Array.isArray(products) && products.length > 0;
  const hasUsers = Array.isArray(users) && users.length > 0;
  const hasAlerts = Array.isArray(alerts) && alerts.length > 0;
  const hasReviews = Array.isArray(reviews) && reviews.length > 0;
  const hasCarts = Array.isArray(carts) && carts.length > 0;
  const hasWishlists = Array.isArray(wishlists) && wishlists.length > 0;
  const hasLedger = Array.isArray(ledger) && ledger.length > 0;
  const hasFinance = hasOrders || hasLedger;

  return (
    <div className="space-y-5">
      <PageHeader
        art="overview"
        title="Overview"
        subtitle={new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · everything in your store'}
        actions={(
          <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {ago && (
              <span className="order-last flex w-full min-w-0 basis-full items-center justify-end gap-1.5 text-xs text-muted" aria-live="polite">
                <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-accent-tone-3' : 'bg-accent-tone-7'}`} />
                {loading ? 'Syncing…' : `Updated ${ago}`}
              </span>
            )}
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              title="Fetch the latest data from the database"
              className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
              <span>{loading ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        )}
      />

      {error && !showAccessWarning && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error} <button type="button" onClick={reload} className="font-medium underline">Try again</button>
        </div>
      )}

      {/* Key numbers: every tile opens its page */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canShowPage('finance') && hasFinance && <><LinkTile to={link('finance')} label="Revenue" value={fin.now.revenue} format={formatCardMoney} hint={`${fin.paidCount} orders with payment received`} appIcon="pkr" sensitive tone={1} delay={0} />
        <LinkTile to={link('finance')} label={loss ? 'Net loss' : 'Net profit'} value={Math.abs(fin.all.net)} format={formatCardMoney} hint={fin.roi == null ? 'add an investment' : `${Math.round(fin.roi)}% return`} appIcon={loss ? 'arrow_trend_down' : 'arrow_trend_up'} sensitive tone={loss ? 4 : 7} delay={40} /></>}
        {canShowPage('orders') && hasOrders && <LinkTile to={link('orders')} label="Pending orders" value={orderStats.pending} hint={`${orderStats.open} open in total`} appIcon="clock" tone={3} delay={80} />}
        {canShowPage('users') && hasUsers && <LinkTile to={link('users')} label="Customers" value={userStats.customers} hint={`${userStats.fresh} new in 30 days`} appIcon="customers" tone={6} delay={120} />}
        {canShowPage('products') && hasProducts && <LinkTile to={link('products')} label="Products in stock" value={productStats.inStock} hint={`${productStats.out} out of stock`} appIcon="boxes" tone={2} delay={160} />}
        {canShowPage('alerts') && hasAlerts && <LinkTile to={link('alerts')} label="Active alerts" value={alertStats.active} hint={`${alertStats.popups} popups`} appIcon="alert" tone={5} delay={200} />}
        {canShowPage('cart-and-wishlist') && (hasCarts || hasWishlists) && <LinkTile to={link('carts')} label="Value in carts" value={fin.demand.cartValue} format={formatCardMoney} hint={`${fin.demand.cartsWithItems} carts with items`} appIcon="cart" sensitive tone={1} delay={240} />}
        {canShowPage('reviews') && hasReviews && <LinkTile to={link('reviews')} label="Reviews to approve" value={reviewStats.pending} hint={reviewStats.average ? `${reviewStats.average.toFixed(1)} / 5 average` : 'no reviews yet'} appIcon="reviews" tone={4} delay={280} />}
      </div>

      <div className={grid}>
        {canShowPage('finance') && hasFinance && (
          <OverviewCard to={link('finance')} cta="Finance" title="Revenue trend" subtitle="Payment received, last 12 months" appIcon="histogram" tone={1} className="lg:col-span-2">
            <TrendGraph data={fin.months.map((m) => ({ label: m.label, value: m.revenue }))} color="var(--accent-tone-1)" format={short} />
          </OverviewCard>
        )}
        {canShowPage('orders') && hasOrders && (
          <OverviewCard to={link('orders')} cta="Orders" title="Orders per day" subtitle="Last 6 months" appIcon="clock" tone={2} delay={80} className="lg:col-span-2">
            <HeatmapCalendar data={fin.ordersHeat} weeks={26} label="orders" />
          </OverviewCard>
        )}
      </div>

      {/* One card per section */}
      <div className={grid}>
        {canShowPage('orders') && hasOrders && <OverviewCard to={link('orders')} cta="All orders" title="Orders" subtitle={`${orderStats.total} in total`} appIcon="list" tone={1} className="lg:col-span-2">
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
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted">Recent orders</p>
                <Link to={link('orders')} className="text-xs font-medium text-accent hover:underline">See all ({orderStats.total})</Link>
              </div>
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
              {orderStats.total > orderStats.recent.length && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-surface-alt/60 px-3 py-2">
                  <span className="text-xs text-muted">{orderStats.pending} pending</span>
                  <Link to={link('orders')} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                    View all orders <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </OverviewCard>}

        {canShowPage('products') && hasProducts && <OverviewCard to={link('products')} cta="Products" title="Products" subtitle={`${productStats.total} in the store`} appIcon="boxes" tone={2} delay={80}>
          <Mini items={[
            { label: 'In stock', value: productStats.inStock, tone: 2 },
            { label: 'Out of stock', value: productStats.out, tone: 4 },
            { label: 'Running low', value: productStats.low, tone: 3 },
          ]} />
          <BarChart data={colored(productStats.byCategory.slice(0, 6))} empty="No products yet." />
        </OverviewCard>}

        {canShowPage('users') && hasUsers && <OverviewCard to={link('users')} cta="Users" title="Customers" subtitle="New sign-ups, last 6 months" appIcon="customers" tone={6} delay={160}>
          <Mini items={[
            { label: 'Accounts', value: userStats.total, tone: 6 },
            { label: 'New', value: userStats.fresh, tone: 7 },
            { label: 'Blocked', value: userStats.blocked, tone: 4 },
          ]} />
          <TrendGraph data={userStats.signups.map((s) => ({ label: s.label, value: s.value }))} color="var(--accent-tone-6)" />
        </OverviewCard>}

        {canShowPage('alerts') && hasAlerts && <OverviewCard to={link('alerts')} cta="Alerts" title="Alerts" subtitle={`${alertStats.total} created · ${Math.round(alertStats.seenRate)}% seen`} appIcon="alert" tone={5} delay={240}>
          <Mini items={[
            { label: 'Active', value: alertStats.active, tone: 5 },
            { label: 'Scheduled', value: alertStats.scheduled, tone: 3 },
            { label: 'Popups', value: alertStats.popups, tone: 6 },
          ]} />
          <Donut centerLabel="alerts" data={colored(alertStats.byState.map((d) => ({ ...d, label: cap(d.label) })))} empty="No alerts yet." />
        </OverviewCard>}

        {canShowPage('cart-and-wishlist') && (hasCarts || hasWishlists) && <OverviewCard to={link('carts')} cta="Carts & wishlists" title="Carts & wishlists" subtitle="What shoppers are about to buy" appIcon="cart" tone={3} delay={320}>
          <Mini items={[
            { label: 'Carts', value: fin.demand.cartsWithItems, tone: 1 },
            { label: 'In carts', value: fin.demand.cartValue, format: formatCardMoney, tone: 7 },
            { label: 'Wishlisted', value: fin.demand.wishTotal, tone: 4 },
          ]} />
          <BarChart data={fin.demand.topCarted.slice(0, 5).map((l) => ({ label: l.name, value: l.carts, hint: `${l.qty} pcs` }))} empty="No carts yet." />
        </OverviewCard>}

        {canShowPage('finance') && hasFinance && <OverviewCard to={link('finance')} cta="Finance" title="Finance" subtitle="Net profit per month, below the line = loss" appIcon="wallet" tone={7} delay={400} className="lg:col-span-2">
          <Mini items={[
            { label: 'Cash in hand', value: fin.cash, format: formatCardMoney, tone: fin.cash < 0 ? 4 : 2 },
            { label: 'Invested', value: fin.all.invested, format: formatCardMoney, tone: 6 },
            { label: 'Expenses', value: fin.now.opex, format: formatCardMoney, tone: 4 },
          ]} />
          <TrendGraph data={fin.months.map((m) => ({ label: m.label, value: m.profit }))} color="var(--accent-tone-7)" format={short} />
        </OverviewCard>}

        {canShowPage('reviews') && hasReviews && <OverviewCard to={link('reviews')} cta="All reviews" title="Reviews" subtitle={`${reviewStats.total} in total`} appIcon="reviews" tone={4} delay={480} className="lg:col-span-2">
          <Mini items={[
            { label: 'To approve', value: reviewStats.pending, tone: 3 },
            { label: 'Average rating', value: reviewStats.average ? `${reviewStats.average.toFixed(1)} / 5` : '—', tone: 7 },
            { label: 'Approved 5★', value: reviewStats.stars[4].value, tone: 1 },
          ]} />
          <BarChart orientation="vertical" height={150} data={reviewStats.stars.map((s, i) => ({ ...s, color: `var(--accent-tone-${[4, 3, 8, 5, 7][i]})` }))} format={(n) => n} empty="No approved reviews yet." />
        </OverviewCard>}
      </div>

      {/* Quick links */}
      <nav aria-label="Admin pages" className="flex flex-wrap gap-2 pt-1">
        {[
          ['orders', 'Orders', ShoppingBag, 1], ['products', 'Products', Boxes, 2], ['users', 'Users', Users, 6], ['alerts', 'Alerts', Bell, 5],
          ['carts', 'Carts & wishlists', Heart, 4], ['reviews', 'Reviews', Star, 3], ['finance', 'Finance', Wallet, 7], ['settings', 'Settings', Settings, 8],
        ].map(([to, label, Icon, tone]) => {
          const pageKey = to === 'carts' ? 'cart-and-wishlist' : to;
          if (!canShowPage(pageKey) && pageKey !== 'settings') return null;
          return (
            <Link
              key={to}
              to={link(to)}
              style={{ '--op': toneVar(tone) }}
              className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-px hover:border-[var(--op)] hover:text-[var(--op)] active:translate-y-0 active:scale-95"
            >
              <Icon size={16} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}