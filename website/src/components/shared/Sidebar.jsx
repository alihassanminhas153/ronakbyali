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
} from 'lucide-react';

import useSession from '../../router/useSession';
import { PATHS } from '../../router/path';
import { getAvatarUrl } from '../../store/slices/authSlice';
import LogoutButton from '../../pages/shared/auth/LogoutButton';

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

const itemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
    isActive ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:bg-surface-alt hover:text-text'
  }`;

function Item({ to, icon: Icon, label, end }) {
  return (
    <li>
      <NavLink to={to} end={end} className={itemClass}>
        <Icon size={18} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </NavLink>
    </li>
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
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-alt text-sm font-semibold text-muted">
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
export default function Sidebar({ area = 'user' }) {
  const { user, username, isStaff } = useSession();
  const isAdminArea = area === 'admin';

  const links = isAdminArea ? adminLinks(username) : userLinks(username);
  const profileTo = isAdminArea ? PATHS.admin.settings(username) : PATHS.user.profile(username);

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* who is logged in */}
      <Link
        to={profileTo}
        className="flex items-center gap-3 border-b border-border p-4 transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Avatar profile={user} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-text">
            {user?.name || username}
          </span>
          <span className="block truncate text-xs text-muted">
            {isStaff ? capitalise(user?.role) : user?.email}
          </span>
        </span>
      </Link>

      {/* main links */}
      <nav aria-label={isAdminArea ? 'Admin panel' : 'My account'} className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {links.map((l) => (
            <Item key={l.to} {...l} />
          ))}
        </ul>
      </nav>

      {/* shop, switch panel, log out */}
      <div className="border-t border-border p-3">
        <ul className="flex flex-col gap-1">
          <Item to={PATHS.products} icon={Store} label="Browse shop" />
          <li>
            <LogoutButton className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-60" />
          </li>
        </ul>
      </div>
    </div>
  );
}