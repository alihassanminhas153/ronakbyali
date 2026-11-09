import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import {
  Bell,
  Heart,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  UserRound,
  Users,
  Wallet,
  X,
  ChevronsLeft,
} from 'lucide-react';

import useSession from '../../router/useSession';
import { PATHS } from '../../router/path';
import { getAvatarUrl } from '../../store/slices/authSlice';
import Fold, { IconCell } from './SidebarFold';
import SidebarLogout from './SidebarLogout';

// ---------- links (all URLs come from router/path.js) ----------
const userLinks = (u) => [
  { to: PATHS.user.overview(u), label: 'Overview', icon: LayoutDashboard, end: true },
  { to: PATHS.user.profile(u), label: 'Profile', icon: UserRound },
  { to: PATHS.user.orders(u), label: 'Orders', icon: Package },
  { to: PATHS.user.cart(u), label: 'Cart', icon: ShoppingCart },
  { to: PATHS.user.wishlist(u), label: 'Wishlist', icon: Heart },
  { to: PATHS.user.reviews(u), label: 'Reviews', icon: Star },
  { to: PATHS.user.alerts(u), label: 'Alerts', icon: Bell },
];

const adminLinks = (u) => [
  { to: PATHS.admin.overview(u), label: 'Overview', icon: LayoutDashboard, end: true },
  { to: PATHS.admin.orders(u), label: 'Orders', icon: Package },
  { to: PATHS.admin.products(u), label: 'Products', icon: Store },
  { to: PATHS.admin.users(u), label: 'Users', icon: Users },
  { to: PATHS.admin.finance(u), label: 'Finance', icon: Wallet },
  { to: PATHS.admin.cartAndWishlist(u), label: 'Cart & wishlist', icon: ShoppingBag },
  { to: PATHS.admin.alerts(u), label: 'Alerts', icon: Bell },
  { to: PATHS.admin.settings(u), label: 'Settings', icon: Settings },
];

// ---------- row styles ----------
const ROW =
  'relative flex h-11 w-full items-center rounded-md text-sm transition-colors focus-visible:-outline-offset-2 focus-visible:outline-accent';
const ACTIVE =
  'bg-accent-soft font-medium text-accent before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent';
const IDLE = 'text-muted hover:bg-surface-alt hover:text-text';

const itemClass = ({ isActive }) => `${ROW} ${isActive ? ACTIVE : IDLE}`;

function Item({ to, icon: Icon, label, end, collapsed, onNavigate }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        className={itemClass}
      >
        <IconCell>
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconCell>
        <Fold collapsed={collapsed} className="truncate">
          {label}
        </Fold>
      </NavLink>
    </li>
  );
}

// "Menu" label when open, a thin divider when collapsed (cross-fades).
function SectionLabel({ collapsed, children }) {
  const fade = 'transition-opacity duration-300 motion-reduce:transition-none';
  return (
    <li aria-hidden="true" className="relative h-8">
      <span className={`absolute inset-x-2 top-1/2 h-px bg-border ${fade} ${collapsed ? 'opacity-100' : 'opacity-0'}`} />
      <span
        className={`absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-muted ${fade} ${
          collapsed ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </span>
    </li>
  );
}

// The site favicon (public/favicon.svg). Falls back to a store icon if the file is missing.
function Brand() {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span title="Ronak By Ali" className="flex size-9 items-center justify-center rounded-md bg-accent text-on-accent shadow-soft">
      <Store size={18} strokeWidth={1.75} aria-hidden="true" />
    </span>
  ) : (
    <img
      src="/favicon.svg"
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
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent-soft font-heading text-sm font-semibold text-accent ring-2 ring-accent/20">
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
  const isAdminArea = area === 'admin';
  const title = isAdminArea ? 'Admin panel' : 'My account';

  const links = isAdminArea ? adminLinks(username) : userLinks(username);
  const profileTo = isAdminArea ? PATHS.admin.settings(username) : PATHS.user.profile(username);

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* header: favicon + brand name + panel name, collapse button inside while open */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-3">
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
              className={`shrink-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none ${
                collapsed ? 'max-w-0 opacity-0' : 'max-w-9 opacity-100'
              }`}
            >
              <button
                type="button"
                onClick={onToggleCollapse}
                tabIndex={collapsed ? -1 : 0}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-accent"
              >
                <ChevronsLeft size={18} aria-hidden="true" />
              </button>
            </span>
          )
        )}
      </div>

      {/* who is logged in */}
      <div className="shrink-0 px-3 pt-3">
        <Link
          to={profileTo}
          onClick={onNavigate}
          title={collapsed ? user?.name || username : undefined}
          aria-label={collapsed ? user?.name || username : undefined}
          className="flex gap-2 h-14 items-center rounded-md transition-colors hover:bg-surface-alt focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <IconCell>
            <Avatar profile={user} />
          </IconCell>
          <Fold collapsed={collapsed} className="pr-2">
            <span className="block truncate text-sm font-semibold text-text">{user?.name || username}</span>
            <span className={`block truncate text-xs ${isStaff ? 'font-medium text-accent' : 'text-muted'}`}>
              {isStaff ? capitalise(user?.role) : user?.email}
            </span>
          </Fold>
        </Link>
      </div>

      {/* main links */}
      <nav aria-label={title} className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
        <ul className="flex flex-col gap-1">
          <SectionLabel collapsed={collapsed}>Menu</SectionLabel>
          {links.map((l) => (
            <Item key={l.to} {...l} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>

      {/* shop + sign out */}
      <div className="shrink-0 border-t border-border p-3">
        <ul className="flex flex-col gap-1">
          <Item to={PATHS.products} icon={Store} label="Browse shop" collapsed={collapsed} onNavigate={onNavigate} />
          <li>
            <SidebarLogout collapsed={collapsed} />
          </li>
        </ul>
      </div>
    </div>
  );
}