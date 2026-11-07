import { memo } from 'react';
import { Ban, Eye, Loader2, UserCheck } from 'lucide-react';

import SwitchInput from '../../../ui/custom/input/SwitchInput';
import useEntered from '../../../ui/custom/motion/useEntered';
import { Avatar, BlockedBadge, ProviderChip, RoleBadge } from './UserBadges';
import { blockLockReason, formatInt, formatMoney, fullDate, timeAgo } from './userFields';

const COLUMNS = [
  { label: 'User' },
  { label: 'Contact' },
  { label: 'Role' },
  { label: 'Blocked' },
  { label: 'Orders', right: true },
  { label: 'Spent', right: true },
  { label: 'Location' },
  { label: 'Method' },
  { label: 'Last login' },
  { label: 'Joined' },
  { label: 'Actions', right: true },
];

// Same icon-button look as the products table.
const ACTION =
  'flex size-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

function Shell({ children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[80rem] text-left">
        <thead>
          <tr className="border-b border-border text-sm text-muted">
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                className={`px-4 py-3 font-medium ${column.right ? 'text-right' : ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function When({ value }) {
  if (!value) return <span className="text-sm text-muted">Never</span>;
  return (
    <time dateTime={value} title={fullDate(value)} className="whitespace-nowrap text-sm text-muted">
      {timeAgo(value)}
    </time>
  );
}

const UserRow = memo(function UserRow({ user, index, meId, pending, onView, onToggleBlocked }) {
  const entered = useEntered(Math.min(index, 10) * 30);
  const isSelf = user.$id === meId;
  const blocked = user.isBlocked === true;
  const lock = blockLockReason(user, meId);
  const dim = blocked ? 'opacity-60' : '';
  const label = user.name || user.username || user.email;

  return (
    <tr
      aria-busy={pending || undefined}
      className={`border-b border-border transition duration-300 ease-out last:border-0 hover:bg-surface-alt/50 focus-within:bg-surface-alt/50 motion-reduce:transition-none ${
        blocked ? 'bg-error/5' : ''
      } ${entered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
    >
      <td className={`px-4 py-3 ${dim}`}>
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0 max-w-56">
            <p className="flex items-center gap-2">
              <span className="truncate font-medium text-text">{user.name || '—'}</span>
              {isSelf && <span className="shrink-0 text-xs text-muted">(you)</span>}
              {blocked && <BlockedBadge />}
            </p>
            <p className="truncate text-sm text-muted">@{user.username || '—'}</p>
          </div>
        </div>
      </td>

      <td className={`px-4 py-3 ${dim}`}>
        <p className="max-w-56 truncate text-text" title={user.email}>
          {user.email}
        </p>
        <p className="text-sm text-muted">{user.phone || '—'}</p>
      </td>

      <td className={`px-4 py-3 ${dim}`}>
        <RoleBadge role={user.role} />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2" title={lock || undefined}>
          {/* SwitchInput is a boxed field, so it is flattened here to fit a table cell. */}
          <SwitchInput
            label={blocked ? 'Blocked' : 'Active'}
            checked={blocked}
            disabled={pending || Boolean(lock)}
            onChange={(next) => onToggleBlocked?.(user, next)}
            className="border-0! bg-transparent! p-0!"
          />
          {pending && (
            <Loader2 size={16} className="animate-spin text-muted" role="status" aria-label="Saving" />
          )}
        </div>
      </td>

      <td className={`px-4 py-3 text-right tabular-nums text-text ${dim}`}>
        {formatInt(user.ordersCount)}
      </td>
      <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums text-text ${dim}`}>
        {formatMoney(user.totalSpent)}
      </td>

      <td className={`px-4 py-3 ${dim}`}>
        <p className="text-text">{user.lastCity || '—'}</p>
        <p className="max-w-48 truncate text-sm text-muted" title={user.lastAddress || undefined}>
          {user.lastAddress || '—'}
        </p>
      </td>

      <td className={`px-4 py-3 ${dim}`}>
        <ProviderChip provider={user.authProvider} />
      </td>
      <td className={`px-4 py-3 ${dim}`}>
        <When value={user.lastLoginAt} />
      </td>
      <td className={`px-4 py-3 ${dim}`}>
        <When value={user.$createdAt} />
      </td>

      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onView?.(user)}
            aria-label={`View ${label}`}
            title="View details"
            className={`${ACTION} hover:text-text`}
          >
            <Eye size={18} aria-hidden="true" />
          </button>
          <span title={lock || (blocked ? 'Unblock user' : 'Block user')}>
            <button
              type="button"
              disabled={pending || Boolean(lock)}
              onClick={() => onToggleBlocked?.(user, !blocked)}
              aria-label={`${blocked ? 'Unblock' : 'Block'} ${label}`}
              className={`${ACTION} ${blocked ? 'hover:text-success' : 'hover:text-error'}`}
            >
              {blocked ? <UserCheck size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}
            </button>
          </span>
        </div>
      </td>
    </tr>
  );
});

// users: the rows to show (selectVisibleUsers). pendingIds: selectPendingUserIds.
// onToggleBlocked(user, nextBlocked) is called by the switch and the block button.
export default function UserTable({ users, meId = null, pendingIds = [], onView, onToggleBlocked }) {
  return (
    <Shell>
      {users.map((user, index) => (
        <UserRow
          key={user.$id}
          user={user}
          index={index}
          meId={meId}
          pending={pendingIds.includes(user.$id)}
          onView={onView}
          onToggleBlocked={onToggleBlocked}
        />
      ))}
    </Shell>
  );
}

export function UserTableSkeleton({ rows = 6 }) {
  return (
    <Shell>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden="true" className="border-b border-border last:border-0">
          {COLUMNS.map((column, col) => (
            <td key={column.label} className="px-4 py-4">
              <div
                className={`h-4 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none ${
                  col === 0 ? 'w-40' : 'w-20'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </Shell>
  );
}