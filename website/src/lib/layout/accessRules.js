// Who may block whom, and who is blocked from a page. No React in here, so it is easy to test.
//
// Ranks:  admin 3  >  manager 2  >  support 1  >  everyone else 0 (customer, loyal, new, custom labels)
// An editor can only block labels BELOW their own rank:
//   admin   -> manager, support, customer, loyal, new, custom labels   (never admin, so never himself)
//   manager -> support, customer, loyal, new, custom labels            (not admin, not manager)
//   support -> customer, loyal, new, custom labels                     (not admin, not manager, not support)
export const STAFF_LABELS = ['admin', 'manager', 'support'];
const RANK = { admin: 3, manager: 2, support: 1 };

export const rankOf = (labels = []) => labels.reduce((max, l) => Math.max(max, RANK[l] || 0), 0);
export const isStaffUser = (labels = []) => rankOf(labels) > 0;
export const canTarget = (editorLabels = [], label) => (RANK[label] || 0) < rankOf(editorLabels);

// A page row has `blockedLabels`. Admins are never blocked. Everyone else is blocked
// as soon as ONE of their labels (role or Appwrite label) is in the list.
export const isBlocked = (row, userLabels = []) =>
  Boolean(row) && !userLabels.includes('admin') && (row.blockedLabels || []).some((l) => userLabels.includes(l));

// the first label that caused the block (shown on the "Access denied" page)
export const blockedBy = (row, userLabels = []) => (row?.blockedLabels || []).find((l) => userLabels.includes(l)) || null;
