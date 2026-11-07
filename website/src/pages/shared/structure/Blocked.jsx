import { Ban, Mail, Phone } from 'lucide-react';

import { useAppSelector } from '../../../store/slices/hooks';
import { selectMe } from '../../../store/slices/userSlice';
import useEntered from '../../../ui/custom/motion/useEntered';
import LogoutButton from '../auth/LogoutButton';

// Set these in .env (Vite):  VITE_SUPPORT_EMAIL=...   VITE_SUPPORT_PHONE=...
// Either one can be left out. There is deliberately no link to the Contact page or
// anywhere else: a blocked user can only read this page or log out.
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '';

// Same look as ActionButton's secondary variant (size md).
const LOGOUT_CLASS =
  'inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 text-[0.95rem] font-medium text-text transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60';

const LINK =
  'inline-flex items-center gap-2 text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export default function Blocked() {
  const me = useAppSelector(selectMe);
  const entered = useEntered();

  const mailto = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('My account is blocked')}`
    : '';
  const tel = SUPPORT_PHONE ? `tel:${SUPPORT_PHONE.replace(/\s+/g, '')}` : '';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10 text-text">
      <section
        aria-labelledby="blocked-title"
        className={`w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-soft transition duration-500 ease-out motion-reduce:transition-none sm:p-8 ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-error/30 bg-error/10 text-error">
          <Ban size={26} aria-hidden="true" />
        </div>

        <h1 id="blocked-title" className="mt-5 text-xl font-semibold">
          Your account is blocked
        </h1>
        <p className="mt-2 text-sm text-muted">
          You can’t use the store right now. If you think this is a mistake, contact support and
          we’ll look into it.
        </p>
        {me?.email && (
          <p className="mt-1 text-sm text-muted">
            Signed in as <span className="text-text">{me.email}</span>
          </p>
        )}

        <div className="mt-6 space-y-3 rounded-md border border-border bg-bg p-4 text-left text-sm">
          {mailto && (
            <a href={mailto} className={LINK}>
              <Mail size={16} aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
          )}
          {tel && (
            <p>
              <a href={tel} className={LINK}>
                <Phone size={16} aria-hidden="true" />
                {SUPPORT_PHONE}
              </a>
            </p>
          )}
          {!mailto && !tel && <p className="text-muted">Please contact the store team.</p>}
        </div>

        <div className="mt-6 flex justify-center">
          <LogoutButton className={LOGOUT_CLASS} />
        </div>
      </section>
    </main>
  );
}