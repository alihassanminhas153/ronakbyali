// Shared helpers for the user Profile page and its edit drawer.

// Small cap on purpose. Photos coming from Google (or another OAuth login)
// are external URLs and never go through this check.
export const MAX_IMAGE_MB = 1;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const clean = (text) => String(text || '').trim().replace(/\s+/g, ' ');

export const toForm = (me) => ({
  username: me.username || '',
  name: me.name || '',
  phone: me.phone || '',
  lastCity: me.lastCity || '',
  lastAddress: me.lastAddress || '',
});

export function validateDetails(form) {
  const errors = {};
  const username = form.username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    errors.username = 'Use 3–30 letters, numbers or underscores.';
  }
  const name = clean(form.name);
  if (name.length < 2) errors.name = 'Enter your name (at least 2 characters).';
  else if (name.length > 128) errors.name = 'That name is too long.';
  if (form.phone.trim() && !/^[+\d\s()-]{5,20}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (form.lastCity.length > 100) errors.lastCity = 'City must be 100 characters or fewer.';
  if (form.lastAddress.length > 500) errors.lastAddress = 'Address must be 500 characters or fewer.';
  return errors;
}

export function validatePassword(form) {
  const errors = {};
  if (!form.current) errors.current = 'Enter your current password.';
  if (form.next.length < 8) errors.next = 'Use at least 8 characters.';
  else if (form.next.length > 256) errors.next = 'That password is too long.';
  else if (form.next === form.current) errors.next = 'Choose a different password.';
  if (form.confirm !== form.next) errors.confirm = 'Passwords do not match.';
  return errors;
}

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export const formatMoney = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '—');