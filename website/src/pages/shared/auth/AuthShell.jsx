import { AlertCircle } from 'lucide-react';

// Page frame for the auth screens: one flat card, centered, fluid on every screen size.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col px-4 py-12 sm:py-20">
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-wide text-text sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2.5 text-sm text-muted">{subtitle}</p>}
        <div className="mt-7 flex flex-col gap-4">{children}</div>
      </div>
      {footer && <p className="mt-5 text-center text-sm text-muted">{footer}</p>}
    </main>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted" role="separator">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-error"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

// Shows the email chosen in step 1, with a way to go back and change it.
export function EmailChip({ email, onChange, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-alt px-3.5 py-2.5 text-sm">
      <span className="truncate text-text">{email}</span>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="shrink-0 font-medium text-accent transition-colors hover:text-accent-hover disabled:opacity-60"
      >
        Change
      </button>
    </div>
  );
}