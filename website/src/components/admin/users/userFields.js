// Constants, formatters and guard helpers for the admin Users screens
// (the equivalent of productFields.js). Columns come from `ronakbyali_users`.
import { productService } from '../../../store/slices/services';
import { getAvatarUrl } from '../../../store/slices/authSlice';
import { colorFor } from '../../../ui/graphs/utils';
import { entityColorStep, toneColor } from '../../../lib/entityColors';
import { KeyRound, Mail } from 'lucide-react';
import { FaApple, FaDiscord, FaFacebook, FaGithub, FaGoogle, FaMicrosoft } from 'react-icons/fa';

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
  admin: 'border-accent-tone-1/30 bg-accent-tone-1/10 text-accent-tone-1',
  support: 'border-accent-tone-3/30 bg-accent-tone-3/10 text-accent-tone-3',
  manager: 'border-accent-tone-6/30 bg-accent-tone-6/10 text-accent-tone-6',
  customer: 'border-accent-tone-5/30 bg-accent-tone-5/10 text-accent-tone-5',
  loyal: 'border-accent-tone-7/30 bg-accent-tone-7/10 text-accent-tone-7',
  new: 'border-accent-tone-2/30 bg-accent-tone-2/10 text-accent-tone-2',
};

// Same idea as the product category chips: soft tint + solid text, taken from the graph palette.
export const ROLE_COLOR = {
  admin: toneColor(entityColorStep('role', 'admin')),
  support: toneColor(entityColorStep('role', 'support')),
  manager: toneColor(entityColorStep('role', 'manager')),
  customer: toneColor(entityColorStep('role', 'customer')),
  loyal: toneColor(entityColorStep('role', 'loyal')),
  new: toneColor(entityColorStep('role', 'new')),
};

/* ---------- sign-in methods (users.authProvider) ---------- */

export const PROVIDERS = {
  email: { label: 'Email', icon: Mail, color: toneColor(entityColorStep('provider', 'email')) },
  google: { label: 'Google', icon: FaGoogle, color: toneColor(entityColorStep('provider', 'google')) },
  github: { label: 'GitHub', icon: FaGithub, color: toneColor(entityColorStep('provider', 'github')) },
  facebook: { label: 'Facebook', icon: FaFacebook, color: toneColor(entityColorStep('provider', 'facebook')) },
  apple: { label: 'Apple', icon: FaApple, color: toneColor(entityColorStep('provider', 'apple')) },
  microsoft: { label: 'Microsoft', icon: FaMicrosoft, color: toneColor(entityColorStep('provider', 'microsoft')) },
  discord: { label: 'Discord', icon: FaDiscord, color: toneColor(entityColorStep('provider', 'discord')) },
};

// Unknown providers still get an icon and a stable colour.
export function providerMeta(key) {
  const k = String(key || 'email').toLowerCase();
  return PROVIDERS[k] || { label: cap(k), icon: KeyRound, color: colorFor(k) };
}
export const providerOf = (user) => String(user?.authProvider || 'email').toLowerCase();

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

export const shortDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
};

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