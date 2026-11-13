// src/lib/checkoutDraft.js
//
// Client-side helpers for checkout:
//   - a draft saved in localStorage while the guest goes through Google login
//   - validation that runs BEFORE anything is sent to Appwrite
//
// The password is never part of a draft.

const KEY = 'rba:checkout-draft';
const MAX_AGE_MS = 60 * 60 * 1000; // a draft older than 1 hour is ignored

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value) => EMAIL_RE.test(String(value || '').trim());

export const saveDraft = (draft) => {
  try {
    const { password, ...safe } = draft; // never store a password
    void password;
    localStorage.setItem(KEY, JSON.stringify({ ...safe, v: 1, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

export const loadDraft = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || draft.v !== 1 || Date.now() - Number(draft.savedAt) > MAX_AGE_MS) {
      clearDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
};

export const clearDraft = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
};

// Fills EMPTY fields of the form from the logged-in profile. Typed values win.
export const fillFromProfile = (form = {}, profile = {}) => ({
  ...form,
  customerName: form.customerName || profile?.name || '',
  customerPhone: form.customerPhone || profile?.phone || '',
  customerEmail: form.customerEmail || profile?.email || '',
  city: form.city || profile?.lastCity || '',
  address: form.address || profile?.lastAddress || '',
});

// Returns { field: message }. Empty object = ready to send.
// needEmail: true for guests (email is what we log them in / create them with).
export const validateDetails = (form = {}, { needEmail = false } = {}) => {
  const errors = {};
  const text = (key) => String(form[key] ?? '').trim();

  if (!text('customerName')) errors.customerName = 'Enter your name.';
  const phoneDigits = text('customerPhone').replace(/\D/g, '');
  if (!text('customerPhone')) errors.customerPhone = 'Enter your phone number.';
  else if (phoneDigits.length < 7) errors.customerPhone = 'Enter a valid phone number.';
  if (needEmail) {
    if (!text('customerEmail')) errors.customerEmail = 'Enter your email.';
    else if (!isEmail(form.customerEmail)) errors.customerEmail = 'Enter a valid email.';
  }
  if (!text('city')) errors.city = 'Enter your city.';
  if (!text('address')) errors.address = 'Enter your delivery address.';
  return errors;
};