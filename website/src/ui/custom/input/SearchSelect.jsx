import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { colorFor, tint } from '../../graphs/utils';
import { toTitleCase } from '../../../lib/textCase';
import useDropdownPosition, { LIST_SCROLL, listHeight } from './useDropdownPosition';

// Searchable dropdown. Pick an existing option or (creatable) type a new one.
//   <SearchSelect options={['Lawn','Kurta']} value={v} onChange={setV} placeholder="Select category" />
//
// Responsive behaviour
//   - The input fills its parent (w-full min-w-0), so a grid can make it half the width on a phone.
//     Under ~176px it switches to a compact style (smaller padding and text, text is truncated).
//   - The option panel is at least `menuMinWidth` wide, even when the input is narrower, and always stays
//     on the screen: it lines up with the input's right edge when the input is in the right half of the
//     screen, and with its left edge otherwise. It opens upward when there is no room below.
//   - The list shows 5 options (`visibleRows`); with more it scrolls with a thin scrollbar.
//
// Props (all optional except options / onChange)
//   size         'md' (default, min-h-11) | 'lg' (h-12, h-[3.25rem] on lg: same height as the shop search bar)
//   align        'auto' (default) | 'left' | 'right'  which edge the panel lines up with when it is wider
//   menuMinWidth px, default 224
//   visibleRows  default 5
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
  size = 'md',
  align = 'auto',
  menuMinWidth = 224,
  visibleRows = 5,
  'aria-label': ariaLabel,
}) {
  const id = useId();
  const listId = `${id}-list`;
  const root = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  // reserve = the search row (41px) + the panel border (2px)
  const { place, narrow } = useDropdownPosition(root, open, {
    minWidth: menuMinWidth,
    align,
    reserve: 43,
    rows: visibleRows,
  });
  const dropUp = Boolean(place?.dropUp);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => options.filter((o) => String(o).toLowerCase().includes(q)), [options, q]);
  const canCreate = creatable && q && !options.some((o) => String(o).toLowerCase() === q);
  const rows = canCreate ? [...filtered, { create: query.trim() }] : filtered;

  const close = (refocus = false) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (v) => { onChange(options.includes(v) ? v : toTitleCase(v)); close(true); };

  useEffect(() => {
    if (!open) return undefined;
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
    } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close();
  };

  const onTriggerKey = (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) { e.preventDefault(); setOpen(true); }
    else if ((e.key === 'Backspace' || e.key === 'Delete') && clearable && value && !open) { e.preventDefault(); onChange(''); }
  };

  const heightCls = size === 'lg' ? 'h-12 lg:h-[3.25rem]' : 'min-h-11';
  const activeId = rows.length ? `${id}-opt-${cursor}` : undefined;

  return (
    <div ref={root} className="relative w-full min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        className={`flex w-full min-w-0 items-center rounded-md border bg-surface text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${heightCls} ${
          narrow ? 'gap-1 pl-2.5 pr-2 text-[13px]' : 'gap-2 px-3 text-sm'
        } ${error ? 'border-error' : open ? 'border-accent' : 'border-border hover:border-accent/60'}`}
      >
        <span className="min-w-0 flex-1">
          {value ? (
            <span
              className={`inline-flex max-w-full items-center rounded-full font-medium ${narrow ? 'gap-1 px-2 py-0.5 text-[11px]' : 'gap-1.5 px-2.5 py-0.5 text-xs'}`}
              style={{ background: tint(colorFor(value), 14), color: colorFor(value) }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorFor(value) }} />
              <span className="truncate">{toTitleCase(value)}</span>
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
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        id={id}
        style={place ? { left: place.left, width: place.width } : undefined}
        className={`absolute z-30 overflow-hidden rounded-lg border border-border bg-surface shadow-soft transition-all duration-200 motion-reduce:transition-none ${
          place ? '' : 'left-0 right-0'
        } ${dropUp ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'} ${
          open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={15} className="shrink-0 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(toTitleCase(e.target.value))}
            onKeyDown={onKey}
            aria-label="Search options"
            aria-controls={listId}
            aria-activedescendant={open ? activeId : undefined}
            placeholder={searchPlaceholder}
            className="min-h-10 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm"
          />
          <span className="shrink-0 text-[11px] tabular-nums text-muted">{filtered.length}/{options.length}</span>
        </div>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          style={{ maxHeight: place?.listMax ?? listHeight(visibleRows) }}
          className={`p-1 ${LIST_SCROLL}`}
        >
          {rows.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted">No matches</li>}
          {rows.map((r, i) => {
            const isCreate = typeof r !== 'string';
            const label = isCreate ? r.create : toTitleCase(r);
            return (
              <li
                key={isCreate ? '__create' : r}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={!isCreate && r === value}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(isCreate ? r.create : r)}
                className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm transition-colors ${i === cursor ? 'bg-surface-alt' : ''}`}
              >
                {isCreate ? (
                  <>
                    <Plus size={14} className="shrink-0 text-accent-tone-1" />
                    <span className="truncate text-text">Create “{label}”</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(label) }} />
                    <span className="min-w-0 flex-1 truncate text-text">{label}</span>
                    {label === value && <Check size={14} className="shrink-0 text-accent-tone-1" />}
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