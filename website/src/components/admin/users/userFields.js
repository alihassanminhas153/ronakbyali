// Constants, formatters and guard helpers for the admin Users screens
// (the equivalent of productFields.js). Columns come from `ronakbyali_users`.
import { productService } from '../../../store/slices/services';
import { getAvatarUrl } from '../../../store/slices/authSlice';

/* ---------- roles ---------- */

export const TEAM_ROLES = ['admin', 'support', 'manager'];
export const ROLE_VALUES = ['admin', 'support', 'manager', 'customer', 'loyal', 'new'];
export const isTeamRole = (role) => TEAM_ROLES.includes(role);

const cap = (text) => (text ? text[0].toUpperCase() + text.slice(1) : '');

export const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All roles' },
  ...ROLE_VALUES.map((value) => ({ value, label: cap(value) })),
];
export const ROLE_EDIT_OPTIONS = ROLE_VALUES.map((value) => ({ value, label: cap(value) }));

export const BLOCKED_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
];

// Theme colors only. Full class strings so Tailwind can see them.
export const ROLE_TONE = {
  admin: 'border-error/30 bg-error/10 text-error',
  support: 'border-accent/30 bg-accent/10 text-accent',
  manager: 'border-warning/30 bg-warning/10 text-warning',
  customer: 'border-border bg-surface-alt text-muted',
  loyal: 'border-success/30 bg-success/10 text-success',
  new: 'border-border bg-surface-alt text-text',
};

/* ---------- guards (the slice enforces them too) ---------- */

export const blockLockReason = (user, meId) => {
  if (user.$id === meId) return 'You cannot block your own account';
  if (user.role === 'admin' && !user.isBlocked) return "Admins can't be blocked";
  return '';
};

export const roleLockReason = (user, meId) =>
  user.$id === meId ? 'You cannot change your own role' : '';

/* ---------- formatting ---------- */

// Same formatter the products table uses for prices.
export const formatMoney = (value) => productService.formatPrice(Number(value) || 0);
export const formatInt = (value) => new Intl.NumberFormat().format(Number(value) || 0);

export const fullDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—';
};

const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function timeAgo(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Never';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'Just now';
}

export function initialsOf(user) {
  const source = (user?.name || user?.username || user?.email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Pure URL helper, null when the user has no avatar.
export const avatarOf = (user) => getAvatarUrl(user?.avatarFileId);

/* ---------- detail modal sections (every column is shown here or in the table) ---------- */

// role and isBlocked are editable and live in the "Access" block of UserForm.
export const USER_SECTIONS = [
  {
    title: 'Profile',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'username', label: 'Username', prefix: '@' },
      { key: 'authProvider', label: 'Sign-in method' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'lastCity', label: 'Last city' },
      { key: 'lastAddress', label: 'Last address' },
    ],
  },
  {
    title: 'Activity',
    fields: [
      { key: 'lastLoginAt', label: 'Last login', kind: 'date' },
      { key: '$createdAt', label: 'Joined', kind: 'date' },
    ],
  },
  {
    title: 'Commerce',
    fields: [
      { key: 'ordersCount', label: 'Orders', kind: 'int' },
      { key: 'totalSpent', label: 'Total spent', kind: 'money' },
    ],
  },
  {
    title: 'System',
    fields: [
      { key: '$id', label: 'User ID', wide: true },
      { key: 'avatarFileId', label: 'Avatar file ID' },
      { key: 'cartId', label: 'Cart ID' },
      { key: 'wishlistId', label: 'Wishlist ID' },
      { key: 'reviewIds', label: 'Reviews', kind: 'ids', wide: true },
    ],
  },
];

export function readField(user, { key, kind, prefix = '' }) {
  const value = user?.[key];
  switch (kind) {
    case 'date':
      return fullDate(value);
    case 'money':
      return formatMoney(value);
    case 'int':
      return formatInt(value);
    case 'ids': {
      const list = Array.isArray(value) ? value : [];
      return list.length ? `${list.length}: ${list.join(', ')}` : '0';
    }
    default:
      return value === undefined || value === null || value === '' ? '—' : `${prefix}${value}`;
  }
}