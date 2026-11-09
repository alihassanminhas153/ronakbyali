import { useEffect, useState } from 'react';

// Colours come from CSS variables (see index.css) so they follow the theme.
export const CHART_COLORS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `var(--graph-${n})`);
export const colorAt = (i) => CHART_COLORS[i % CHART_COLORS.length];
export const toneVar = (n = 1) => (typeof n === 'number' ? `var(--graph-${((n - 1) % 8) + 1})` : n);

// The same name always gets the same colour (a category looks the same in the table and in every chart).
export function colorFor(name = '') {
  let h = 0;
  const str = String(name);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return colorAt(h);
}
// Soft background tint of a colour (works with the CSS variables above).
export const tint = (color, pct = 14) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// false on the first paint, true one frame later. Used to animate charts in.
export function useReveal(deps = []) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return on;
}

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

// items + accessor -> [{ date: 'YYYY-MM-DD', value: n }]   (rows created per day)
export function countByDay(items = [], getDate = (r) => r.$createdAt) {
  const map = new Map();
  items.forEach((r) => {
    const raw = getDate(r);
    if (!raw) return;
    const k = dayKey(raw);
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].map(([date, value]) => ({ date, value }));
}

// Last `months` calendar months, oldest first: [{ key, label, value }]
export function monthlySeries(items = [], getDate = (r) => r.$createdAt, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: d.toLocaleString('en', { month: 'short' }),
      value: 0,
    });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  items.forEach((r) => {
    const raw = getDate(r);
    if (!raw) return;
    const d = new Date(raw);
    const b = index.get(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    if (b) b.value += 1;
  });
  return buckets;
}

// Group rows by a key: [{ label, value }] sorted high -> low.
// `reduce` lets you sum something instead of counting rows.
export function groupBy(items = [], getKey, reduce = () => 1) {
  const map = new Map();
  items.forEach((r) => {
    const k = getKey(r);
    if (k == null || k === '') return;
    map.set(k, (map.get(k) || 0) + reduce(r));
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

// Keep the biggest `n`, merge the rest into "Others".
export function topWithOthers(data = [], n = 5) {
  if (data.length <= n) return data;
  const head = data.slice(0, n);
  const rest = data.slice(n).reduce((sum, d) => sum + d.value, 0);
  return [...head, { label: 'Others', value: rest }];
}

// numbers -> [{ label: '1,000 - 2,000', value: count }]
export function histogramBins(values = [], bins = 6, format = (n) => Math.round(n).toLocaleString()) {
  const nums = values.map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ label: format(min), value: nums.length }];
  const step = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    label: `${format(min + step * i)} - ${format(min + step * (i + 1))}`,
    short: format(min + step * i),
    value: 0,
  }));
  nums.forEach((n) => {
    const i = Math.min(bins - 1, Math.floor((n - min) / step));
    out[i].value += 1;
  });
  return out;
}

export const compact = (n) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);