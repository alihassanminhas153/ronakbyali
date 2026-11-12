import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ChevronsRight, Menu } from 'lucide-react';

import Sidebar from './Sidebar';

const STORAGE_KEY = 'dashboard-sidebar-collapsed';
const DURATION = 300; // ms: sidebar width, drawer slide and backdrop fade (matches duration-300 in SidebarFold)
const PAGE_TITLES = {
  alerts: 'Alerts',
  cart: 'Cart',
  'cart-and-wishlist': 'Carts & wishlists',
  checkout: 'Checkout',
  finance: 'Finance',
  orders: 'Orders',
  products: 'Products',
  profile: 'Profile',
  reviews: 'Reviews',
  settings: 'Settings',
  users: 'Users',
  wishlist: 'Wishlist',
};

const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

// Page frame for both dashboards.
//   >= lg : fixed sidebar on the left, content on the right. The sidebar collapses to a
//           72px icon rail (remembered between visits). Collapse button: inside the sidebar
//           header while open, round button outside the sidebar edge while collapsed.
//   <  lg : slim top bar with a menu button; the sidebar slides in as a drawer
// There is no site header here. Pass children (SlugRoute) or let the route's <Outlet /> render.
export default function DashboardShell({ area = 'user', children }) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [mounted, setMounted] = useState(false); // drawer stays in the DOM while it slides out
  const [shown, setShown] = useState(false); // drives the slide / fade
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const panelRef = useRef(null);
  const { pathname } = useLocation();
  const panelTitle = area === 'admin' ? 'Admin panel' : 'My account';
  const pathSegments = pathname.split('/').filter(Boolean);
  const pageTitle =
    PAGE_TITLES[pathSegments[pathSegments.length - 1]] ||
    (pathSegments.length === (area === 'admin' ? 2 : 1) ? 'Overview' : panelTitle);

  useEffect(() => {
    document.title = `${pageTitle} | Ronak By Ali`;
  }, [pageTitle]);

  // remember the collapsed state (kept out of the state updater so it stays pure)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* private mode: it just will not be remembered */
    }
  }, [collapsed]);

  // close the drawer after navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // drawer enter / exit animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      let second;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          setShown(true); // paint the hidden state first, then slide in
          panelRef.current?.focus({ preventScroll: true });
        });
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), DURATION);
    return () => clearTimeout(timer);
  }, [open]);

  // Esc closes the drawer; the page behind does not scroll while it is open
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const previous = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // growing to a large screen: the fixed sidebar takes over, so close the drawer
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => e.matches && setOpen(false);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const speed = { transitionDuration: `${DURATION}ms` };

  return (
    <div
      style={speed}
      className={`min-h-dvh bg-bg text-text transition-[grid-template-columns] ease-out motion-reduce:transition-none lg:grid ${
        collapsed ? 'lg:grid-cols-[4.5rem_minmax(0,1fr)]' : 'lg:grid-cols-[16.5rem_minmax(0,1fr)]'
      }`}
    >
      {/* desktop sidebar */}
      <aside className="hidden border-r border-border lg:block">
        <div className="sticky top-0 z-20 h-dvh">
          <div className="h-full overflow-hidden">
            <Sidebar area={area} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
          </div>

          {/* While open the toggle lives inside the sidebar header. While collapsed it sits outside, on the edge. */}
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            tabIndex={collapsed ? 0 : -1}
            aria-hidden={!collapsed || undefined}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            style={{ transitionDuration: '200ms', transitionDelay: collapsed ? `${DURATION / 2}ms` : '0ms' }}
            className={`absolute -right-4 top-[18px] z-10 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft transition-[opacity,color,border-color] hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none ${
              collapsed ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <ChevronsRight size={14} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex size-10 items-center justify-center rounded-md text-text transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <span className="font-heading text-base font-semibold text-text">{pageTitle}</span>
      </div>

      {/* mobile drawer */}
      {(open || mounted) && (
        <div className={`fixed inset-x-0 top-0 z-40 h-dvh lg:hidden ${open ? '' : 'pointer-events-none'}`}>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            style={speed}
            className={`absolute inset-0 bg-bg/80 backdrop-blur-sm transition-opacity ease-out motion-reduce:transition-none ${
              shown ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={panelTitle}
            style={speed}
            className={`absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-border shadow-soft outline-none transition-transform ease-out motion-reduce:transition-none ${
              shown ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar area={area} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children ?? <Outlet />}</main>
    </div>
  );
}