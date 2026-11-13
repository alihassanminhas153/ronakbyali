export const ENTITY_COLOR_STEPS = {
  entity: {
    order: 1,
    product: 2,
    user: 3,
    alert: 4,
    finance: 5,
    cart: 6,
    wishlist: 6,
    review: 7,
    profile: 8,
  },
  orderStatus: {
    pending: 3,
    confirmed: 1,
    processing: 6,
    shipped: 5,
    delivered: 7,
    cancelled: 4,
    returned: 8,
  },
  paymentStatus: {
    unpaid: 4,
    partial: 3,
    paid: 7,
    refunded: 8,
  },
  stockStatus: {
    in: 7,
    low: 2,
    short: 2,
    out: 4,
    removed: 8,
  },
  productState: {
    all: 2,
    inStock: 7,
    outOfStock: 4,
    onSale: 3,
  },
  reviewStatus: {
    pending: 3,
    approved: 7,
    rejected: 4,
  },
  alertType: {
    info: 3,
    success: 7,
    warning: 2,
    error: 4,
    promo: 6,
  },
  alertState: {
    active: 7,
    scheduled: 2,
    inactive: 8,
    expired: 4,
  },
  alertDisplay: {
    bar: 1,
    popup: 5,
  },
  alertSection: {
    alerts: 1,
    status: 2,
    types: 6,
    reach: 3,
    all: 1,
    announcements: 2,
    popups: 6,
  },
  role: {
    owner: 8,
    admin: 1,
    support: 3,
    manager: 6,
    customer: 5,
    member: 3,
    loyal: 7,
    new: 2,
    guest: 8,
  },
  provider: {
    email: 1,
    google: 4,
    github: 8,
    facebook: 5,
    apple: 6,
    microsoft: 2,
    discord: 6,
  },
  financeType: {
    revenue: 7,
    income: 7,
    profit: 7,
    expense: 4,
    loss: 4,
    investment: 2,
    withdrawal: 3,
  },
  chartSeries: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
  },
};

const ICON_TONE_CLASSES = {
  1: 'icon-tone-1',
  2: 'icon-tone-2',
  3: 'icon-tone-3',
  4: 'icon-tone-4',
  5: 'icon-tone-5',
};

const ICON_STEP_TONES = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 3,
  7: 5,
  8: 4,
};

export function categoryColorStep(label) {
  const value = String(label ?? '').trim().toLowerCase();
  if (!value) return 1;

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (hash % 8) + 1;
}

export function entityColorStep(group, value) {
  const steps = ENTITY_COLOR_STEPS[group];
  if (!steps) throw new RangeError(`Unknown color group: ${group}`);
  const key = String(value ?? '').trim().toLowerCase();
  return steps[key] || categoryColorStep(key);
}

export function toneColor(step) {
  const numeric = Number(step);
  const normalized = Number.isInteger(numeric) && numeric > 0 ? ((numeric - 1) % 8) + 1 : 1;
  return `var(--accent-tone-${normalized})`;
}

export function iconToneClass(step) {
  const numeric = Number(step);
  const normalized = Number.isInteger(numeric) ? ICON_STEP_TONES[numeric] : 1;
  return ICON_TONE_CLASSES[normalized] || ICON_TONE_CLASSES[1];
}
