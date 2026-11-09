import { groupBy, monthlySeries } from '../../../ui/graphs/utils';
import { alertState } from '../../../lib/appwrite/alert';
import { isStaffRole } from '../../../lib/appwrite/user';
import { OPEN_STATUSES, buildFinance } from '../finance/financeMath';

const num = (v) => Number(v) || 0;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const DAY = 864e5;

// Order status -> graph colour number (used by the donut and the badges)
export const STATUS_TONE = { pending: 3, confirmed: 5, processing: 1, shipped: 6, delivered: 7, cancelled: 4, returned: 8 };

export function buildOverview({ orders, products, users, alerts, reviews, carts, wishlists, ledger }) {
  const fin = buildFinance({ orders, products, carts, wishlists, ledger }, '30d');
  const now = Date.now();

  /* orders */
  const count = (s) => orders.filter((o) => o.status === s).length;
  const recentOrders = [...orders].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt)).slice(0, 5);
  const orderStats = {
    total: orders.length,
    pending: count('pending'),
    open: orders.filter((o) => OPEN_STATUSES.includes(o.status)).length,
    delivered: count('delivered'),
    byStatus: groupBy(orders, (o) => o.status),
    recent: recentOrders,
  };

  /* products */
  const inStock = products.filter((p) => num(p.remaining) > 0);
  const out = products.filter((p) => !(num(p.remaining) > 0));
  const productStats = {
    total: products.length,
    inStock: inStock.length,
    out: out.length,
    low: inStock.filter((p) => num(p.remaining) <= 5).length,
    byCategory: groupBy(products, (p) => p.category),
  };

  /* users */
  const userStats = {
    total: users.length,
    customers: users.filter((u) => !isStaffRole(u.role)).length,
    staff: users.filter((u) => isStaffRole(u.role)).length,
    blocked: users.filter((u) => u.isBlocked).length,
    fresh: users.filter((u) => now - new Date(u.$createdAt).getTime() <= 30 * DAY).length,
    signups: monthlySeries(users, (u) => u.$createdAt, 6),
  };

  /* alerts */
  const states = alerts.map((a) => alertState(a));
  const impressions = alerts.reduce((s, a) => s + num(a.impressions), 0);
  const seen = alerts.reduce((s, a) => s + num(a.seenCount), 0);
  const alertStats = {
    total: alerts.length,
    active: states.filter((s) => s === 'active').length,
    scheduled: states.filter((s) => s === 'scheduled').length,
    popups: alerts.filter((a, i) => a.popup && states[i] === 'active').length,
    byState: groupBy(states, (s) => s),
    seenRate: impressions ? (seen / impressions) * 100 : 0,
  };

  /* reviews */
  const approved = reviews.filter((r) => r.status === 'approved');
  const reviewStats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    average: approved.length ? approved.reduce((s, r) => s + num(r.rating), 0) / approved.length : 0,
    stars: [1, 2, 3, 4, 5].map((n) => ({ label: `${n}★`, value: approved.filter((r) => num(r.rating) === n).length })),
  };

  /* things that need the admin */
  const attention = [
    { key: 'orders', count: orderStats.pending, to: 'orders', tone: 3, text: `${plural(orderStats.pending, 'order', 'orders')} waiting to be confirmed` },
    { key: 'reviews', count: reviewStats.pending, to: 'reviews', tone: 4, text: `${plural(reviewStats.pending, 'review', 'reviews')} to approve` },
    { key: 'out', count: productStats.out, to: 'products', tone: 4, text: `${plural(productStats.out, 'product', 'products')} out of stock` },
    { key: 'wanted', count: fin.demand.wanted.length, to: 'carts', tone: 6, text: `${plural(fin.demand.wanted.length, 'sold-out product', 'sold-out products')} shoppers want` },
    { key: 'cost', count: fin.noCostProducts.length, to: 'finance', tone: 3, text: `${plural(fin.noCostProducts.length, 'product', 'products')} missing a cost price` },
  ].filter((a) => a.count > 0);

  return { fin, orderStats, productStats, userStats, alertStats, reviewStats, attention };
}