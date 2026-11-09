import { Bell, ChevronLeft, ChevronRight, Eye, Lock, Pencil, Power, RotateCcw, Trash2, Users } from 'lucide-react';
import { alertState } from '../../../lib/appwrite/alert';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { DisplayBadge, StateBadge, TypeBadge } from './AlertBadges';
import { TYPE_META, describeSchedule, formatDateTime, seenRate } from './alertMeta';

function IconButton({ label, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40 ${danger ? 'hover:text-error' : 'hover:text-text'}`}
    >
      {children}
    </button>
  );
}

// 1 ... 4 5 6 ... 12
const pageWindow = (page, pages) => {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
};

export function Pager({ page, pageSize, total, onPage, disabled }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = 'grid h-9 min-w-9 place-items-center rounded-md border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
      <span>Showing {from}-{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} className={`${btn} border-border hover:bg-surface-alt`}>
          <ChevronLeft size={16} />
        </button>
        {pageWindow(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1">…</span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              disabled={disabled}
              onClick={() => onPage(p)}
              className={`${btn} ${p === page ? 'border-graph-1 bg-graph-1/10 font-semibold text-graph-1' : 'border-border hover:bg-surface-alt'}`}
            >
              {p}
            </button>
          )
        )}
        <button type="button" aria-label="Next page" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)} className={`${btn} border-border hover:bg-surface-alt`}>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <tr key={i} className="border-t border-border">
      <td colSpan={7} className="px-4 py-4"><div className="h-9 animate-pulse rounded-md bg-surface-alt" /></td>
    </tr>
  ));
}

// props: rows, loading, page, pageSize, total, onPage, onOpen(alert), onToggle(alert), onReset(alert), onDelete(alert), emptyText
export default function AlertTable({ rows, loading, busyId, page, pageSize, total, onPage, onOpen, onToggle, onReset, onDelete, emptyText = 'No alerts here yet.' }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-surface-alt/50 text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Alert</th>
              <th className="px-3 py-3 font-medium">Display</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Schedule</th>
              <th className="px-3 py-3 font-medium">Audience</th>
              <th className="px-3 py-3 font-medium">Reach</th>
              <th className="px-3 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length && <SkeletonRows />}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-alt text-muted"><Bell size={22} /></span>
                  <p className="text-sm text-muted">{emptyText}</p>
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const state = alertState(a);
              const expired = state === 'expired';
              const meta = TYPE_META[a.type] || TYPE_META.info;
              const color = toneVar(meta.tone);
              const Icon = meta.icon;
              const rowBusy = busyId === a.$id;
              return (
                <tr
                  key={a.$id}
                  onClick={() => onOpen(a)}
                  className={`cursor-pointer border-t border-border transition-colors hover:bg-surface-alt/50 ${expired ? 'opacity-75' : ''}`}
                >
                  <td className="max-w-xs px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: tint(color, 14), color }}><Icon size={18} /></span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">{a.title}</p>
                        <p className="truncate text-xs text-muted">{a.message}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5"><TypeBadge type={a.type} /><DisplayBadge popup={a.popup} /></div>
                  </td>
                  <td className="px-3 py-3"><StateBadge alert={a} /></td>
                  <td className="px-3 py-3 text-xs">
                    <p className="text-text">{describeSchedule(a)}</p>
                    <p className="text-muted">{a.endsAt ? formatDateTime(a.endsAt) : 'Runs until turned off'}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5"><Users size={13} />{a.userId ? 'One user' : 'Everyone'}</span>
                  </td>
                  <td className="px-3 py-3 text-xs tabular-nums">
                    <p className="text-text">{Number(a.impressions) || 0} views</p>
                    <p className="text-muted">{a.popup ? `${seenRate(a)}% confirmed` : 'bar'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <IconButton label={expired ? 'View (read-only)' : 'Edit'} onClick={() => onOpen(a)}>
                        {expired ? <Eye size={16} /> : <Pencil size={16} />}
                      </IconButton>
                      {expired ? (
                        <span className="grid h-9 w-9 place-items-center text-muted/60" title="Expired alerts cannot be changed"><Lock size={15} /></span>
                      ) : (
                        <IconButton label={a.status === 'active' ? 'Turn off' : 'Turn on'} onClick={() => onToggle(a)} disabled={rowBusy}>
                          <Power size={16} className={a.status === 'active' ? 'text-graph-2' : ''} />
                        </IconButton>
                      )}
                      {a.popup && !expired && (
                        <IconButton label="Show to everyone again" onClick={() => onReset(a)} disabled={rowBusy || !Number(a.seenCount)}>
                          <RotateCcw size={16} />
                        </IconButton>
                      )}
                      <IconButton label="Delete" danger onClick={() => onDelete(a)} disabled={rowBusy}><Trash2 size={16} /></IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={pageSize} total={total} onPage={onPage} disabled={loading} />
    </div>
  );
}