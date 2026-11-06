import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ChevronsLeft, Menu, X } from 'lucide-react';

import Sidebar from './Sidebar';

const STORAGE_KEY = 'dashboard-sidebar-collapsed';
const DURATION = 300; // ms: sidebar width, drawer slide and backdrop fade

const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

// Page frame for both dashboards.
//   >= lg : fixed sidebar on the left, content on the right. The sidebar can be collapsed
//           to an icon-only rail with the round button on its edge (remembered between visits).
//   <  lg : slim top bar with a menu button; the sidebar slides in as a drawer
// There is no site header here. Pass children (SlugRoute) or let the route's <Outlet /> render.
export default function DashboardShell({ area = 'user', children }) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [mounted, setMounted] = useState(false); // drawer stays in the DOM while it slides out
  const [shown, setShown] = useState(false); // drives the slide / fade
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { pathname } = useLocation();
  const title = area === 'admin' ? 'Admin panel' : 'My account';

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? '0' : '1');
      } catch {
        /* private mode: it just will not be remembered */
      }
      return !c;
    });

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
        second = requestAnimationFrame(() => setShown(true)); // paint the hidden state first
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
        collapsed ? 'lg:grid-cols-[4.125rem_minmax(0,1fr)]' : 'lg:grid-cols-[16rem_minmax(0,1fr)]'
      }`}
    >
      {/* desktop sidebar */}
      <aside className="hidden border-r border-border lg:block">
        <div className="sticky top-0 z-20 h-dvh">
          <div className="h-full overflow-hidden">
            <Sidebar area={area} collapsed={collapsed} />
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-3 top-20 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronsLeft
              size={14}
              aria-hidden="true"
              style={speed}
              className={`transition-transform ease-out motion-reduce:transition-none ${collapsed ? 'rotate-180' : ''}`}
            />
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
          className="flex size-10 items-center justify-center rounded-sm text-text transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <span className="font-display text-xl font-bold tracking-wide text-text">{title}</span>
      </div>

      {/* mobile drawer */}
      {(open || mounted) && (
        <div className={`fixed inset-0 z-40 lg:hidden ${open ? '' : 'pointer-events-none'}`}>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            style={speed}
            className={`absolute inset-0 bg-bg/80 transition-opacity ease-out motion-reduce:transition-none ${
              shown ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={speed}
            className={`absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-border shadow-soft transition-transform ease-out motion-reduce:transition-none ${
              shown ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-alt hover:text-text"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <Sidebar area={area} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children ?? <Outlet />}</main>
    </div>
  );
}
