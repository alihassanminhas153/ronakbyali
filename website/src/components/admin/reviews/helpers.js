import { Check, Clock, X } from 'lucide-react';
import { entityColorStep } from '../../../lib/entityColors';

// tone = which theme accent shade the status uses in badges, charts, and cards
export const STATUS_META = {
  pending: { label: 'Pending', tone: entityColorStep('reviewStatus', 'pending'), icon: Clock },
  approved: { label: 'Approved', tone: entityColorStep('reviewStatus', 'approved'), icon: Check },
  rejected: { label: 'Rejected', tone: entityColorStep('reviewStatus', 'rejected'), icon: X },
};
export const STATUS_ORDER = ['pending', 'approved', 'rejected'];

export const PERIODS = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
];

export const SORTS = ['Newest', 'Oldest', 'Pending first', 'Highest rating', 'Lowest rating'];
export const RATING_LABELS = ['5 stars', '4 stars', '3 stars', '2 stars', '1 star'];

const time = (r) => new Date(r.$createdAt).getTime();
const newest = (a, b) => time(b) - time(a);

export const REVIEW_SORTERS = {
  Newest: newest,
  Oldest: (a, b) => time(a) - time(b),
  'Pending first': (a, b) => (b.status === 'pending') - (a.status === 'pending') || newest(a, b),
  'Highest rating': (a, b) => b.rating - a.rating || newest(a, b),
  'Lowest rating': (a, b) => a.rating - b.rating || newest(a, b),
};

export function prettyDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function periodStart(periodId) {
  const days = PERIODS.find((p) => p.id === periodId)?.days;
  if (!days) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

const round1 = (n) => Math.round(n * 10) / 10;

// Numbers for the Overview tab. Counts and ratings follow the chosen period;
// "pending" is always the full queue because it needs a decision whatever its age.
export function buildReviewStats(items, periodId) {
  const start = periodStart(periodId);
  const inPeriod = start ? items.filter((r) => new Date(r.$createdAt) >= start) : items;
  const approved = inPeriod.filter((r) => r.status === 'approved');

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  approved.forEach((r) => {
    const n = Number(r.rating) || 0;
    if (counts[n] !== undefined) counts[n] += 1;
    sum += n;
  });

  const statusCounts = { pending: 0, approved: 0, rejected: 0 };
  inPeriod.forEach((r) => {
    if (statusCounts[r.status] !== undefined) statusCounts[r.status] += 1;
  });

  const replied = inPeriod.filter((r) => r.adminReply).length;

  // last 12 months, oldest first
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString('en', { month: 'short' }), value: 0 };
  });
  items.forEach((r) => {
    const d = new Date(r.$createdAt);
    const slot = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (slot) slot.value += 1;
  });

  return {
    total: inPeriod.length,
    approved: approved.length,
    average: approved.length ? round1(sum / approved.length) : 0,
    counts,
    statusCounts,
    pending: items.filter((r) => r.status === 'pending').length,
    replyRate: inPeriod.length ? (replied / inPeriod.length) * 100 : 0,
    months: months.map(({ label, value }) => ({ label, value })),
  };
}

// One row per product that has reviews. Average is over APPROVED reviews only,
// the same rule the product page uses.
export function buildProductStats(items) {
  const map = new Map();
  items.forEach((r) => {
    if (!r.productId) return;
    if (!map.has(r.productId)) {
      map.set(r.productId, {
        productId: r.productId,
        name: r.productName || 'Unnamed product',
        slug: r.productSlug || '',
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        sum: 0,
      });
    }
    const p = map.get(r.productId);
    p.total += 1;
    if (r.status === 'approved') {
      p.approved += 1;
      p.sum += Number(r.rating) || 0;
    } else if (r.status === 'pending') p.pending += 1;
    else if (r.status === 'rejected') p.rejected += 1;
  });
  return [...map.values()].map(({ sum, ...p }) => ({ ...p, average: p.approved ? round1(sum / p.approved) : 0 }));
}

export function reviewsToCsv(rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date', 'Product', 'Reviewer', 'Username', 'Rating', 'Status', 'Verified purchase', 'Title', 'Message', 'Admin reply'];
  const body = rows.map((r) =>
    [
      prettyDate(r.$createdAt),
      r.productName,
      r.reviewerName,
      r.username,
      r.rating,
      r.status,
      r.isVerifiedPurchase ? 'yes' : 'no',
      r.title,
      r.message,
      r.adminReply,
    ]
      .map(cell)
      .join(',')
  );
  return '\ufeff' + [head.map(cell).join(','), ...body].join('\r\n');
}