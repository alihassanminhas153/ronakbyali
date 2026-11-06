import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';

const normalise = (o) => (o !== null && typeof o === 'object' ? o : { value: o, label: String(o) });

// Custom dropdown (no native <select>).
//   options    : ['A', 'B'] or [{ value, label }]
//   searchable : adds a filter box inside the list
//   creatable  : lets the person type a value that is not in the list (also gives the filter box)
//   clearable  : shows an X that sets the value back to ''
// Keyboard: Arrow keys move, Enter picks, Esc closes, letters jump (when there is no filter box).
export default function SelectInput({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  searchable = false,
  creatable = false,
  clearable = false,
  error,
  hint,
  disabled = false,
  required = false,
  emptyText = 'Nothing found',
  size = 'md', // 'md' for forms, 'sm' for toolbars
  className = '',
  'aria-label': ariaLabel,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const [shown, setShown] = useState(false); // drives the open animation

  const items = useMemo(() => options.map(normalise), [options]);
  const showSearch = searchable || creatable;
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const filtered = q ? items.filter((o) => o.label.toLowerCase().includes(q)) : items;
    const canCreate = creatable && q && !items.some((o) => o.label.toLowerCase() === q);
    return canCreate
      ? [...filtered, { value: query.trim(), label: `Add “${query.trim()}”`, created: true }]
      : filtered;
  }, [items, q, creatable, query]);

  const selected = items.find((o) => o.value === value);
  const display = selected ? selected.label : value || '';

  const openList = () => {
    if (disabled) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setDropUp(below < 280 && rect.top > below);
    }
    setQuery('');
    const index = items.findIndex((o) => o.value === value);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (option) => {
    onChange?.(option.value);
    close();
  };

  // fade / slide the list in after its first paint
  useEffect(() => {
    if (!open) {
      setShown(false);
      return undefined;
    }
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open]);

  // focus moves into the list when it opens
  useEffect(() => {
    if (open) (showSearch ? searchRef.current : listRef.current)?.focus();
  }, [open, showSearch]);

  // click outside closes
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // keep the highlighted row visible
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onListKeyDown = (e) => {
    const count = rows.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (count ? (i + 1) % count : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (count ? (i - 1 + count) % count : 0));
    } else if (e.key === 'Home' && !showSearch) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End' && !showSearch) {
      e.preventDefault();
      setActive(Math.max(0, count - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // never submit the surrounding form
      if (rows[active]) choose(rows[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // do not close a modal around this field
      close();
    } else if (e.key === 'Tab') {
      close();
    } else if (!showSearch && e.key.length === 1 && /\S/.test(e.key)) {
      const letter = e.key.toLowerCase();
      const start = (active + 1) % Math.max(count, 1);
      const order = [...rows.slice(start), ...rows.slice(0, start)];
      const hit = order.find((o) => o.label.toLowerCase().startsWith(letter));
      if (hit) setActive(rows.indexOf(hit));
    }
  };

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openList();
    }
  };

  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const height = size === 'sm' ? 'h-10 text-sm' : 'h-12 text-base lg:h-[3.25rem]';

  return (
    <div className={className} ref={rootRef}>
      {label && (
        <label htmlFor={`${id}-trigger`} className="mb-2 block text-[0.8rem] font-medium text-muted lg:text-sm">
          {label}
          {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          id={`${id}-trigger`}
          type="button"
          role="combobox"
          aria-label={label ? undefined : ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openList())}
          onKeyDown={onTriggerKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded-md border bg-bg pl-3.5 text-left outline-none transition focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 disabled:opacity-60 ${height} ${
            clearable && value ? 'pr-16' : 'pr-3.5'
          } ${error ? 'border-error' : 'border-border'}`}
        >
          <span className={`truncate ${display ? 'text-text' : 'text-muted/60'}`}>{display || placeholder}</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onChange?.('')}
            className="absolute inset-y-0 right-9 flex w-7 items-center justify-center rounded-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}

        {open && (
          <div
            onKeyDown={onListKeyDown}
            className={`absolute left-0 right-0 z-30 overflow-hidden rounded-md border border-border bg-surface shadow-soft transition duration-150 ease-out motion-reduce:transition-none ${
              dropUp ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
            } ${shown ? 'translate-y-0 scale-100 opacity-100' : `scale-95 opacity-0 ${dropUp ? 'translate-y-1' : '-translate-y-1'}`}`}
          >
            {showSearch && (
              <div className="relative border-b border-border p-2">
                <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  aria-label="Filter options"
                  aria-controls={`${id}-list`}
                  aria-activedescendant={rows.length ? `${id}-opt-${active}` : undefined}
                  placeholder={creatable ? 'Search or type a new one' : 'Search'}
                  className="h-9 w-full rounded-sm border border-border bg-bg pl-8 pr-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-accent"
                />
              </div>
            )}

            <ul
              ref={listRef}
              id={`${id}-list`}
              role="listbox"
              tabIndex={-1}
              aria-label={label || ariaLabel}
              aria-activedescendant={rows.length ? `${id}-opt-${active}` : undefined}
              className="max-h-60 overflow-y-auto p-1 outline-none"
            >
              {rows.length === 0 && <li className="px-3 py-2 text-sm text-muted">{emptyText}</li>}
              {rows.map((o, i) => (
                <li
                  key={`${o.created ? 'new:' : ''}${o.value}`}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm ${
                    i === active ? 'bg-surface-alt text-text' : 'text-text'
                  }`}
                >
                  {o.created ? (
                    <Plus size={15} aria-hidden="true" className="shrink-0 text-accent" />
                  ) : (
                    <Check
                      size={15}
                      aria-hidden="true"
                      className={`shrink-0 text-accent ${o.value === value ? 'opacity-100' : 'opacity-0'}`}
                    />
                  )}
                  <span className="truncate">{o.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(error || hint) && (
        <p id={messageId} className={`mt-2 text-sm ${error ? 'text-error' : 'text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
