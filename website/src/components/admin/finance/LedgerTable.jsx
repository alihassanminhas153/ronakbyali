import { Pencil, Trash2 } from 'lucide-react';
import { colorFor, tint, toneVar } from '../../../ui/graphs/utils';
import { TYPE_META, prettyDate, rs } from './financeSchema';

// props: entries[], onEdit(entry), onDelete(entry)
function TypeBadge({ type }) {
  const m = TYPE_META[type] || TYPE_META.expense;
  const c = toneVar(m.tone);
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tint(c, 14), color: c }}>
      <Icon size={12} />
      {m.label}
    </span>
  );
}

function Amount({ entry }) {
  const m = TYPE_META[entry.type] || TYPE_META.expense;
  return (
    <span className="whitespace-nowrap text-sm font-semibold tabular-nums" style={{ color: toneVar(m.tone) }}>
      {m.sign > 0 ? '+' : '-'} {rs(entry.amount)}
    </span>
  );
}

function CategoryChip({ name }) {
  if (!name) return null;
  const c = colorFor(name);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-xs text-muted">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

function Actions({ entry, onEdit, onDelete }) {
  const btn = 'grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt';
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => onEdit(entry)} aria-label="Edit entry" className={`${btn} hover:text-text`}><Pencil size={16} /></button>
      <button type="button" onClick={() => onDelete(entry)} aria-label="Delete entry" className={`${btn} hover:bg-error/10 hover:text-error`}><Trash2 size={16} /></button>
    </div>
  );
}

export default function LedgerTable({ entries = [], onEdit, onDelete }) {
  const rise = (i) => ({ animationDelay: `${Math.min(i, 12) * 35}ms` });
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {entries.map((e, i) => (
          <li key={e.$id} style={rise(i)} className="animate-rise rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent-tone-1/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{e.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{prettyDate(e.date)}</span>
                  <CategoryChip name={e.category} />
                </div>
              </div>
              <Amount entry={e} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              <TypeBadge type={e.type} />
              <Actions entry={e} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left">
          <thead className="bg-surface-alt/60 text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Entry</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((e, i) => (
              <tr key={e.$id} style={rise(i)} className="animate-rise transition-colors hover:bg-surface-alt/50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">{prettyDate(e.date)}</td>
                <td className="px-4 py-3">
                  <p className="max-w-72 truncate text-sm font-medium text-text">{e.title}</p>
                  <CategoryChip name={e.category} />
                </td>
                <td className="px-4 py-3"><TypeBadge type={e.type} /></td>
                <td className="px-4 py-3 text-right"><Amount entry={e} /></td>
                <td className="px-4 py-3"><div className="flex justify-end"><Actions entry={e} onEdit={onEdit} onDelete={onDelete} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}