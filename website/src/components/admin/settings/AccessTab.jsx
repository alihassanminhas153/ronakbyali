import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import {
  clearUserError,
  fetchUsers,
  selectAllUsers,
  selectMe,
  selectMeStatus,
  selectUserById,
  selectUsersError,
  selectUsersListStatus,
} from '../../../store/slices/userSlice';
import SearchInput from '../../../ui/custom/input/SearchInput';
import AccessDrawer from './AccessDrawer';
import { Avatar, Banner, Chip, Pagination, RoleChip } from './SettingsParts';
import { PAGE_SIZE, fmtDay } from './settingsMeta';

// Every user in one full-width table, 10 per page. Click a row: the form slides in from the right.
export default function AccessTab() {
  const dispatch = useAppDispatch();
  const me = useAppSelector(selectMe);
  const meStatus = useAppSelector(selectMeStatus);
  const users = useAppSelector(selectAllUsers);
  const listStatus = useAppSelector(selectUsersListStatus);
  const error = useAppSelector(selectUsersError);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [open, setOpen] = useState(false);
  const selected = useAppSelector((state) => (selectedId ? selectUserById(state, selectedId) : undefined));

  useEffect(() => {
    if (meStatus === 'ready' && listStatus === 'idle') dispatch(fetchUsers());
  }, [meStatus, listStatus, dispatch]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.name, u.email, u.username, u.role, ...(u.labels || [])].some((v) => String(v || '').toLowerCase().includes(term))
    );
  }, [users, query]);

  const staffCount = users.filter((u) => ['admin', 'support', 'manager'].includes(u.role)).length;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const loading = listStatus === 'loading' && users.length === 0;
  const busy = listStatus === 'loading';

  useEffect(() => setPage(1), [query]);

  const openUser = (u) => {
    setSelectedId(u.$id);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Total users</p>
          <p className="mt-2 text-2xl font-semibold text-text">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Staff</p>
          <p className="mt-2 text-2xl font-semibold text-text">{staffCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Visible</p>
          <p className="mt-2 text-2xl font-semibold text-text">{filtered.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft sm:flex-row sm:items-center">
        <SearchInput size="sm" delay={200} value={query} onSearch={setQuery} placeholder="Search name, email, role or label" label="Search users" className="flex-1" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{filtered.length} {filtered.length === 1 ? 'user' : 'users'}</span>
          <button
            type="button"
            onClick={() => dispatch(fetchUsers())}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-alt px-3 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error && <Banner kind="error" onDismiss={() => dispatch(clearUserError())}>{error}</Banner>}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-alt/60 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                <th scope="col" className="px-3 py-2.5 sm:px-4">User</th>
                <th scope="col" className="hidden px-3 py-2.5 md:table-cell md:px-4">Email</th>
                <th scope="col" className="px-3 py-2.5 sm:px-4">Role</th>
                <th scope="col" className="hidden px-3 py-2.5 lg:table-cell lg:px-4">Labels</th>
                <th scope="col" className="hidden px-3 py-2.5 xl:table-cell xl:px-4">Joined</th>
                <th scope="col" className="w-10 px-3 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-t border-border" aria-hidden="true">
                    <td colSpan={6} className="px-4 py-4"><div className="h-5 animate-pulse rounded bg-surface-alt motion-reduce:animate-none" /></td>
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                    {users.length === 0 ? 'No users yet.' : 'No users match your search.'}
                  </td>
                </tr>
              )}

              {rows.map((u) => {
                const labels = u.labels || [];
                return (
                  <tr
                    key={u.$id}
                    tabIndex={0}
                    onClick={() => openUser(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openUser(u);
                      }
                    }}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-alt/50 focus-visible:bg-surface-alt/50 focus-visible:outline-none"
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <span className="flex items-center gap-3">
                        <Avatar user={u} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-text">
                            {u.name || u.username || '—'}
                            {u.$id === me?.$id && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
                          </span>
                          <span className="block truncate text-xs text-muted md:hidden">{u.email}</span>
                          <span className="hidden truncate text-xs text-muted md:block">@{u.username || '—'}</span>
                        </span>
                      </span>
                    </td>
                    <td className="hidden max-w-[16rem] truncate px-3 py-3 text-muted md:table-cell md:px-4">{u.email}</td>
                    <td className="px-3 py-3 sm:px-4"><RoleChip role={u.role} /></td>
                    <td className="hidden px-3 py-3 lg:table-cell lg:px-4">
                      <span className="flex flex-wrap gap-1">
                        {labels.length === 0 && <span className="text-muted">—</span>}
                        {labels.slice(0, 3).map((l) => <Chip key={l}>{l}</Chip>)}
                        {labels.length > 3 && <span className="text-xs text-muted">+{labels.length - 3}</span>}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-muted xl:table-cell xl:px-4">{fmtDay(u.$createdAt)}</td>
                    <td className="px-3 py-3 text-right text-muted"><ChevronRight size={16} aria-hidden="true" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={current} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />

      <AccessDrawer open={open} user={selected} locked={selected?.$id === me?.$id} onClose={() => setOpen(false)} />
    </div>
  );
}
