import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import '../users/userScroll.css';

import { tint, toneVar } from '../../../ui/graphs/utils';

// Pieces shared by the drawer forms. Same look as ProductForm / UserForm.

export const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-accent-tone-1 disabled:opacity-60 ${
    err ? 'border-error' : 'border-border hover:border-accent-tone-1/50'
  }`;

export function SectionHead({ icon: Icon, title, subtitle, tone, lockLabel }) {
  const color = toneVar(tone);
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/sec:-rotate-6 group-hover/sec:scale-110"
        style={{ background: tint(color, 14), color }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="heading-sm" style={{ color }}>{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {lockLabel && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
          <Lock size={11} aria-hidden="true" /> {lockLabel}
        </span>
      )}
    </div>
  );
}

export function Section({ title, subtitle, icon, tone = 1, lockLabel, children, delay = 0 }) {
  return (
    <section
      style={{ animationDelay: `${delay}ms`, borderTopColor: toneVar(tone) }}
      className="group/sec animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4"
    >
      <SectionHead icon={icon} title={title} subtitle={subtitle} tone={tone} lockLabel={lockLabel} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({ label, hint, error, optional, children, className = '' }) {
  return (
    <div className={className}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-text">
        <span>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</span>
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-error">{error}</span>}
    </div>
  );
}

// A read-only value, drawn like a disabled input.
export function ReadValue({ label, children, className = '' }) {
  return (
    <Field label={label} className={className}>
      <div className="min-h-[2.5rem] whitespace-pre-wrap break-words rounded-md border border-border bg-surface px-3 py-2 text-sm text-text">
        {children}
      </div>
    </Field>
  );
}

// Right-hand drawer with overlay, the same slide-in as ProductForm.
export function DrawerShell({ open, onClose, title, subtitle, label, headerExtra, children, footer }) {
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
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <div
      className="fixed inset-0 z-40"
      style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? 0 : 350}ms` }}
      aria-hidden={!open}
    >
      <div onClick={() => onClose?.()} className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading flex items-center gap-3 truncate text-text">{title}{headerExtra}</h2>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>
        <div className="user-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">{footer}</footer>
      </div>
    </div>
  );
}