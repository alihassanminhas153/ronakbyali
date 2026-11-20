import { Link, useNavigate } from 'react-router';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

import AccessDeniedArt from '../../../ui/art/AccessDeniedArt';
import useSession from '../../../router/useSession';
import { PATHS } from '../../../router/path';

// Shown instead of a page when the signed-in person's label is blocked from it
// (Settings > Layout & access). The URL stays the same; nothing from the page itself is loaded.
//   area      : 'admin' | 'user'
//   page      : the registry entry of the blocked page (optional)
//   blockedBy : the label that caused the block (optional)
export default function AccessDenied({ area = 'admin', page, blockedBy }) {
  const navigate = useNavigate();
  const { username } = useSession();
  const home = PATHS[area]?.overview(username) || '/';

  return (
    <section role="alert" className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-6 text-center sm:py-12">
      <AccessDeniedArt className="w-full max-w-md" />

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Error 403</p>
        <h1 className="heading mt-1 text-3xl text-text sm:text-4xl">Access denied</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          {blockedBy ? <>Accounts with the <strong className="font-semibold text-text">{blockedBy}</strong> label</> : 'Your account'} can’t open{' '}
          <strong className="font-semibold text-text">{page?.label || 'this page'}</strong>. If you think this is a mistake, ask an admin to
          change the access rules in Settings.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to={home}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-heading text-sm font-semibold text-on-accent transition hover:opacity-90 focus-visible:ring-4 focus-visible:ring-accent/20"
        >
          <LayoutDashboard size={16} aria-hidden="true" />
          Back to overview
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 font-heading text-sm font-semibold text-text transition hover:border-accent hover:text-accent focus-visible:ring-4 focus-visible:ring-accent/20"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Go back
        </button>
      </div>
    </section>
  );
}
