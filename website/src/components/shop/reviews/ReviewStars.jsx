import { useState } from 'react';
import { Star } from 'lucide-react';

export const RATING_WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// Read-only stars. value can be fractional (4.6 fills 92% of the row).
export function Stars({ value = 0, size = 16, className = '' }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  const row = (cls) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} className={`shrink-0 ${cls}`} aria-hidden="true" />
      ))}
    </span>
  );
  return (
    <span className={`relative inline-flex ${className}`} role="img" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
      {row('text-border')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row('fill-current text-warning')}
      </span>
    </span>
  );
}

// Clickable 1-5 stars (a radio group: arrow keys work too).
export function StarPicker({ value, onChange, size = 34, disabled = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 2) - 1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="radiogroup" aria-label="Your rating" onKeyDown={onKeyDown} onMouseLeave={() => setHover(0)} className="inline-flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}, ${RATING_WORDS[n - 1]}`}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-lg p-0.5 transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95 disabled:opacity-60 motion-reduce:transition-none"
          >
            <Star size={size} className={`transition-colors duration-150 ${n <= shown ? 'fill-current text-warning' : 'text-border'}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      <span className="min-w-[5.5rem] text-sm font-medium text-text" aria-live="polite">
        {shown ? RATING_WORDS[shown - 1] : 'Choose a rating'}
      </span>
    </div>
  );
}