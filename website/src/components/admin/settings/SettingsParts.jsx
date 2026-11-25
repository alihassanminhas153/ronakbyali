import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';

import AppIcon from '../../../ui/custom/AppIcon';
import { getAvatarUrl } from '../../../store/slices/authSlice';
import { initials } from './settingsMeta';

/* ---------- icons: the .ico files at /images/icons/app_icons, one colour family ---------- */

export const Ico = ({ name, className = 'size-6', tone = 1, entity, hueRotate = true }) => (
  <AppIcon name={name} tone={tone} entity={entity} hueRotate={hueRotate} className={`${className} shrink-0 object-contain`} />
);

// <Tabs> wants a component for `icon`. Create these once at module level:
//   const ProfileIcon = tabIcon('user');
export const tabIcon = (name, tone = 1) => {
  const TabIcon = ({ className = '' }) => <Ico name={name} tone={tone} className={`size-6 ${className}`} />;
  return TabIcon;
};

/* ---------- small pieces (accent + neutral only) ---------- */

export function Banner({ kind = 'error', children, onDismiss }) {
  const error = kind === 'error';
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
        error ? 'border-error/40 bg-error/10 text-error' : 'border-accent/40 bg-accent/10 text-accent'
      }`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// tone: 'plain' | 'add' | 'remove'
export function Chip({ children, tone = 'plain' }) {
  const styles = {
    plain: 'bg-surface-alt text-text',
    add: 'bg-accent/15 text-accent',
    remove: 'bg-error/10 text-error line-through',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

export function RoleChip({ role }) {
  const value = role || 'new';
  const style =
    value === 'admin'
      ? 'bg-accent text-white'
      : ['support', 'manager'].includes(value)
        ? 'border border-accent/50 text-accent'
        : 'bg-surface-alt text-text';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>{value}</span>;
}

export function Avatar({ user, src, size = 'size-9 text-xs' }) {
  const [failed, setFailed] = useState(false);
  const url = src || (user?.avatarFileId ? String(getAvatarUrl(user.avatarFileId) || '') : '');
  useEffect(() => setFailed(false), [url]);
  if (url && !failed) {
    return <img src={url} alt="" onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full border border-border object-cover`} />;
  }
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full border border-border bg-surface-alt font-medium text-text`}>
      {initials(user)}
    </span>
  );
}

export const smallButton =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60';

// Renders children straight into <body>. A `position: fixed` element inside an animated
// page container is sized to that container, not the screen; a portal avoids that.
export const Portal = ({ children }) => createPortal(children, document.body);

/* ---------- right-hand drawer (same slide-in as UserForm / ProductForm) ---------- */

export function SlideDrawer({ open, title, subtitle, onClose, footer, busy = false, children }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose?.();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, busy]);

  return createPortal(
    <div
      className="fixed inset-0 z-[55]"
      style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? 0 : 350}ms` }}
      aria-hidden={!open}
    >
      <div
        onClick={() => !busy && onClose?.()}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full min-w-0 max-w-xl flex-col overflow-x-hidden border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading truncate text-text">{title}</h2>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6">{children}</div>

        {footer && <footer className="flex min-w-0 items-center justify-end gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/* ---------- pagination ---------- */

const pagesFor = (page, count) => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const list = [...new Set([1, count, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
};

export function Pagination({ page, pageCount, total, pageSize, onPage }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const base = 'grid h-9 min-w-9 place-items-center rounded-md border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${base} border-border bg-surface text-text hover:border-accent`}>
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-sm text-muted sm:hidden">
          Page {page} of {pageCount}
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          {pagesFor(page, pageCount).map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="px-1 text-muted">…</span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPage(p)}
                className={`${base} ${p === page ? 'border-accent bg-accent text-white' : 'border-border bg-surface text-text hover:border-accent'}`}
              >
                {p}
              </button>
            )
          )}
        </span>
        <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className={`${base} border-border bg-surface text-text hover:border-accent`}>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}