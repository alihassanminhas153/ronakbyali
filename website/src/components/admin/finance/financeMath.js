import { countByDay, groupBy } from '../../../ui/graphs/utils';
import { paidAmountForOrder } from '../../../lib/orderMath';
import { STOCK_CATEGORY } from './financeSchema';

// All the money maths in one place (pure functions, no Appwrite calls).
//
//   Revenue        = amounts actually received for paid / partially paid orders
//   Cost of goods  = quantity sold x the product's cost price
//   Gross profit   = Revenue - Cost of goods
//   Net profit     = Gross profit + other income - operating expenses   (negative = loss)
//   Cash in hand   = investments + revenue + other income - ALL expenses (incl. stock bought) - withdrawals
export const PERIODS = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '1y', label: '1 year', days: 365 },
  { id: 'all', label: 'All time', days: 0 },
];

const num = (v) => Number(v) || 0;
const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
const DAY = 864e5;
export const OPEN_STATUSES = ['pending', 'confirmed', 'processing', 'shipped'];
export const LOST_STATUSES = ['cancelled', 'returned'];

export function parseItems(row) {
  try {
    const list = JSON.parse(row?.items || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const monthKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}`;
};

export function buildFinance({ orders = [], products = [], carts = [], wishlists = [], ledger = [] }, periodId = '30d') {
  const period = PERIODS.find((p) => p.id === periodId) || PERIODS[1];
  const from = period.days ? Date.now() - period.days * DAY : 0;
  const inRange = (iso) => !from || new Date(iso).getTime() >= from;
  const byId = new Map(products.map((p) => [p.$id, p]));

  /* ---------- sales ---------- */
  const costOf = (o) => sum(parseItems(o), (it) => num(byId.get(it.productId)?.costPrice) * num(it.quantity));
  const sold = orders
    .filter((o) => paidAmountForOrder(o) > 0)
    .map((o) => ({
      o,
      date: o.$updatedAt || o.$createdAt,
      revenue: paidAmountForOrder(o),
      cost: o.status === 'delivered' ? costOf(o) : 0,
    }));

  const calc = (soldSet, ledgerSet) => {
    const revenue = sum(soldSet, (s) => s.revenue);
    const cogs = sum(soldSet, (s) => s.cost);
    const exp = ledgerSet.filter((e) => e.type === 'expense');
    const opex = sum(exp.filter((e) => e.category !== STOCK_CATEGORY), (e) => num(e.amount));
    const stockSpend = sum(exp.filter((e) => e.category === STOCK_CATEGORY), (e) => num(e.amount));
    const income = sum(ledgerSet.filter((e) => e.type === 'income'), (e) => num(e.amount));
    const withdrawn = sum(ledgerSet.filter((e) => e.type === 'withdrawal'), (e) => num(e.amount));
    const invested = sum(ledgerSet.filter((e) => e.type === 'investment'), (e) => num(e.amount));
    const gross = revenue - cogs;
    return { revenue, cogs, gross, opex, stockSpend, income, withdrawn, invested, net: gross + income - opex };
  };

  const soldNow = sold.filter((s) => inRange(s.date));
  const ledgerNow = ledger.filter((e) => inRange(e.date));
  const now = calc(soldNow, ledgerNow);
  const all = calc(sold, ledger);
  const cash = all.invested + all.revenue + all.income - all.opex - all.stockSpend - all.withdrawn;
  const roi = all.invested > 0 ? (all.net / all.invested) * 100 : null;
  const recovered = all.invested > 0 ? Math.max(0, Math.min(100, ((all.net + all.withdrawn) / all.invested) * 100)) : null;

  /* ---------- per product ---------- */
  const perProduct = new Map();
  const missingCost = new Set();
  soldNow.forEach(({ o }) => {
    parseItems(o).forEach((it) => {
      const p = byId.get(it.productId);
      const qty = num(it.quantity);
      const cost = num(p?.costPrice);
      if (p && !(cost > 0)) missingCost.add(p.$id);
      const row = perProduct.get(it.productId) || {
        id: it.productId, name: it.name || p?.name || 'Removed product', category: p?.category || '-', units: 0, revenue: 0, cost: 0,
      };
      row.units += qty;
      row.revenue += num(it.price) * qty;
      row.cost += cost * qty;
      perProduct.set(it.productId, row);
    });
  });
  const productProfit = [...perProduct.values()]
    .map((r) => ({ ...r, profit: r.revenue - r.cost, margin: r.revenue ? ((r.revenue - r.cost) / r.revenue) * 100 : 0 }))
    .sort((a, b) => b.profit - a.profit);
  const noCostProducts = products.filter((p) => !(num(p.costPrice) > 0));

  /* ---------- last 12 months ---------- */
  const months = [];
  const now0 = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now0.getFullYear(), now0.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d.toLocaleString('en', { month: 'short' }), revenue: 0, expenses: 0, profit: 0 });
  }
  const mIndex = new Map(months.map((m) => [m.key, m]));
  sold.forEach((s) => {
    const m = mIndex.get(monthKey(s.date));
    if (m) { m.revenue += s.revenue; m.profit += s.revenue - s.cost; }
  });
  ledger.forEach((e) => {
    const m = mIndex.get(monthKey(e.date));
    if (!m) return;
    if (e.type === 'expense' && e.category !== STOCK_CATEGORY) { m.expenses += num(e.amount); m.profit -= num(e.amount); }
    if (e.type === 'income') m.profit += num(e.amount);
  });

  /* ---------- order breakdowns ---------- */
  const ordersNow = orders.filter((o) => inRange(o.$createdAt));
  const lostValue = sum(ordersNow.filter((o) => LOST_STATUSES.includes(o.status)), (o) => num(o.total));
  const pipeline = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const pipelineValue = sum(pipeline, (o) => num(o.total));

  /* ---------- inventory ---------- */
  const inStock = products.filter((p) => num(p.remaining) > 0);
  const outOfStock = products.filter((p) => !(num(p.remaining) > 0));
  const stockCost = sum(inStock, (p) => num(p.remaining) * num(p.costPrice));
  const stockRetail = sum(inStock, (p) => num(p.remaining) * num(p.price));

  /* ---------- demand (carts + wishlists) ---------- */
  const cartMap = new Map();
  carts.forEach((c) => {
    const seen = new Set();
    parseItems(c).forEach((it) => {
      const m = cartMap.get(it.productId) || { carts: 0, qty: 0 };
      if (!seen.has(it.productId)) { m.carts += 1; seen.add(it.productId); }
      m.qty += num(it.quantity);
      cartMap.set(it.productId, m);
    });
  });
  const wishMap = new Map();
  wishlists.forEach((w) => (w.productIds || []).forEach((id) => wishMap.set(id, (wishMap.get(id) || 0) + 1)));

  const nameOf = (id) => byId.get(id)?.name || 'Removed product';
  const cartLines = [...cartMap.entries()].map(([id, m]) => ({ id, name: nameOf(id), ...m, product: byId.get(id) }));
  const cartValue = sum(cartLines, (l) => l.qty * num(l.product?.price));
  const wishLines = [...wishMap.entries()].map(([id, count]) => ({ id, name: nameOf(id), count, product: byId.get(id) }));
  const wanted = products
    .filter((p) => !(num(p.remaining) > 0))
    .map((p) => ({ product: p, carts: cartMap.get(p.$id)?.carts || 0, wishes: wishMap.get(p.$id) || 0 }))
    .filter((w) => w.carts + w.wishes > 0)
    .sort((a, b) => b.carts + b.wishes - (a.carts + a.wishes));

  return {
    period, now, all, cash, roi, recovered, margin: now.revenue ? (now.net / now.revenue) * 100 : 0,
    paidCount: soldNow.length, lostValue, pipelineValue, pipelineCount: pipeline.length,
    months, productProfit, noCostProducts, missingCostCount: missingCost.size,
    expenseByCategory: groupBy(ledgerNow.filter((e) => e.type === 'expense'), (e) => e.category || 'Uncategorised', (e) => num(e.amount)),
    revenueByPayment: groupBy(soldNow, (s) => s.o.paymentMethod || 'unknown', (s) => s.revenue),
    ordersByStatus: groupBy(ordersNow, (o) => o.status),
    orderValues: soldNow.map((s) => s.revenue),
    ordersHeat: countByDay(orders.filter((o) => !LOST_STATUSES.includes(o.status))),
    inventory: { inStock, outOfStock, stockCost, stockRetail, valueByCategory: groupBy(inStock, (p) => p.category, (p) => num(p.remaining) * num(p.price)) },
    demand: {
      cartsWithItems: carts.filter((c) => num(c.itemCount) > 0).length,
      cartValue, wishTotal: sum(wishlists, (w) => (w.productIds || []).length),
      topCarted: [...cartLines].sort((a, b) => b.carts - a.carts),
      topWished: [...wishLines].sort((a, b) => b.count - a.count),
      cartValueByCategory: groupBy(cartLines, (l) => l.product?.category, (l) => l.qty * num(l.product?.price)),
      wanted,
      heat: countByDay([...carts, ...wishlists].filter((r) => (r.itemCount || 0) > 0), (r) => r.$updatedAt),
    },
  };
}