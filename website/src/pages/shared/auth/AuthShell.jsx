import { AlertCircle } from 'lucide-react';

// Page frame for the auth screens: one card, centered, fluid on every screen size.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:py-16">
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide text-text sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
        <div className="mt-7 flex flex-col gap-4">{children}</div>
      </div>
      {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
    </main>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" role="separator">
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
      className="flex items-start gap-2 rounded-sm border border-error bg-error/10 px-3 py-2.5 text-sm text-error"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}