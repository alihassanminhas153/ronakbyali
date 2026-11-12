import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';

import ThemeToggle from '../../../ui/custom/toggles/ThemeToggle';
import AlertBell from './AlertBell';
import useHeaderData from './useHeaderData';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

const initialsOf = (name = '') =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

function Avatar({ name, src }) {
  const [brokenSrc, setBrokenSrc] = useState('');
  const showImage = src && brokenSrc !== src;

  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-accent-soft text-sm font-semibold text-accent">
      {showImage ? (
        <img src={src} alt="" onError={() => setBrokenSrc(src)} className="h-full w-full object-cover" />
      ) : (
        initialsOf(name) || '?'
      )}
    </span>
  );
}

function PageLink({ page, onClick, currentPath }) {
  const active = currentPath === page.link;
  return (
    <Link
      to={page.link}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none ${
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-alt hover:text-text'
      } ${FOCUS}`}
    >
      {page.name}
    </Link>
  );
}

export default function Header({ logo, pages = [] }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const wasMenuOpen = useRef(false);
  const { signedIn, name, avatar, accountPath, alertPath, ...alertData } = useHeaderData();

  useEffect(() => {
    if (menuOpen) {
      wasMenuOpen.current = true;
    } else if (wasMenuOpen.current) {
      menuButtonRef.current?.focus();
      wasMenuOpen.current = false;
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
          <Link
            to="/"
            aria-label="Ronak by Ali, home"
            className={`shrink-0 rounded-lg text-lg font-bold tracking-tight text-text transition-colors hover:text-accent sm:text-xl ${FOCUS}`}
          >
            {logo ?? 'Ronak by Ali'}
          </Link>

          <div className="flex items-center gap-2">
            <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
              {pages.map((page) => (
                <PageLink key={page.link} page={page} currentPath={pathname} />
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              {signedIn ? (
                <>
                  <AlertBell data={{ ...alertData, alertPath }} />
                  <Link
                    to={accountPath}
                    aria-label="Your account"
                    className={`rounded-full p-0.5 transition-opacity duration-200 hover:opacity-80 motion-reduce:transition-none ${FOCUS}`}
                  >
                    <Avatar name={name} src={avatar} />
                  </Link>
                </>
              ) : (
                <Link
                  to="/welcome-back"
                  className={`hidden h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-text transition-colors duration-200 hover:border-accent/50 hover:bg-accent-soft hover:text-accent motion-reduce:transition-none sm:inline-flex ${FOCUS}`}
                >
                  Sign in
                </Link>
              )}
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                className={`grid size-10 place-items-center rounded-full text-text transition-colors hover:bg-surface-alt md:hidden ${FOCUS}`}
              >
                <Menu size={21} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-[opacity,visibility] duration-300 motion-reduce:transition-none md:hidden ${
          menuOpen
            ? 'visible opacity-100 [transition-delay:0ms,0ms]'
            : 'invisible pointer-events-none opacity-0 [transition-delay:0ms,300ms]'
        }`}
        inert={!menuOpen}
      >
        <button
          type="button"
          tabIndex={menuOpen ? 0 : -1}
          aria-label="Close navigation menu"
          onClick={closeMenu}
          className="absolute inset-0 size-full cursor-default"
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={`absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-border bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
            menuOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">Menu</h2>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className={`grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-alt hover:text-text ${FOCUS}`}
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile navigation" className="grid gap-1">
            {pages.map((page) => (
              <PageLink key={page.link} page={page} currentPath={pathname} onClick={closeMenu} />
            ))}
          </nav>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-text">Appearance</span>
            <ThemeToggle />
          </div>

          <div className="mt-4 border-t border-border pt-4 sm:hidden">
            {signedIn ? (
              <Link
                to={accountPath}
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-text hover:bg-surface-alt ${FOCUS}`}
              >
                <Avatar name={name} src={avatar} />
                <span>Your account</span>
              </Link>
            ) : (
              <Link
                to="/welcome-back"
                onClick={closeMenu}
                className={`flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover ${FOCUS}`}
              >
                Sign in
              </Link>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
