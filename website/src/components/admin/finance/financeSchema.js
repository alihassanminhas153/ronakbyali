import { BadgePlus, HandCoins, Landmark, Receipt } from 'lucide-react';

// Expenses with this category are NOT counted against profit: the cost of goods is
// already taken from each product's cost price when it sells (otherwise it would count twice).
export const STOCK_CATEGORY = 'Stock purchase';

export const TYPE_META = {
  investment: {
    label: 'Investment',
    tone: 1,
    icon: Landmark,
    sign: 1,
    hint: 'Money you put into the business. It is not profit and does not change profit, it feeds cash in hand and ROI.',
    categories: ['Initial capital', 'Extra capital', 'Loan', 'Partner'],
  },
  expense: {
    label: 'Expense',
    tone: 4,
    icon: Receipt,
    sign: -1,
    hint: 'Running costs (ads, courier, packaging, rent, salaries). These reduce profit.',
    categories: ['Advertising', 'Delivery', 'Packaging', 'Rent', 'Salaries', 'Utilities', 'Photography', STOCK_CATEGORY, 'Other'],
  },
  withdrawal: {
    label: 'Withdrawal',
    tone: 3,
    icon: HandCoins,
    sign: -1,
    hint: 'Money you take out for yourself. It lowers cash in hand but not profit.',
    categories: ['Owner draw', 'Personal', 'Dividend'],
  },
  income: {
    label: 'Other income',
    tone: 7,
    icon: BadgePlus,
    sign: 1,
    hint: 'Money earned outside normal orders (refunds from suppliers, sale of items). It adds to profit.',
    categories: ['Supplier refund', 'Sale of assets', 'Other'],
  },
};
export const TYPE_ORDER = ['investment', 'expense', 'withdrawal', 'income'];

export const rs = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`;

const pad = (n) => String(n).padStart(2, '0');
export const toDateKey = (d = new Date()) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
// 'YYYY-MM-DD' -> ISO at local noon, so the day never shifts with the timezone.
export const keyToIso = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
};
export const prettyDate = (value) =>
  new Date(String(value).length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

export function toForm(entry, type = 'expense') {
  return {
    type: entry?.type || type,
    title: entry?.title || '',
    category: entry?.category || '',
    amount: entry?.amount != null ? String(entry.amount) : '',
    date: entry?.date ? toDateKey(entry.date) : toDateKey(),
    note: entry?.note || '',
  };
}

export function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = 'Give this entry a short title.';
  if (f.title.length > 150) e.title = 'Max 150 characters.';
  if (f.amount === '' || !(Number(f.amount) > 0)) e.amount = 'Enter an amount above 0.';
  if (!f.date) e.date = 'Pick a date.';
  if (f.note.length > 1000) e.note = 'Max 1000 characters.';
  return e;
}

export function toPayload(f) {
  return {
    type: f.type,
    title: f.title.trim(),
    category: f.category.trim() || null,
    amount: Number(f.amount),
    date: keyToIso(f.date),
    note: f.note.trim() || null,
  };
}

export function entriesToCsv(entries) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date', 'Type', 'Title', 'Category', 'Amount', 'Note'];
  const rows = entries.map((e) => [toDateKey(e.date), e.type, e.title, e.category, e.amount, e.note].map(q).join(','));
  return [head.map(q).join(','), ...rows].join('\n');
}