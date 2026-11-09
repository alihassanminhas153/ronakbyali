import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { colorFor, tint } from '../../graphs/utils';

// Searchable dropdown. Pick an existing option or (creatable) type a new one.
//   <SearchSelect options={['Lawn','Kurta']} value={v} onChange={setV} placeholder="Select category" />
export default function SearchSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  creatable = true,
  clearable = true,
  error = false,
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const id = useId();
  const root = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [dropUp, setDropUp] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => options.filter((o) => o.toLowerCase().includes(q)), [options, q]);
  const canCreate = creatable && q && !options.some((o) => o.toLowerCase() === q);
  const rows = canCreate ? [...filtered, { create: query.trim() }] : filtered;

  const close = () => { setOpen(false); setQuery(''); };
  const choose = (v) => { onChange(v); close(); };

  useEffect(() => {
    if (!open) return undefined;
    const rect = root.current?.getBoundingClientRect();
    setDropUp(Boolean(rect) && window.innerHeight - rect.bottom < 280 && rect.top > 280);
    searchRef.current?.focus();
    const away = (e) => { if (!root.current?.contains(e.target)) close(); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  useEffect(() => setCursor(0), [q]);
  useEffect(() => {
    if (open) listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor, open]);

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const r = rows[cursor];
      if (r) choose(typeof r === 'string' ? r : r.create);
    } else if (e.key === 'Escape') { e.stopPropagation(); close(); }
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 w-full items-center gap-2 rounded-md border bg-surface px-3 text-left text-sm transition-colors ${
          error ? 'border-error' : open ? 'border-graph-1' : 'border-border hover:border-graph-1/60'
        }`}
      >
        <span className="min-w-0 flex-1">
          {value ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: tint(colorFor(value), 14), color: colorFor(value) }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorFor(value) }} />
              <span className="truncate">{value}</span>
            </span>
          ) : (
            <span className="block truncate text-muted/70">{placeholder}</span>
          )}
        </span>
        {clearable && value && (
          <span
            role="button"
            aria-label="Clear"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="grid h-6 w-6 place-items-center rounded text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        id={id}
        role="listbox"
        className={`absolute left-0 right-0 z-30 overflow-hidden rounded-lg border border-border bg-surface shadow-soft transition-all duration-200 ${
          dropUp ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
        } ${open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'}`}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={15} className="text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={searchPlaceholder}
            className="min-h-10 flex-1 border-0 bg-transparent p-0 text-sm"
          />
          <span className="shrink-0 text-[11px] tabular-nums text-muted">{filtered.length}/{options.length}</span>
        </div>
        <ul ref={listRef} className="max-h-60 overflow-y-auto p-1">
          {rows.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted">No matches</li>}
          {rows.map((r, i) => {
            const isCreate = typeof r !== 'string';
            const label = isCreate ? r.create : r;
            return (
              <li
                key={isCreate ? '__create' : r}
                role="option"
                aria-selected={!isCreate && r === value}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(label)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${i === cursor ? 'bg-surface-alt' : ''}`}
              >
                {isCreate ? (
                  <>
                    <Plus size={14} className="text-graph-1" />
                    <span className="truncate text-text">Create “{label}”</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(label) }} />
                    <span className="min-w-0 flex-1 truncate text-text">{label}</span>
                    {label === value && <Check size={14} className="text-graph-1" />}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}