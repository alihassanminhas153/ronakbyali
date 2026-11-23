import PageHeader from '../../../ui/custom/PageHeader';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Boxes, CalendarDays, Clock, Heart, MapPin, RefreshCw, ShoppingCart, Wallet } from 'lucide-react';

import {
  HolderList,
  ProductDemandTable,
  STALE_DAYS,
  useCartWishlist,
} from '../../../components/admin/cart';
import { money } from '../../../components/admin/orders';
import {
  BarChart,
  ChartCard,
  Donut,
  HeatmapCalendar,
  Histogram,
  StatTile,
  TrendGraph,
  compact,
  countByDay,
} from '../../../ui/graphs';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchInput from '../../../ui/custom/input/SearchInput';
import AdminSearchSelect from '../../../components/admin/AdminSearchSelect';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';

const SHOW = 10;

// What each tab can filter and sort by.
const CONFIG = {
  carts: {
    search: 'Search name, phone, city or product',
    filterPlaceholder: 'All carts',
    filters: [
      { value: 'problem', label: 'Has a stock problem' },
      { value: 'low', label: 'Has low stock' },
      { value: 'stale', label: `Idle ${STALE_DAYS}+ days` },
    ],
    sorts: [
      { value: 'recent', label: 'Recently changed' },
      { value: 'value', label: 'Highest value' },
      { value: 'items', label: 'Most items' },
    ],
  },
  wishlists: {
    search: 'Search name, phone, city or product',
    filterPlaceholder: 'All wishlists',
    filters: [
      { value: 'problem', label: 'Has an unavailable product' },
      { value: 'bought', label: 'Already bought something' },
    ],
    sorts: [
      { value: 'recent', label: 'Recently changed' },
      { value: 'saved', label: 'Most saved' },
    ],
  },
  products: {
    search: 'Search product, category or group',
    filterPlaceholder: 'Any stock',
    filters: [
      { value: 'out', label: 'Out of stock' },
      { value: 'short', label: 'Carts want more than is left' },
      { value: 'low', label: 'Low stock' },
      { value: 'removed', label: 'Removed products' },
      { value: 'carted', label: 'In a cart' },
      { value: 'wished', label: 'On a wishlist' },
    ],
    sorts: [
      { value: 'demand', label: 'Most in carts' },
      { value: 'wished', label: 'Most wished for' },
      { value: 'name', label: 'Name A to Z' },
    ],
  },
};

const byUpdated = (a, b) => new Date(b.row.$updatedAt) - new Date(a.row.$updatedAt);

const SORTERS = {
  carts: { recent: byUpdated, value: (a, b) => b.value - a.value, items: (a, b) => b.units - a.units },
  wishlists: { recent: byUpdated, saved: (a, b) => b.saved - a.saved },
  products: {
    demand: (a, b) => b.cartQty - a.cartQty || b.wishes - a.wishes,
    wished: (a, b) => b.wishes - a.wishes || b.cartQty - a.cartQty,
    name: (a, b) => (a.product?.name || '~').localeCompare(b.product?.name || '~'),
  },
};

const FILTERS = {
  carts: { problem: (e) => e.problems > 0, low: (e) => e.low > 0, stale: (e) => e.days >= STALE_DAYS },
  wishlists: { problem: (e) => e.problems > 0, bought: (e) => e.boughtCount > 0 },
  products: {
    out: (d) => d.stock.key === 'out',
    short: (d) => d.stock.key === 'short',
    low: (d) => d.stock.key === 'low',
    removed: (d) => d.stock.key === 'removed',
    carted: (d) => d.cartQty > 0,
    wished: (d) => d.wishes > 0,
  },
};

const has = (q, values) => values.some((v) => String(v || '').toLowerCase().includes(q));

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

// Admin > Carts & wishlists   (/team/:username/cart-and-wishlist)
export default function CartAndWishlist() {
  const data = useCartWishlist();
  const { carts, wishes, demand, stats, charts, loading, error, loadedAt, reload } = data;

  const [tab, setTab] = useState('carts');
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [limit, setLimit] = useState(SHOW);
  const ago = useTimeAgo(loadedAt);

  const cfg = CONFIG[tab];
  useEffect(() => setLimit(SHOW), [tab, term, filter, sort]);

  const changeTab = (id) => {
    setTab(id);
    setFilter('');
    setSort(CONFIG[id]?.sorts[0].value || '');
  };
  // ---- the rows of the current tab, searched, filtered and sorted
  const list = useMemo(() => {
    if (tab === 'insights') return [];
    const q = term.trim().toLowerCase();
    const source = tab === 'carts' ? carts : tab === 'wishlists' ? wishes : demand;
    const match = FILTERS[tab][filter];
    const out = source.filter((e) => {
      if (match && !match(e)) return false;
      if (!q) return true;
      if (tab === 'products') return has(q, [e.product?.name, e.product?.category, e.product?.group, e.product?.slug]);
      return (
        has(q, [e.row.name, e.row.username, e.row.email, e.row.phone, e.row.city]) ||
        e.lines.some((l) => has(q, [l.product?.name]))
      );
    });
    return out.sort(SORTERS[tab][sort] || SORTERS[tab][CONFIG[tab].sorts[0].value]);
  }, [tab, term, filter, sort, carts, wishes, demand]);

  const filtered = Boolean(term.trim() || filter);
  const busy = loading;

  const tabs = [
    { id: 'carts', label: 'Carts', icon: ShoppingCart, color: 'var(--accent-tone-1)', badge: carts.length || undefined },
    { id: 'wishlists', label: 'Wishlists', icon: Heart, color: 'var(--accent-tone-6)', badge: wishes.length || undefined },
    { id: 'products', label: 'Products', icon: Boxes, color: 'var(--accent-tone-2)', badge: demand.length || undefined },
    { id: 'insights', label: 'Insights', icon: Activity, color: 'var(--accent-tone-3)' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        art="cart"
        title="Carts and wishlists"
        subtitle={loading && !loadedAt ? 'Loading…' : (
          <>
            <CountUp value={stats.shoppers} className="font-semibold text-text" /> {stats.shoppers === 1 ? 'cart' : 'carts'} ·{' '}
            <CountUp value={stats.wishers} className="font-semibold text-text" /> {stats.wishers === 1 ? 'wishlist' : 'wishlists'}
          </>
        )}
        actions={(
          <div className="flex items-center gap-3">
            {stats.problemCarts > 0 && (
              <ActionButton
                onClick={() => {
                  setTab('carts');
                  setFilter('problem');
                  setSort('recent');
                }}
              >
                Review problems
              </ActionButton>
            )}
            {ago && (
              <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
                <span className={`h-1.5 w-1.5 rounded-full ${busy ? 'animate-pulse bg-accent-tone-3' : 'bg-accent-tone-7'}`} />
                {busy ? 'Syncing…' : `Updated ${ago}`}
              </span>
            )}
            <button
              type="button"
              onClick={reload}
              disabled={busy}
              title="Fetch the latest carts, wishlists and stock"
              className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
            >
              <RefreshCw size={16} className={busy ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
              <span>{busy ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile appIcon="cart" tone={1} label="Carts with items" value={stats.shoppers} hint={`${stats.units} items in total`} />
        <StatTile
          appIcon="wallet"
          tone={2}
          delay={60}
          label="Value in carts"
          value={stats.value}
          format={(n) => money(n)}
          hint={`${money(stats.staleValue)} idle ${STALE_DAYS}+ days`}
          sensitive
        />
        <StatTile appIcon="alert" tone={4} delay={120} label="Carts with a stock problem" value={stats.problemCarts} hint="Out of stock or not enough left" />
        <StatTile appIcon="popular" tone={6} delay={180} label="Products on wishlists" value={stats.saved} hint={`${stats.conversion}% already bought`} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={changeTab} />

      {error && !loadedAt ? (
        <div role="alert" className="rounded-lg border border-error/40 bg-error/10 p-6 text-center text-sm text-error">
          {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">Try again</button>
        </div>
      ) : loading && !loadedAt ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-alt motion-reduce:animate-none" />)}
        </div>
      ) : tab === 'insights' ? (
        <TabPanel key="insights" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Most in carts" subtitle="Units across every cart" icon={ShoppingCart} tone={1}>
              <BarChart data={charts.topCart} format={(n) => `${n} units`} empty="No carts yet." />
            </ChartCard>
            <ChartCard title="Most wished for" subtitle="Saves across every wishlist" icon={Heart} tone={6} delay={60}>
              <BarChart data={charts.topWish} format={(n) => `${n} saves`} empty="No wishlists yet." />
            </ChartCard>
            <ChartCard title="Stock of held products" subtitle="Products someone has in a cart or wishlist" icon={Boxes} tone={2} delay={120}>
              <Donut data={charts.stockMix} centerLabel="products" empty="No products held yet." />
            </ChartCard>
            <ChartCard title="Wishlist to purchase" subtitle={`${stats.conversion}% of saved products were bought later`} icon={Heart} tone={7} delay={180}>
              <Donut data={charts.wishMix} centerLabel="saves" empty="No wishlists yet." />
            </ChartCard>
            <ChartCard title="Carts by idle time" subtitle="How long since the cart last changed" icon={Clock} tone={3} delay={240}>
              <BarChart data={charts.ages} format={(n) => `${n} ${n === 1 ? 'cart' : 'carts'}`} empty="No carts yet." />
            </ChartCard>
            <ChartCard title="Cart value spread" subtitle="How many carts fall in each value range" icon={Wallet} tone={5} delay={300}>
              <Histogram values={charts.cartValues} bins={6} format={(n) => compact(n)} empty="No carts yet." />
            </ChartCard>
            <ChartCard title="Activity, last 14 days" subtitle="Carts and wishlists changed per day" icon={Activity} tone={1} delay={360}>
              <TrendGraph data={charts.activity} empty="Nothing changed in the last 14 days." />
            </ChartCard>
            <ChartCard title="Where carts come from" subtitle="Cart value by city" icon={MapPin} tone={2} delay={420}>
              <BarChart data={charts.cities} format={(n) => money(n)} empty="No carts yet." />
            </ChartCard>
          </div>
          <ChartCard title="Activity calendar" subtitle="Day each cart or wishlist last changed" icon={CalendarDays} tone={2} delay={480}>
            <HeatmapCalendar data={countByDay(charts.activityRows, (r) => r.$updatedAt)} label="changes" />
          </ChartCard>
        </TabPanel>
      ) : (
        <TabPanel key={tab} className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_14rem_12rem]">
            <SearchInput
              size="sm"
              value={term}
              onSearch={setTerm}
              placeholder={cfg.search}
              label="Search"
              className="sm:col-span-2 lg:col-span-1"
            />
            <AdminSearchSelect
              className="min-w-0"
              aria-label="Filter"
              placeholder={cfg.filterPlaceholder}
              options={cfg.filters}
              value={filter}
              onChange={(v) => setFilter(v || '')}
              clearable
            />
            <AdminSearchSelect
              className="min-w-0"
              aria-label="Sort"
              options={cfg.sorts}
              value={sort}
              onChange={(v) => setSort(v || cfg.sorts[0].value)}
            />
          </div>

          {list.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl font-semibold text-text">
                {filtered ? 'Nothing matches' : tab === 'carts' ? 'No carts with items' : tab === 'wishlists' ? 'No saved products' : 'No products held'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {filtered ? 'Try a different search or clear the filter.' : 'When shoppers add products they will show up here.'}
              </p>
              {filtered && (
                <ActionButton variant="secondary" className="mt-5" onClick={() => { setTerm(''); setFilter(''); }}>
                  Clear filters
                </ActionButton>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted">
                {list.length} {tab === 'products' ? (list.length === 1 ? 'product' : 'products') : list.length === 1 ? 'shopper' : 'shoppers'}
                {filtered ? ' match' : ''}
              </p>
              {tab === 'products' ? (
                <ProductDemandTable rows={list.slice(0, limit)} />
              ) : (
                <HolderList entries={list.slice(0, limit)} kind={tab === 'carts' ? 'cart' : 'wish'} />
              )}
              {list.length > limit && (
                <div className="flex justify-center">
                  <ActionButton variant="secondary" onClick={() => setLimit((n) => n + SHOW)}>
                    Show more ({list.length - limit} left)
                  </ActionButton>
                </div>
              )}
            </>
          )}
        </TabPanel>
      )}
    </div>
  );
}