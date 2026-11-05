import { useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';

// One small entrance for the form and a slow drift for the background glow on the image side.
// Both are switched off for people who prefer reduced motion.
const CSS = `
@keyframes auth-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes auth-drift { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(4%, -5%, 0) scale(1.1); } }
.auth-rise { animation: auth-rise .6s cubic-bezier(.22, 1, .36, 1) both; }
.auth-drift { animation: auth-drift 14s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .auth-rise, .auth-drift { animation: none; } }
`;

// Page frame for the auth screens.
//   < lg  : only the form, centered on the screen
//   >= lg : two halves, form on the left (centered in its half) and an image on the right
//
// The frame is fixed over the whole viewport, so the site header/footer from the layout
// never shows on these pages.
//
// `image` is a path inside your /public folder (default /auth-side.jpg). If the file is
// missing, a themed gradient is shown instead.
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  image = '/auth-side.jpg',
  imageTitle,
  imageText,
}) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-bg text-text">
      <style>{CSS}</style>

      <div className="grid min-h-full lg:grid-cols-2">
        {/* ---------- form half ---------- */}
        <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
          <div className="auth-rise w-full max-w-md lg:max-w-lg">
            <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide text-text lg:text-5xl">
              {title}
            </h1>
            {subtitle && <p className="mt-3 text-sm text-muted lg:text-base">{subtitle}</p>}

            <div className="mt-8 flex flex-col gap-5">{children}</div>

            {footer && <p className="mt-8 text-center text-sm text-muted lg:text-base">{footer}</p>}
          </div>
        </section>

        {/* ---------- image half (large screens only) ---------- */}
        <SidePanel image={image} title={imageTitle} text={imageText} />
      </div>
    </div>
  );
}

function SidePanel({ image, title, text }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;

  return (
    <aside className="relative hidden overflow-hidden border-l border-border bg-surface-alt text-accent lg:block">
      {/* themed fallback art, shown when there is no image */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, color-mix(in srgb, currentColor 24%, transparent), transparent 65%)' }}
      />
      <span className="auth-drift absolute -left-24 top-1/4 size-96 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
      <span
        className="auth-drift absolute -bottom-20 -right-10 size-80 rounded-full bg-accent/15 blur-3xl"
        style={{ animationDelay: '-7s' }}
        aria-hidden="true"
      />

      {showImage && (
        <>
          <img
            src={image}
            alt=""
            onError={() => setFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.05) 60%)' }}
          />
        </>
      )}

      {(title || text) && (
        <div className={`absolute inset-x-0 bottom-0 p-12 xl:p-16 ${showImage ? 'text-white' : 'text-text'}`}>
          {title && <p className="font-display text-3xl font-bold leading-tight xl:text-4xl">{title}</p>}
          {text && <p className={`mt-3 max-w-sm text-base ${showImage ? 'text-white/80' : 'text-muted'}`}>{text}</p>}
        </div>
      )}
    </aside>
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

// Neutral information banner (used after too many failed log-ins).
export function Notice({ children }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm text-text"
    >
      <Info size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

// Shows the email chosen in step 1, with a way to go back and change it.
export function EmailChip({ email, onChange, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-alt px-3.5 py-3 text-sm lg:text-base">
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