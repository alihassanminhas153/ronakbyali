import { useCallback, useEffect, useMemo, useState } from 'react';

import cartService from '../../../lib/appwrite/cart';
import wishlistService from '../../../lib/appwrite/wishlist';
import productService from '../../../lib/appwrite/product';
import { toneVar } from '../../../ui/graphs/utils';
import { entityColorStep } from '../../../lib/entityColors';
import { money } from '../orders/orderMeta';

const PAGE = 100;
const MAX_ROWS = 1000; // per table
const CHUNK = 50; // product ids per request
const DAY = 86400000;

export const LOW_STOCK = 5; // "low" at or under this many left
export const STALE_DAYS = 3; // a cart idle this long counts as waiting

const daysSince = (iso) => (iso ? Math.max(0, (Date.now() - new Date(iso).getTime()) / DAY) : 0);

// What state is a product in, for someone holding `qty` of it?
//   ok | low | short (cart wants more than is left) | out | removed (product row is gone)
export function stockOf(product, qty = 0) {
  if (!product) return { key: 'removed', label: 'Removed', tone: entityColorStep('stockStatus', 'removed') };
  const remaining = product.remaining == null ? null : Number(product.remaining);
  if (product.status === 'outOfStock' || (remaining != null && remaining <= 0)) {
    return { key: 'out', label: 'Out of stock', tone: entityColorStep('stockStatus', 'out') };
  }
  if (remaining != null && qty > remaining) return { key: 'short', label: `Only ${remaining} left`, tone: entityColorStep('stockStatus', 'short') };
  if (remaining != null && remaining <= LOW_STOCK) return { key: 'low', label: `Low · ${remaining} left`, tone: entityColorStep('stockStatus', 'low') };
  return { key: 'ok', label: 'In stock', tone: entityColorStep('stockStatus', 'in') };
}
export const isProblem = (stock) => ['out', 'short', 'removed'].includes(stock.key);

async function fetchAll(list) {
  const rows = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const res = await list({ limit: PAGE, offset });
    if (!res) return false;
    rows.push(...res.rows);
    if (rows.length >= res.total || res.rows.length < PAGE) break;
  }
  return rows;
}

async function fetchProducts(ids) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
  const parts = await Promise.all(chunks.map((c) => productService.getProductsByIds(c)));
  const map = {};
  parts.forEach((rows) => {
    if (!Array.isArray(rows)) throw new Error('products');
    rows.forEach((p) => { map[p.$id] = p; });
  });
  return map;
}

const AGE_BUCKETS = [
  { label: 'Today', max: 1 },
  { label: '1–3 days', max: 3 },
  { label: '3–7 days', max: 7 },
  { label: '1–4 weeks', max: 30 },
  { label: 'Older', max: Infinity },
];

// Loads every cart and wishlist row (up to 1000 each) plus the CURRENT product rows,
// then works out everything the page shows.
export default function useCartWishlist() {
  const [raw, setRaw] = useState({ carts: [], wishes: [], products: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [carts, wishes] = await Promise.all([
        fetchAll((a) => cartService.listCarts(a)),
        fetchAll((a) => wishlistService.listWishlists(a)),
      ]);
      if (!carts || !wishes) throw new Error('rows');
      const ids = new Set();
      carts.forEach((r) => cartService.parseItems(r).forEach((i) => i.productId && ids.add(i.productId)));
      wishes.forEach((r) => (r.productIds || []).forEach((id) => ids.add(id)));
      const products = await fetchProducts([...ids]);
      setRaw({ carts, wishes, products });
      setLoadedAt(new Date());
    } catch {
      setError('Could not load carts and wishlists. Check that the admin team has Read permission on both tables.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const derived = useMemo(() => {
    const { products } = raw;

    // ---- carts (only rows that hold something)
    const carts = raw.carts
      .map((row) => {
        const lines = cartService
          .parseItems(row)
          .map((i) => {
            const product = products[i.productId] || null;
            const quantity = Number(i.quantity) || 0;
            return { ...i, quantity, product, price: Number(product?.price) || 0, stock: stockOf(product, quantity) };
          })
          .filter((l) => l.quantity > 0);
        return {
          id: row.$id,
          row,
          lines,
          units: lines.reduce((n, l) => n + l.quantity, 0),
          value: lines.reduce((n, l) => n + l.price * l.quantity, 0),
          problems: lines.filter((l) => isProblem(l.stock)).length,
          low: lines.filter((l) => l.stock.key === 'low').length,
          days: daysSince(row.$updatedAt),
        };
      })
      .filter((e) => e.lines.length > 0);

    // ---- wishlists
    const wishes = raw.wishes
      .map((row) => {
        const bought = new Set(row.purchasedProductIds || []);
        const lines = (row.productIds || []).map((productId) => {
          const product = products[productId] || null;
          return { productId, product, stock: stockOf(product, 0), bought: bought.has(productId) };
        });
        return {
          id: row.$id,
          row,
          lines,
          saved: lines.length,
          boughtCount: lines.filter((l) => l.bought).length,
          problems: lines.filter((l) => isProblem(l.stock)).length,
          days: daysSince(row.$updatedAt),
        };
      })
      .filter((e) => e.lines.length > 0);

    // ---- one row per product that somebody holds
    const map = new Map();
    const touch = (id) => {
      if (!map.has(id)) map.set(id, { id, product: products[id] || null, cartQty: 0, carts: 0, wishes: 0 });
      return map.get(id);
    };
    carts.forEach((e) => e.lines.forEach((l) => { const d = touch(l.productId); d.cartQty += l.quantity; d.carts += 1; }));
    wishes.forEach((e) => e.lines.forEach((l) => { touch(l.productId).wishes += 1; }));
    const demand = [...map.values()].map((d) => ({ ...d, stock: stockOf(d.product, d.cartQty) }));

    // ---- headline numbers
    const value = carts.reduce((n, e) => n + e.value, 0);
    const savedTotal = wishes.reduce((n, e) => n + e.saved, 0);
    const boughtTotal = wishes.reduce((n, e) => n + e.boughtCount, 0);
    const stats = {
      shoppers: carts.length,
      units: carts.reduce((n, e) => n + e.units, 0),
      value,
      staleValue: carts.filter((e) => e.days >= STALE_DAYS).reduce((n, e) => n + e.value, 0),
      problemCarts: carts.filter((e) => e.problems > 0).length,
      wishers: wishes.length,
      saved: savedTotal,
      bought: boughtTotal,
      conversion: savedTotal ? Math.round((boughtTotal / savedTotal) * 100) : 0,
    };

    // ---- chart data (shapes match ui/graphs: BarChart, Donut, TrendGraph, Histogram)
    const topOf = (key) =>
      [...demand]
        .filter((d) => d[key] > 0)
        .sort((a, b) => b[key] - a[key])
        .slice(0, 8)
        .map((d) => ({ label: d.product?.name || 'Product removed', value: d[key] }));

    const mix = { ok: 0, low: 0, short: 0, out: 0, removed: 0 };
    demand.forEach((d) => { mix[d.stock.key] += 1; });
    const stockMix = [
      { key: 'ok', label: 'In stock', tone: entityColorStep('stockStatus', 'in') },
      { key: 'low', label: 'Low stock', tone: entityColorStep('stockStatus', 'low') },
      { key: 'short', label: 'Carts want more than is left', tone: entityColorStep('stockStatus', 'short') },
      { key: 'out', label: 'Out of stock', tone: entityColorStep('stockStatus', 'out') },
      { key: 'removed', label: 'Product removed', tone: entityColorStep('stockStatus', 'removed') },
    ]
      .map((m) => ({ label: m.label, value: mix[m.key], color: toneVar(m.tone) }))
      .filter((m) => m.value > 0);

    const ages = AGE_BUCKETS.map((b, i) => {
      const min = i === 0 ? 0 : AGE_BUCKETS[i - 1].max;
      const inside = carts.filter((e) => e.days >= min && e.days < b.max);
      const worth = inside.reduce((n, e) => n + e.value, 0);
      return { label: b.label, value: inside.length, hint: inside.length ? money(worth) : '' };
    });

    const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    const at = new Map(days.map((d, i) => [key(d), i]));
    const perDay = Array(14).fill(0);
    [...raw.carts, ...raw.wishes].forEach((r) => {
      const i = at.get(key(new Date(r.$updatedAt)));
      if (i != null) perDay[i] += 1;
    });
    const activity = days.map((d, i) => ({
      label: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
      value: perDay[i],
    }));

    const byCity = new Map();
    carts.forEach((e) => {
      const city = e.row.city || 'Unknown';
      byCity.set(city, (byCity.get(city) || 0) + e.value);
    });
    const cities = [...byCity.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([city, v]) => ({ label: city, value: Math.round(v) }));

    const wishMix = [
      { label: 'Already bought', value: boughtTotal, color: toneVar(7) },
      { label: 'Still waiting', value: savedTotal - boughtTotal, color: toneVar(6) },
    ];

    return {
      carts,
      wishes,
      demand,
      stats,
      charts: {
        topCart: topOf('cartQty'),
        topWish: topOf('wishes'),
        stockMix,
        ages,
        activity,
        cities,
        wishMix,
        cartValues: carts.map((e) => e.value),
        activityRows: [...raw.carts, ...raw.wishes], // for the calendar (date of last change)
      },
    };
  }, [raw]);

  return { ...derived, loading, error, loadedAt, reload: load };
}