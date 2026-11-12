import { memo } from 'react';
import './userScroll.css';
import { Ban, Eye, Loader2, UserCheck } from 'lucide-react';

import SwitchInput from '../../../ui/custom/input/SwitchInput';
import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import { Avatar, BlockedBadge, CityChip, ProviderChip, RoleBadge } from './UserBadges';
import { blockLockReason, formatInt, formatMoney, fullDate, timeAgo } from './userFields';

const COLUMNS = [
  { label: 'User' },
  { label: 'Contact' },
  { label: 'Role' },
  { label: 'Sign-in' },
  { label: 'Last login' },
  { label: 'Joined' },
  { label: 'Orders', right: true },
  { label: 'Access' },
  { label: 'Actions', right: true },
];

const stop = (e) => e.stopPropagation(); // controls inside a clickable row must not open it
const rise = (i) => ({ animationDelay: `${Math.min(i, 12) * 35}ms` });
const ICON_BTN =
  'grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50';

// Table on wide screens (xl+), cards below. The horizontal scroller hides its scrollbar.
function Shell({ children, always = false }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-surface ${always ? '' : 'hidden xl:block'}`}>
      <div className="user-scroll overflow-x-auto">
        <table className="w-full min-w-[64rem] text-left">
          <thead className="bg-surface-alt/60 text-xs text-muted">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.label} className={`px-4 py-3 font-medium ${column.right ? 'text-right' : ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

// "3 days ago" with the exact date in a custom label. A green dot marks the last 24 hours.
function When({ value, live = false }) {
  if (!value) return <span className="text-sm text-muted">Never</span>;
  const recent = live && Date.now() - new Date(value).getTime() < 86400000;
  return (
    <Tooltip label={fullDate(value)}>
      <time dateTime={value} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted">
        {recent && <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-accent-tone-7" />}
        {timeAgo(value)}
      </time>
    </Tooltip>
  );
}

function AccessSwitch({ user, blocked, pending, lock, onToggleBlocked }) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip label={lock} className={lock ? 'cursor-not-allowed' : ''}>
        {/* SwitchInput is a boxed field, so it is flattened to fit a table cell. */}
        <SwitchInput
          label={blocked ? 'Blocked' : 'Active'}
          checked={blocked}
          disabled={pending || Boolean(lock)}
          onChange={(next) => onToggleBlocked?.(user, next)}
          className="border-0! bg-transparent! p-0!"
        />
      </Tooltip>
      {pending && <Loader2 size={16} className="animate-spin text-muted" role="status" aria-label="Saving" />}
    </div>
  );
}

function Actions({ user, label, blocked, pending, lock, onView, onToggleBlocked }) {
  return (
    <div className="flex items-center gap-0.5">
      <Tooltip label="View details">
        <button type="button" onClick={() => onView?.(user)} aria-label={`View ${label}`} className={`${ICON_BTN} hover:text-text`}>
          <Eye size={18} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip
        label={lock || (blocked ? 'Unblock user' : 'Block user')}
        tone={lock || blocked ? 'default' : 'danger'}
        className={lock ? 'cursor-not-allowed' : ''}
      >
        <button
          type="button"
          disabled={pending || Boolean(lock)}
          onClick={() => onToggleBlocked?.(user, !blocked)}
          aria-label={`${blocked ? 'Unblock' : 'Block'} ${label}`}
          className={`${ICON_BTN} ${blocked ? 'hover:text-success' : 'hover:bg-error/10 hover:text-error'}`}
        >
          {blocked ? <UserCheck size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}
        </button>
      </Tooltip>
    </div>
  );
}

function rowProps(user, meId) {
  return {
    isSelf: user.$id === meId,
    blocked: user.isBlocked === true,
    lock: blockLockReason(user, meId),
    label: user.name || user.username || user.email,
  };
}

const UserRow = memo(function UserRow({ user, index, meId, pending, onView, onToggleBlocked }) {
  const { isSelf, blocked, lock, label } = rowProps(user, meId);
  const dim = blocked ? 'opacity-60' : '';

  return (
    <tr
      style={rise(index)}
      aria-busy={pending || undefined}
      onClick={() => onView?.(user)}
      className={`group/row cursor-pointer animate-rise transition-colors hover:bg-surface-alt/50 focus-within:bg-surface-alt/50 ${blocked ? 'bg-error/5' : ''}`}
    >
      <td className={`px-4 py-3 ${dim}`}>
        <div className="flex items-center gap-3">
          <Avatar user={user} className="group-hover/row:scale-105" />
          <div className="min-w-0 max-w-52">
            <p className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-text">{user.name || '—'}</span>
              {isSelf && <span className="shrink-0 text-xs text-muted">(you)</span>}
            </p>
            <p className="truncate text-xs text-muted transition-colors duration-200 group-hover/row:text-accent-tone-7">@{user.username || '—'}</p>
          </div>
        </div>
      </td>

      <td className={`px-4 py-3 ${dim}`}>
        <p className="max-w-52 truncate text-sm text-text">{user.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {user.phone && <span className="text-xs text-muted tabular-nums">{user.phone}</span>}
          <CityChip city={user.lastCity} />
          {!user.phone && !user.lastCity && <span className="text-xs text-muted">—</span>}
        </div>
      </td>

      <td className={`px-4 py-3 ${dim}`}>
        <div className="flex flex-col items-start gap-1">
          <RoleBadge role={user.role} />
          {blocked && <BlockedBadge />}
        </div>
      </td>

      <td className={`px-4 py-3 ${dim}`}><ProviderChip provider={user.authProvider} /></td>
      <td className={`px-4 py-3 ${dim}`}><When value={user.lastLoginAt} live /></td>
      <td className={`px-4 py-3 ${dim}`}><When value={user.$createdAt} /></td>

      <td className={`whitespace-nowrap px-4 py-3 text-right ${dim}`}>
        <p className="text-sm font-medium tabular-nums text-text">{formatInt(user.ordersCount)}</p>
        <p className="text-xs tabular-nums text-muted">{formatMoney(user.totalSpent)}</p>
      </td>

      <td className="cursor-default px-4 py-3" onClick={stop}>
        <AccessSwitch user={user} blocked={blocked} pending={pending} lock={lock} onToggleBlocked={onToggleBlocked} />
      </td>

      <td className="cursor-default px-4 py-3" onClick={stop}>
        <div className="flex justify-end">
          <Actions user={user} label={label} blocked={blocked} pending={pending} lock={lock} onView={onView} onToggleBlocked={onToggleBlocked} />
        </div>
      </td>
    </tr>
  );
});

const UserCard = memo(function UserCard({ user, index, meId, pending, onView, onToggleBlocked }) {
  const { isSelf, blocked, lock, label } = rowProps(user, meId);
  return (
    <li
      style={rise(index)}
      aria-busy={pending || undefined}
      onClick={() => onView?.(user)}
      className={`group/row cursor-pointer animate-rise rounded-lg border bg-surface p-3 transition-colors hover:border-accent/40 ${blocked ? 'border-error/30 bg-error/5' : 'border-border'}`}
    >
      <div className="flex gap-3">
        <Avatar user={user} size="size-12 text-sm" className="group-hover/row:scale-105" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text">{user.name || '—'}</span>
            {isSelf && <span className="shrink-0 text-xs text-muted">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted transition-colors group-hover/row:text-accent-tone-7">@{user.username || '—'}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={user.role} />
            <ProviderChip provider={user.authProvider} />
            <CityChip city={user.lastCity} />
            {blocked && <BlockedBadge />}
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div><dt className="text-muted">Last login</dt><dd className="mt-0.5"><When value={user.lastLoginAt} live /></dd></div>
        <div><dt className="text-muted">Joined</dt><dd className="mt-0.5"><When value={user.$createdAt} /></dd></div>
        <div className="text-right"><dt className="text-muted">Orders</dt><dd className="mt-0.5 text-sm tabular-nums text-text">{formatInt(user.ordersCount)} · {formatMoney(user.totalSpent)}</dd></div>
      </dl>

      <div onClick={stop} className="mt-3 flex cursor-default items-center justify-between gap-3 border-t border-border pt-3">
        <AccessSwitch user={user} blocked={blocked} pending={pending} lock={lock} onToggleBlocked={onToggleBlocked} />
        <Actions user={user} label={label} blocked={blocked} pending={pending} lock={lock} onView={onView} onToggleBlocked={onToggleBlocked} />
      </div>
    </li>
  );
});

// users: the rows to show. pendingIds: selectPendingUserIds.
// onToggleBlocked(user, nextBlocked) is called by the switch and the block button.
export default function UserTable({ users, meId = null, pendingIds = [], onView, onToggleBlocked }) {
  const shared = { meId, onView, onToggleBlocked };
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:hidden">
        {users.map((user, index) => (
          <UserCard key={user.$id} user={user} index={index} pending={pendingIds.includes(user.$id)} {...shared} />
        ))}
      </ul>
      <Shell>
        {users.map((user, index) => (
          <UserRow key={user.$id} user={user} index={index} pending={pendingIds.includes(user.$id)} {...shared} />
        ))}
      </Shell>
    </>
  );
}

export function UserTableSkeleton({ rows = 6 }) {
  return (
    <Shell always>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden="true">
          {COLUMNS.map((column, col) => (
            <td key={column.label} className="px-4 py-4">
              <div className={`h-4 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none ${col === 0 ? 'w-40' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </Shell>
  );
}