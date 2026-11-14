export const STAFF_ROLES = ['admin', 'support', 'manager'];

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin (full access)' },
  { value: 'support', label: 'Support' },
  { value: 'manager', label: 'Manager' },
  { value: 'customer', label: 'Customer' },
  { value: 'loyal', label: 'Loyal customer' },
  { value: 'new', label: 'New' },
];

// these words are roles, never "extra" labels
export const RESERVED_LABELS = ROLE_OPTIONS.map((o) => o.value);
export const LABEL_RE = /^[a-zA-Z0-9]{1,36}$/;
export const MAX_EXTRA_LABELS = 10;
export const PAGE_SIZE = 10;

// ['admin','vip'] -> { staff: 'admin', extras: ['vip'] }
export const splitLabels = (labels = []) => ({
  staff: labels.find((l) => STAFF_ROLES.includes(l)) || null,
  extras: labels.filter((l) => !RESERVED_LABELS.includes(l)),
});

// what ends up in Appwrite Auth for a role + extras
export const buildLabels = (role, extras = []) => [...(STAFF_ROLES.includes(role) ? [role] : []), ...extras];

export const labelsError = (extras = []) => {
  const reserved = extras.find((l) => RESERVED_LABELS.includes(l.toLowerCase()));
  if (reserved) return `"${reserved}" is a role. Choose it in the Role field instead.`;
  if (extras.some((l) => !LABEL_RE.test(l))) return 'Labels can only have letters and numbers (no spaces), up to 36 characters.';
  return '';
};

export const initials = (user) =>
  String(user?.name || user?.username || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '—');
export const fmtDay = (v) => (v ? new Date(v).toLocaleDateString() : '—');
export const fmtMoney = (v) => `Rs ${Number(v || 0).toLocaleString()}`;
export const val = (v) => (v === null || v === undefined || v === '' ? '—' : v);
