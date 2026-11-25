import {
  Bell,
  BadgeCheck,
  Boxes,
  Heart,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

import { PATHS } from '../../router/path';
import { isBlocked } from './accessRules';

// Every page of the two dashboards. This is the ONLY place that lists them: the Sidebar,
// the access gate, Settings > Layout & access and the `ronakbyali_panel_access` table all use these keys.
//   key     : stable id stored in the table. Never rename it once saved.
//   slug    : last part of the URL (display only; the real URL comes from PATHS via `to`)
//   locked  : always shown and never blockable (overview is where "Back" leads, settings holds this editor)
export const PANEL_PAGES = {
  admin: [
    { key: 'overview', label: 'Overview', slug: '', icon: LayoutDashboard, end: true, locked: true, to: (u) => PATHS.admin.overview(u) },
    { key: 'orders', label: 'Orders', slug: 'orders', icon: Package, to: (u) => PATHS.admin.orders(u) },
    { key: 'products', label: 'Products', slug: 'products', icon: Store, to: (u) => PATHS.admin.products(u) },
    { key: 'inventory', label: 'Inventory', slug: 'inventory', icon: Boxes, to: (u) => PATHS.admin.inventory(u) },
    { key: 'users', label: 'Users', slug: 'users', icon: Users, to: (u) => PATHS.admin.users(u) },
    { key: 'finance', label: 'Finance', slug: 'finance', icon: Wallet, to: (u) => PATHS.admin.finance(u) },
    { key: 'cart-and-wishlist', label: 'Cart & wishlist', slug: 'cart-and-wishlist', icon: ShoppingBag, to: (u) => PATHS.admin.cartAndWishlist(u) },
    { key: 'reviews', label: 'Reviews', slug: 'reviews', icon: Star, to: (u) => PATHS.admin.reviews(u) },
    { key: 'alerts', label: 'Alerts', slug: 'alerts', icon: Bell, to: (u) => PATHS.admin.alerts(u) },
    { key: 'settings', label: 'Settings', slug: 'settings', icon: Settings, locked: true, to: (u) => PATHS.admin.settings(u) },
  ],
  user: [
    { key: 'overview', label: 'Overview', slug: '', icon: LayoutDashboard, end: true, locked: true, to: (u) => PATHS.user.overview(u) },
    { key: 'profile', label: 'Profile', slug: 'profile', icon: UserRound, to: (u) => PATHS.user.profile(u) },
    { key: 'orders', label: 'Orders', slug: 'orders', icon: Package, to: (u) => PATHS.user.orders(u) },
    { key: 'confirm-order', label: 'Confirm orders', slug: 'confirm-order', icon: BadgeCheck, to: (u) => PATHS.user.confirmOrder(u) },
    { key: 'cart', label: 'Cart', slug: 'cart', icon: ShoppingCart, to: (u) => PATHS.user.cart(u) },
    { key: 'wishlist', label: 'Wishlist', slug: 'wishlist', icon: Heart, to: (u) => PATHS.user.wishlist(u) },
    { key: 'reviews', label: 'Reviews', slug: 'reviews', icon: Star, to: (u) => PATHS.user.reviews(u) },
    { key: 'alerts', label: 'Alerts', slug: 'alerts', icon: Bell, to: (u) => PATHS.user.alerts(u) },
  ],
};

export const AREAS = [
  { id: 'admin', label: 'Admin panel' },
  { id: 'user', label: 'User panel' },
];

// the URL shown in the table, e.g. /admin/:username/orders
export const urlFor = (area, page) => page.to(':username');

// A row as stored in the `ronakbyali_panel_access` table (one row per area + page).
export const defaultRow = (area, page, index) => ({
  area,
  key: page.key,
  label: page.label,
  slug: page.slug,
  order: index,
  inSidebar: true, // untick = removed from the sidebar, the URL still works
  blockedLabels: [], // labels that can never open this page
});

// registry + saved rows -> one complete, ordered list for an area (missing rows use the defaults)
export const mergeRows = (area, saved = []) => {
  const byKey = new Map(saved.filter((r) => r.area === area).map((r) => [r.key, r]));
  return PANEL_PAGES[area]
    .map((page, index) => {
      const row = byKey.get(page.key);
      if (!row) return defaultRow(area, page, index);
      return {
        ...defaultRow(area, page, index),
        order: Number.isFinite(row.order) ? row.order : index,
        inSidebar: row.inSidebar !== false,
        blockedLabels: Array.isArray(row.blockedLabels) ? row.blockedLabels : [],
      };
    })
    .sort((a, b) => a.order - b.order);
};

// The pages one person sees in the sidebar:
//   no saved row -> visible (the app works before the table has any rows)
//   locked pages -> always visible
//   unticked     -> hidden for everybody (still reachable by URL)
//   blocked      -> hidden for the blocked labels (the page is closed to them anyway)
export const visiblePages = (area, rows = [], userLabels = []) => {
  const byKey = new Map(rows.filter((r) => r.area === area).map((r) => [r.key, r]));
  return PANEL_PAGES[area]
    .map((page, index) => ({ page, row: byKey.get(page.key), index }))
    .filter(({ page, row }) => {
      if (!row || page.locked) return true;
      if (row.inSidebar === false) return false;
      return !isBlocked(row, userLabels);
    })
    .sort((a, b) => (a.row?.order ?? a.index) - (b.row?.order ?? b.index))
    .map(({ page }) => page);
};

// which registry page does this URL belong to? (longest match wins, overview must match exactly)
const clean = (s = '') => s.replace(/\/+$/, '') || '/';
export const pageForPath = (area, pathname, username) => {
  const path = clean(pathname);
  let best = null;
  PANEL_PAGES[area]?.forEach((page) => {
    const to = clean(page.to(username));
    const hit = page.end ? path === to : path === to || path.startsWith(`${to}/`);
    if (hit && (!best || to.length > best.length)) best = { page, length: to.length };
  });
  return best?.page || null;
};
