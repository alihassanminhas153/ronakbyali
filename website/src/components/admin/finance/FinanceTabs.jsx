import { useState } from 'react';
import {
  BarChart3, CalendarDays, Check, Coins, Flame, Heart, LineChart, PackagePlus, PackageX, PieChart, Receipt,
  ShoppingCart, TrendingDown, TrendingUp, Truck, Wallet, X, Percent, Layers, TriangleAlert, Trophy,
} from 'lucide-react';

import productService from '../../../lib/appwrite/product';
import {
  BarChart, ChartCard, Donut, HeatmapCalendar, Histogram, StatTile, TrendGraph, colorFor, compact,
} from '../../../ui/graphs';
import { inputCls } from '../../../ui/custom/input/FormField';
import { rs } from './financeSchema';

const grid = 'grid gap-4 lg:grid-cols-2';
const tiles = 'grid grid-cols-2 gap-3 lg:grid-cols-4';
const financeTiles = 'grid min-w-[58rem] grid-cols-4 grid-rows-3 gap-3';
const rsFmt = (n) => rs(n);
const rsShort = (n) => `Rs ${compact(n)}`;
const pct = (n) => `${Math.round(n)}%`;
const colored = (data) => data.map((d) => ({ ...d, color: colorFor(d.label) }));
const PAY_LABEL = { cod: 'Cash on delivery', bank_transfer: 'Bank transfer', card: 'Card', easypaisa: 'Easypaisa', jazzcash: 'JazzCash', unknown: 'Not set' };
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/* ------------------------------------------------------------------ */
/* Overview: profit, loss, investment, trends                          */
/* ------------------------------------------------------------------ */
export function OverviewTab({ m }) {
  const { now, all } = m;
  const loss = now.net < 0;
  const split = [
    { label: 'Cost of goods', value: Math.max(0, now.cogs), color: 'var(--graph-3)' },
    { label: 'Expenses', value: Math.max(0, now.opex), color: 'var(--graph-4)' },
    { label: 'Net profit', value: Math.max(0, now.net), color: 'var(--graph-7)' },
  ];
  return (
    <div className="space-y-4">
      <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:-mx-5 sm:px-5" role="region" aria-label="Finance summary metrics" tabIndex={0}>
        <div className={financeTiles}>
          <StatTile label={`Revenue (${m.period.label})`} value={now.revenue} format={rsShort} hint={`${m.paidCount} orders with payment received`} appIcon="pkr" sensitive tone={1} delay={0} />
          <StatTile label="Gross profit" value={now.gross} format={rsShort} hint="revenue minus cost of goods" appIcon="coins" sensitive tone={2} delay={40} />
          <StatTile label="Operating expenses" value={now.opex} format={rsShort} hint="ads, courier, rent…" appIcon="wallet" sensitive tone={4} delay={80} />
          <StatTile
            label={loss ? 'Net loss' : 'Net profit'}
            value={Math.abs(now.net)}
            format={rsShort}
            hint={now.revenue ? `${Math.round(m.margin)}% margin` : 'no sales yet'}
            appIcon={loss ? 'arrow_trend_down' : 'arrow_trend_up'}
            sensitive
            tone={loss ? 4 : 7}
            delay={120}
          />
          <StatTile label="Total investment" value={all.invested} format={rsShort} hint={m.recovered == null ? 'add one in the ledger' : `${Math.round(m.recovered)}% recovered`} appIcon="coins" sensitive tone={6} delay={160} />
          <StatTile label={`Withdrawn (${m.period.label})`} value={now.withdrawn} format={rsShort} appIcon="wallet" sensitive tone={3} delay={200} />
          <StatTile label="Return on investment" value={m.roi == null ? '—' : m.roi} format={pct} hint="all-time net profit / investment" appIcon="arrow_trend_up" tone={5} delay={240} />
          <StatTile label="Cash in hand (estimate)" value={m.cash} format={rsShort} hint="after stock bought and withdrawals" appIcon="wallet" sensitive tone={m.cash < 0 ? 4 : 2} delay={280} />
          <StatTile label="Orders on the way" value={m.pipelineValue} format={rsShort} hint={`${m.pipelineCount} open orders`} appIcon="clock" sensitive tone={5} delay={320} />
          <StatTile label="Lost to cancels & returns" value={m.lostValue} format={rsShort} appIcon="alert" sensitive tone={4} delay={360} />
          <StatTile label={`Other income (${m.period.label})`} value={now.income} format={rsShort} appIcon="coins" sensitive tone={7} delay={400} />
          <StatTile label={`Stock bought (${m.period.label})`} value={now.stockSpend} format={rsShort} appIcon="single_box" sensitive tone={3} delay={440} />
        </div>
      </div>

      <div className={grid}>
        <ChartCard title="Revenue trend" subtitle="Payments received, last 12 months" icon={LineChart} tone={1}>
          <TrendGraph data={m.months.map((x) => ({ label: x.label, value: x.revenue }))} color="var(--graph-1)" format={rsShort} />
        </ChartCard>
        <ChartCard title="Profit and loss" subtitle="Net per month, below the line = loss" icon={loss ? TrendingDown : TrendingUp} tone={loss ? 4 : 7} delay={80}>
          <TrendGraph data={m.months.map((x) => ({ label: x.label, value: x.profit }))} color="var(--graph-7)" format={rsShort} />
        </ChartCard>
        <ChartCard title="Where the money goes" subtitle={loss ? 'You spent more than you earned this period' : `Share of revenue, ${m.period.label}`} icon={PieChart} tone={3} delay={160}>
          <Donut data={split} centerLabel="costs + profit" format={rsShort} empty="No payments received in this period." />
        </ChartCard>
        <ChartCard title="Orders per day" subtitle="Last 6 months (cancelled and returned left out)" icon={CalendarDays} tone={2} delay={240}>
          <HeatmapCalendar data={m.ordersHeat} weeks={26} label="orders" />
        </ChartCard>
        <ChartCard title="Expenses by category" subtitle={m.period.label} icon={Receipt} tone={4} delay={320}>
          <BarChart data={colored(m.expenseByCategory.slice(0, 8))} format={rsShort} empty="No expenses recorded." />
        </ChartCard>
        <ChartCard title="Revenue by payment method" subtitle={m.period.label} icon={Wallet} tone={5} delay={400}>
          <Donut data={colored(m.revenueByPayment.map((d) => ({ ...d, label: PAY_LABEL[d.label] || d.label })))} centerLabel="revenue" format={rsShort} empty="No payments received yet." />
        </ChartCard>
        <ChartCard title="Order status" subtitle={`All orders, ${m.period.label}`} icon={Truck} tone={6} delay={480}>
          <Donut data={colored(m.ordersByStatus.map((d) => ({ ...d, label: cap(d.label) })))} centerLabel="orders" empty="No orders yet." />
        </ChartCard>
        <ChartCard title="Order value" subtitle="Amounts received per order (Rs)" icon={BarChart3} tone={3} delay={560}>
          <Histogram values={m.orderValues} bins={6} format={(n) => compact(n)} empty="No payments received yet." />
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inventory: what is in stock and what it is worth                    */
/* ------------------------------------------------------------------ */
function Thumb({ product }) {
  const url = productService.getMainImageUrl(product);
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-alt text-muted">
      {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <PackageX size={16} />}
    </span>
  );
}

// rows: [{ product, note }]
function ProductList({ rows, onRestock, empty }) {
  if (!rows.length) return <div className="grid h-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted">{empty}</div>;
  return (
    <ul className="divide-y divide-border">
      {rows.map(({ product, note }, i) => (
        <li key={product.$id} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} className="animate-rise flex items-center gap-3 py-2.5">
          <Thumb product={product} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{product.name}</p>
            <p className="truncate text-xs text-muted">{note}</p>
          </div>
          <button type="button" onClick={() => onRestock(product)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-text transition-all hover:border-graph-2 hover:bg-graph-2/10 hover:text-graph-2 active:scale-95">
            <PackagePlus size={14} />
            Restock
          </button>
        </li>
      ))}
    </ul>
  );
}

export function InventoryTab({ m, onRestock }) {
  const inv = m.inventory;
  const needs = [...inv.outOfStock, ...inv.inStock.filter((p) => Number(p.remaining) <= 5)]
    .sort((a, b) => (Number(a.remaining) || 0) - (Number(b.remaining) || 0))
    .slice(0, 10)
    .map((p) => ({ product: p, note: Number(p.remaining) > 0 ? `${p.remaining} left` : 'Out of stock' }));
  const total = inv.inStock.length + inv.outOfStock.length;
  return (
    <div className="space-y-4">
      <div className={tiles}>
        <StatTile label="Products in stock" value={inv.inStock.length} hint={`of ${total} products`} appIcon="boxes" tone={2} delay={0} />
        <StatTile label="Out of stock" value={inv.outOfStock.length} appIcon="single_box" tone={4} delay={40} />
        <StatTile label="Stock value (cost)" value={inv.stockCost} format={rsShort} hint="what you paid for it" appIcon="pkr" sensitive tone={3} delay={80} />
        <StatTile label="Stock value (selling)" value={inv.stockRetail} format={rsShort} hint={`potential profit ${rsShort(inv.stockRetail - inv.stockCost)}`} appIcon="arrow_trend_up" sensitive tone={7} delay={120} />
      </div>
      <div className={grid}>
        <ChartCard title="Stock status" subtitle="Products in and out of stock" icon={PieChart} tone={2}>
          <Donut
            centerLabel="products"
            data={[
              { label: 'In stock', value: inv.inStock.length, color: 'var(--graph-2)' },
              { label: 'Out of stock', value: inv.outOfStock.length, color: 'var(--graph-4)' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Stock value by category" subtitle="Selling price x units left" icon={BarChart3} tone={6} delay={80}>
          <BarChart data={colored(inv.valueByCategory.slice(0, 8))} format={rsShort} empty="No stock yet." />
        </ChartCard>
        <ChartCard title="Units left per product" subtitle="How many products hold how many units" icon={Layers} tone={5} delay={160}>
          <Histogram values={inv.inStock.map((p) => Number(p.remaining) || 0)} bins={6} format={(n) => compact(n)} empty="Nothing in stock." />
        </ChartCard>
        <ChartCard title="Needs restocking" subtitle="Out of stock or 5 units or fewer" icon={TriangleAlert} tone={3} delay={240}>
          <ProductList rows={needs} onRestock={onRestock} empty="Everything is well stocked." />
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demand: carts and wishlists                                         */
/* ------------------------------------------------------------------ */
export function DemandTab({ m, onRestock }) {
  const d = m.demand;
  const wanted = d.wanted.slice(0, 10).map((w) => ({ product: w.product, note: `${w.carts} in carts · ${w.wishes} wishlisted` }));
  return (
    <div className="space-y-4">
      <div className={tiles}>
        <StatTile label="Carts with items" value={d.cartsWithItems} appIcon="cart" tone={1} delay={0} />
        <StatTile label="Value waiting in carts" value={d.cartValue} format={rsShort} hint="at today's prices" appIcon="pkr" sensitive tone={7} delay={40} />
        <StatTile label="Wishlisted items" value={d.wishTotal} appIcon="popular" tone={4} delay={80} />
        <StatTile label="Wanted but out of stock" value={d.wanted.length} hint="lost sales waiting" appIcon="alert" tone={3} delay={120} />
      </div>
      <div className={grid}>
        <ChartCard title="Most in carts" subtitle="Number of carts holding the product" icon={ShoppingCart} tone={1}>
          <BarChart data={d.topCarted.slice(0, 8).map((l) => ({ label: l.name, value: l.carts, hint: `${l.qty} pcs` }))} empty="No carts yet." />
        </ChartCard>
        <ChartCard title="Most wishlisted" subtitle="Number of wishlists with the product" icon={Heart} tone={4} delay={80}>
          <BarChart data={d.topWished.slice(0, 8).map((l) => ({ label: l.name, value: l.count }))} empty="No wishlists yet." />
        </ChartCard>
        <ChartCard title="Cart value by category" subtitle="What shoppers are about to buy" icon={PieChart} tone={6} delay={160}>
          <Donut data={colored(d.cartValueByCategory)} centerLabel="in carts" format={rsShort} empty="No carts yet." />
        </ChartCard>
        <ChartCard title="Shopper activity" subtitle="Carts and wishlists updated per day" icon={Flame} tone={2} delay={240}>
          <HeatmapCalendar data={d.heat} weeks={26} label="updates" />
        </ChartCard>
        <ChartCard title="Wanted but out of stock" subtitle="Restock these first" icon={TriangleAlert} tone={3} delay={320} className="lg:col-span-2">
          <ProductList rows={wanted} onRestock={onRestock} empty="No out-of-stock product is being asked for." />
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profit per product                                                  */
/* ------------------------------------------------------------------ */
function CostEditor({ product, onSaved }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    const n = Number(value);
    if (!(n > 0)) { setErr('Enter a cost above 0'); return; }
    setBusy(true);
    const ok = await productService.updateProduct(product.$id, { costPrice: n });
    setBusy(false);
    if (!ok) { setErr('Could not save'); return; }
    setOpen(false);
    onSaved?.();
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-9 shrink-0 rounded-md border border-border px-3 text-xs font-medium text-text transition-all hover:border-graph-3 hover:bg-graph-3/10 hover:text-graph-3 active:scale-95">
        Set cost
      </button>
    );
  }
  return (
    <div className="animate-rise flex shrink-0 items-center gap-1.5">
      <input
        autoFocus
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onChange={(e) => { setValue(e.target.value); setErr(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') setOpen(false); }}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="Rs"
        aria-label={`Cost price of ${product.name}`}
        className={`${inputCls(err)} min-h-9! w-24 px-2!`}
      />
      <button type="button" onClick={save} disabled={busy} aria-label="Save cost" className="grid h-9 w-9 place-items-center rounded-md bg-graph-7/15 text-graph-7 transition-all hover:bg-graph-7/25 active:scale-95 disabled:opacity-60"><Check size={16} /></button>
      <button type="button" onClick={() => setOpen(false)} aria-label="Cancel" className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text"><X size={16} /></button>
    </div>
  );
}

export function ProfitTab({ m, onChanged }) {
  const rows = m.productProfit;
  const losers = rows.filter((r) => r.profit < 0);
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));
  return (
    <div className="space-y-4">
      <div className={tiles}>
        <StatTile label="Products sold" value={rows.length} hint={m.period.label} appIcon="cart" tone={1} delay={0} />
        <StatTile label="Best product" value={rows[0] ? rows[0].name : '—'} hint={rows[0] ? `${rsShort(rows[0].profit)} profit` : undefined} appIcon="trophy" tone={7} delay={40} />
        <StatTile label="Selling at a loss" value={losers.length} appIcon="arrow_trend_down" tone={4} delay={80} />
        <StatTile label="Missing cost price" value={m.noCostProducts.length} hint="profit looks too high" appIcon="alert" tone={3} delay={120} />
      </div>

      <div className={grid}>
        <ChartCard title="Most profitable" subtitle={`Profit per product, ${m.period.label}`} icon={Trophy} tone={7}>
          <BarChart data={rows.filter((r) => r.profit > 0).slice(0, 8).map((r) => ({ label: r.name, value: r.profit, hint: `${r.units} sold` }))} format={rsShort} empty="No profitable sales yet." />
        </ChartCard>
        <ChartCard title="Lowest margin" subtitle="Profit as % of the selling price" icon={Percent} tone={4} delay={80}>
          <BarChart data={[...rows].sort((a, b) => a.margin - b.margin).slice(0, 8).map((r) => ({ label: r.name, value: Math.max(0, Math.round(r.margin)), hint: r.margin < 0 ? 'loss' : undefined }))} format={(n) => `${n}%`} empty="No sales yet." />
        </ChartCard>
        <ChartCard title="Margin spread" subtitle="How many products sit in each margin range (%)" icon={BarChart3} tone={5} delay={160}>
          <Histogram values={rows.map((r) => Math.round(r.margin))} bins={6} format={(n) => `${Math.round(n)}%`} empty="No sales yet." />
        </ChartCard>
        <ChartCard title="Add missing cost prices" subtitle="Needed for correct profit" icon={TriangleAlert} tone={3} delay={240}>
          {m.noCostProducts.length === 0 ? (
            <div className="grid h-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted">Every product has a cost price.</div>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {m.noCostProducts.slice(0, 30).map((p) => (
                <li key={p.$id} className="flex items-center gap-3 py-2.5">
                  <Thumb product={p} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{p.name}</p>
                    <p className="truncate text-xs text-muted">Sells for {rs(p.price)}</p>
                  </div>
                  <CostEditor product={p} onSaved={onChanged} />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Profit by product" subtitle={`Everything sold in ${m.period.label}`} icon={Coins} tone={2} delay={320}>
        {rows.length === 0 ? (
          <div className="grid h-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted">No payments received in this period.</div>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[34rem] text-left">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">Sold</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                  <th className="w-40 pb-2 pl-4 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 25).map((r, i) => (
                  <tr key={r.id} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} className="animate-rise transition-colors hover:bg-surface-alt/50">
                    <td className="max-w-56 truncate py-2.5 text-sm text-text">{r.name}</td>
                    <td className="py-2.5 text-right text-sm tabular-nums text-muted">{r.units}</td>
                    <td className="py-2.5 text-right text-sm tabular-nums text-text">{rsShort(r.revenue)}</td>
                    <td className="py-2.5 text-right text-sm tabular-nums text-muted">{rsShort(r.cost)}</td>
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(Math.abs(r.profit) / maxAbs) * 100}%`, background: r.profit < 0 ? 'var(--graph-4)' : 'var(--graph-7)' }} />
                        </div>
                        <span className="w-16 text-right text-xs font-medium tabular-nums" style={{ color: r.profit < 0 ? 'var(--graph-4)' : 'var(--graph-7)' }}>{rsShort(r.profit)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}