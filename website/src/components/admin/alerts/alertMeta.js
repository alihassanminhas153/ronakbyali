import { AlertTriangle, CheckCircle2, Info, Megaphone, XCircle } from 'lucide-react';

// tone: 1-8 picks a graph colour (see ui/graphs/utils.js), or any CSS colour.
export const TYPE_META = {
  info: { label: 'Info', icon: Info, tone: 1, hint: 'News and notices' },
  success: { label: 'Success', icon: CheckCircle2, tone: 2, hint: 'Good news' },
  warning: { label: 'Warning', icon: AlertTriangle, tone: 3, hint: 'Delays, heads-up' },
  error: { label: 'Error', icon: XCircle, tone: 4, hint: 'Problems, outages' },
  promo: { label: 'Promo', icon: Megaphone, tone: 6, hint: 'Sales and offers' },
};

export const STATE_META = {
  active: { label: 'Active', tone: 2 },
  scheduled: { label: 'Scheduled', tone: 5 },
  inactive: { label: 'Inactive', tone: 'var(--text-muted)' },
  expired: { label: 'Expired', tone: 4 },
};

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
];
export const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label }));
export const DISPLAY_OPTIONS = [
  { value: 'bar', label: 'Bars only' },
  { value: 'popup', label: 'Popups only' },
];
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'priority', label: 'Highest priority' },
];

const UNITS = [
  ['day', 864e5],
  ['hour', 36e5],
  ['minute', 6e4],
];
const span = (ms) => {
  const a = Math.abs(ms);
  for (const [unit, size] of UNITS) {
    if (a >= size) {
      const n = Math.round(a / size);
      return `${n} ${unit}${n > 1 ? 's' : ''}`;
    }
  }
  return 'a moment';
};

// "Ends in 3 days", "Ended 2 hours ago", "Starts in 1 day", "No end date"
export function describeSchedule(alert, now = Date.now()) {
  const start = alert.startsAt ? new Date(alert.startsAt).getTime() : null;
  const end = alert.endsAt ? new Date(alert.endsAt).getTime() : null;
  if (start && start > now) return `Starts in ${span(start - now)}`;
  if (end) return end < now ? `Ended ${span(now - end)} ago` : `Ends in ${span(end - now)}`;
  return 'No end date';
}

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '-';

export const seenRate = (alert) => {
  const views = Number(alert.impressions) || 0;
  const seen = Number(alert.seenCount) || 0;
  return views ? Math.min(100, Math.round((seen / views) * 100)) : 0;
};