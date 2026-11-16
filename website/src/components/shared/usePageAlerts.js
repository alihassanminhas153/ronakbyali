import { useMemo } from 'react';
import { useLocation } from 'react-router';

export const PAGE_KEYS = {
  home: 'home',
  products: 'products',
  product: 'product',
  other: 'other',
};

export function resolvePageKey(pathname = '') {
  const clean = (pathname || '/').replace(/^\/p(?=\/|$)/, '') || '/';
  if (clean === '/') return PAGE_KEYS.home;
  if (clean === '/products') return PAGE_KEYS.products;
  if (clean.startsWith('/products/')) return PAGE_KEYS.product;
  const segments = clean.split('/').filter(Boolean);
  const reserved = ['contact', 'privacy', 'disclaimer', 'faqs', 'custom-studio', 'team'];
  const isDashboard = segments[0]?.startsWith('@') || reserved.includes(segments[0]);
  if (!isDashboard && (segments.length === 1 || segments.length === 3)) return PAGE_KEYS.product;
  return PAGE_KEYS.other;
}

export function matchesPageFilter(alert, pageKey) {
  if (!alert) return false;
  const pages = Array.isArray(alert.pages) ? alert.pages : [];
  if (!pages.length || pages.includes('all')) return true;
  if (pageKey === PAGE_KEYS.other) return false;
  return pages.includes(pageKey);
}

export default function usePageAlerts(alerts = []) {
  const location = useLocation();
  const pageKey = resolvePageKey(location.pathname);

  return useMemo(
    () => (Array.isArray(alerts) ? alerts.filter((alert) => matchesPageFilter(alert, pageKey)) : []),
    [alerts, pageKey],
  );
}
