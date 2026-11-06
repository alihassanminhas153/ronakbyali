import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

// Search box that waits until typing pauses before calling onSearch(text).
//   value    : the committed search text (so a "reset" elsewhere clears the box)
//   onSearch : called after `delay` ms of no typing, or at once on Enter / clear
export default function SearchInput({
  value = '',
  onSearch,
  placeholder = 'Search',
  label = 'Search',
  delay = 350,
  loading = false,
  size = 'md',
  className = '',
}) {
  const [text, setText] = useState(value);
  const committed = useRef(value);

  // the parent changed the value (e.g. filters were reset)
  useEffect(() => {
    committed.current = value;
    setText(value);
  }, [value]);

  // debounce
  useEffect(() => {
    const clean = text.trim();
    if (clean === committed.current.trim()) return undefined;
    const timer = setTimeout(() => {
      committed.current = clean;
      onSearch?.(clean);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay, onSearch]);

  const commitNow = (next) => {
    committed.current = next;
    onSearch?.(next);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitNow(text.trim());
    } else if (e.key === 'Escape' && text) {
      e.preventDefault();
      setText('');
      commitNow('');
    }
  };

  return (
    <div className={`relative ${className}`} role="search">
      <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className={`w-full rounded-md border border-border bg-bg pl-10 pr-10 text-text outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden ${
          size === 'sm' ? 'h-10 text-sm' : 'h-12 text-base'
        }`}
      />
      <span className="absolute inset-y-0 right-0 flex w-10 items-center justify-center">
        {loading ? (
          <Loader2 size={16} className="animate-spin text-muted" aria-hidden="true" />
        ) : text ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText('');
              commitNow('');
            }}
            className="flex size-7 items-center justify-center rounded-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
