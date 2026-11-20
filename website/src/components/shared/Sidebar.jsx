import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { X, ChevronsLeft, Store } from 'lucide-react';

import useSession from '../../router/useSession';
import { PATHS } from '../../router/path';
import { getAvatarUrl } from '../../store/slices/authSlice';
import Fold, { IconCell } from './SidebarFold';
import SidebarLogout from './SidebarLogout';
import SidebarThemeToggle from './SidebarThemeToggle';
import usePanelAccess from '../../lib/layout/usePanelAccess';
import useUserLabels from '../../lib/layout/useUserLabels';
import { visiblePages } from '../../lib/layout/layoutRegistry';

// ---------- motion ----------
const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';
const STAGGER_MS = 35;

// Flips to true just after the first paint so rows can slide in one after another.
// The drawer mounts a fresh Sidebar each time it opens, so it plays there too.
function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return ready;
}

const enterClass = (ready) =>
  `transition-[opacity,transform] duration-500 ${EASE} motion-reduce:transition-none ${
    ready ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'
  }`;
const enterStyle = (ready, index) => ({ transitionDelay: ready ? `${index * STAGGER_MS}ms` : '0ms' });

// ---------- row styles ----------
const ROW =
  'group relative flex h-11 w-full items-center rounded-md text-sm transition-colors duration-200 focus-visible:-outline-offset-2 focus-visible:outline-accent';
// Rows that sit on the gliding pill only change text colour. The pill draws the background.
const ACTIVE_TEXT = 'font-medium text-accent';
const ACTIVE_BG = 'bg-accent-soft font-medium text-accent';
const IDLE = 'text-muted hover:bg-surface-alt hover:text-text';

function Item({ to, icon: Icon, label, end, collapsed, onNavigate, slide = true, ready, index = 0 }) {
  return (
    <li className={enterClass(ready)} style={enterStyle(ready, index)}>
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        data-slide={slide ? '' : undefined}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        className={({ isActive }) => `${ROW} ${isActive ? (slide ? ACTIVE_TEXT : ACTIVE_BG) : IDLE}`}
      >
        {({ isActive }) => (
          <>
            <IconCell>
              {/* icon tile: fills with the accent colour on the current page */}
              <span
                className={`grid size-9 place-items-center rounded-lg transition-[background-color,color,box-shadow,transform] duration-300 motion-reduce:transition-none ${
                  isActive
                    ? 'bg-accent text-on-accent shadow-soft'
                    : 'group-hover:bg-bg group-hover:shadow-soft'
                }`}
              >
                <Icon
                  size={19}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={`transition-transform duration-300 ${EASE} group-hover:scale-110 motion-reduce:transition-none`}
                />
              </span>
            </IconCell>
            <Fold collapsed={collapsed} className="truncate">
              {label}
            </Fold>
          </>
        )}
      </NavLink>
    </li>
  );
}

// The site favicon. Falls back to a store icon if the file is missing.
function Brand() {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span title="Ronak By Ali" className="flex size-9 items-center justify-center rounded-md bg-accent text-on-accent shadow-soft">
      <Store size={18} strokeWidth={1.75} aria-hidden="true" />
    </span>
  ) : (
    <img
      src="/images/icons/branding/favicon.ico"
      alt=""
      title="Ronak By Ali"
      onError={() => setFailed(true)}
      className="size-9 rounded-md border border-border bg-bg object-contain p-1"
    />
  );
}

// Photo from Google (avatarUrl) or from storage (avatarFileId); initials when there is none.
function Avatar({ profile }) {
  const [broken, setBroken] = useState('');
  const src = String(profile?.avatarUrl || getAvatarUrl(profile?.avatarFileId) || '');
  const seed = profile?.name || profile?.username || profile?.email || '?';
  const initials = seed
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <span className="relative flex size-10 shrink-0">
      <span className="flex size-full items-center justify-center overflow-hidden rounded-full border border-border bg-accent-soft font-heading text-sm font-semibold text-accent ring-2 ring-accent/20 transition-shadow duration-300 group-hover:ring-accent/50">
        {src && src !== broken ? (
          <img
            src={src}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBroken(src)}
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </span>
      {/* signed-in dot */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface"
      />
    </span>
  );
}

const capitalise = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

// One sidebar for both dashboards:  <Sidebar area="user" />  or  <Sidebar area="admin" />
//   collapsed  : icon-only rail (DashboardShell sets this on large screens only)
//   onNavigate : called when a link is clicked (the phone drawer closes itself with it)
//   onClose    : phone drawer only, shows a close button in the header
//   onToggleCollapse : desktop only, shows the collapse button inside the header while open
export default function Sidebar({ area = 'user', collapsed = false, onNavigate, onClose, onToggleCollapse }) {
  const { user, username, isStaff } = useSession();
  const { pathname } = useLocation();
  const ready = useReady();
  const isAdminArea = area === 'admin';
  const title = isAdminArea ? 'Admin panel' : 'My account';

  // Which pages show up comes from Settings > Layout & access (Appwrite `ronakbyali_panel_access` table).
  // The page list itself lives in lib/layout/layoutRegistry.js. Without saved rows every page shows.
  const { rows: layoutRows } = usePanelAccess();
  const userLabels = useUserLabels();
  const links = useMemo(
    () =>
      visiblePages(area, layoutRows, userLabels).map((p) => ({
        id: p.key,
        to: p.to(username),
        label: p.label,
        icon: p.icon,
        end: p.end,
      })),
    [area, layoutRows, userLabels, username]
  );
  const linkKey = links.map((l) => l.id).join('|');
  const profileTo = isAdminArea ? PATHS.admin.settings(username) : PATHS.user.profile(username);

  // ---- gliding active pill ----
  // One highlight element that moves to whichever link is current (NavLink marks it aria-current).
  const wrapRef = useRef(null);
  const [pill, setPill] = useState({ y: 0, h: 0, visible: false, animate: false });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => {
      const active = wrap.querySelector('a[data-slide][aria-current="page"]');
      setPill((prev) => {
        const next = active
          ? { y: active.offsetTop, h: active.offsetHeight, visible: true, animate: prev.visible }
          : { ...prev, visible: false };
        return next.y === prev.y && next.h === prev.h && next.visible === prev.visible && next.animate === prev.animate
          ? prev
          : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [pathname, isAdminArea, username, linkKey]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* header: favicon + brand name + panel name, collapse button inside while open */}
      <div className="flex h-16 shrink-0 items-center border-b border-border bg-linear-to-b from-accent-soft/60 to-surface px-3">
        <IconCell>
          <Brand />
        </IconCell>
        <Fold collapsed={collapsed} className="min-w-0 flex-1">
          <span className="block truncate font-heading text-base font-semibold leading-tight text-text">Ronak By Ali</span>
          <span className="block truncate text-xs text-muted">{title}</span>
        </Fold>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : (
          onToggleCollapse && (
            <span
              aria-hidden={collapsed || undefined}
              className={`shrink-0 overflow-hidden transition-[max-width,opacity] duration-300 ${EASE} motion-reduce:transition-none ${
                collapsed ? 'max-w-0 opacity-0' : 'max-w-9 opacity-100'
              }`}
            >
              <button
                type="button"
                onClick={onToggleCollapse}
                tabIndex={collapsed ? -1 : 0}
                aria-label="Collapse sidebar"
                title="Collapse sidebar (Ctrl+B)"
                className="group flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-accent"
              >
                <ChevronsLeft
                  size={18}
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:-translate-x-0.5 motion-reduce:transition-none"
                />
              </button>
            </span>
          )
        )}
      </div>

      {/* who is logged in */}
      <div className={`shrink-0 px-3 pt-3 ${enterClass(ready)}`} style={enterStyle(ready, 1)}>
        <Link
          to={profileTo}
          onClick={onNavigate}
          title={collapsed ? user?.name || username : undefined}
          aria-label={collapsed ? user?.name || username : undefined}
          className="group flex h-14 items-center rounded-md transition-colors duration-200 hover:bg-surface-alt focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <IconCell>
            <Avatar profile={user} />
          </IconCell>
          <Fold collapsed={collapsed} className="pr-2">
            <span className="block truncate text-sm font-semibold text-text">{user?.name || username}</span>
            {isStaff ? (
              <span className="mt-0.5 inline-block rounded-full bg-accent-soft px-2 py-px text-[11px] font-medium leading-4 text-accent">
                {capitalise(user?.role)}
              </span>
            ) : (
              <span className="block truncate text-xs text-muted">{user?.email}</span>
            )}
          </Fold>
        </Link>
      </div>

      {/* main links */}
      <nav aria-label={title} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-3">
        <div ref={wrapRef} className="relative">
          <span
            aria-hidden="true"
            style={{
              height: pill.h,
              transform: `translateY(${pill.y}px)`,
              transitionDuration: pill.animate ? '400ms' : '0ms',
            }}
            className={`pointer-events-none absolute left-0 top-0 w-full rounded-md bg-accent-soft transition-[transform,height,opacity] ${EASE} motion-reduce:transition-none ${
              pill.visible ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <ul className="flex flex-col gap-1">
            {links.map((l, i) => (
              <Item
                key={l.id}
                to={l.to}
                icon={l.icon}
                label={l.label}
                end={l.end}
                collapsed={collapsed}
                onNavigate={onNavigate}
                ready={ready}
                index={i + 2}
              />
            ))}
          </ul>
        </div>
      </nav>

      {/* shop + appearance + sign out */}
      <div
        className={`sticky bottom-0 z-10 shrink-0 border-t border-border bg-surface p-3 ${enterClass(ready)}`}
        style={enterStyle(ready, links.length + 3)}
      >
        <ul className="flex flex-col gap-1">
          <Item
            to={PATHS.products}
            icon={Store}
            label="Browse shop"
            collapsed={collapsed}
            onNavigate={onNavigate}
            slide={false}
            ready
          />
          <li>
            <SidebarThemeToggle collapsed={collapsed} />
          </li>
          <li>
            <SidebarLogout collapsed={collapsed} />
          </li>
        </ul>
      </div>
    </div>
  );
}
