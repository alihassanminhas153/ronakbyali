import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';

import Sidebar from './Sidebar';

// Page frame for both dashboards.
//   >= lg : fixed sidebar on the left, content on the right
//   <  lg : slim top bar with a menu button; the sidebar opens as a drawer
// There is no site header here. Pass children (SlugRoute) or let the route's <Outlet /> render.
export default function DashboardShell({ area = 'user', children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const title = area === 'admin' ? 'Admin panel' : 'My account';

  // close the drawer after navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  return (
    <div className="min-h-dvh bg-bg text-text lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* desktop sidebar */}
      <aside className="hidden border-r border-border lg:block">
        <div className="sticky top-0 h-dvh">
          <Sidebar area={area} />
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
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 animate-fade bg-bg/80"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-border shadow-soft"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-alt hover:text-text"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <Sidebar area={area} />
          </div>
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children ?? <Outlet />}</main>
    </div>
  );
}