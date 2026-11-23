import { useEffect, useRef } from 'react';

// Custom checkbox (no browser default look). Colours come only from index.css tokens:
// --border, --surface, --on-accent and an --accent-tone-N (tone 1 = denim accent).
//
// USAGE
//   <SelectBox checked={on} onChange={(next) => ...} label="Select review" />
//   <SelectBox checked={all} indeterminate={some && !all} onChange={toggleAll} label="Select all" />
//
// It is still a real <input type="checkbox"> (invisible, on top), so keyboard, screen readers and
// clicks on a wrapping <label> all work. onChange receives the NEW boolean.
const DRAW = 24; // length of the tick / dash path, used for the stroke "draw" transition

export default function SelectBox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  label = 'Select',
  tone = 1,
  size = 20,
  className = '',
}) {
  const ref = useRef(null);
  const on = checked || indeterminate;

  // `indeterminate` can only be set from JS
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <span className={`relative inline-grid shrink-0 ${className}`} style={{ '--tone': `var(--accent-tone-${tone})`, width: size, height: size }}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none grid size-full place-items-center rounded-md border-[1.5px] text-on-accent shadow-soft transition-all duration-200 ease-out peer-hover:border-[var(--tone)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--tone)]/40 peer-active:scale-90 peer-disabled:opacity-50 motion-reduce:transition-none ${
          on ? 'border-[var(--tone)] bg-[var(--tone)]' : 'border-border bg-surface'
        }`}
      >
        <svg viewBox="0 0 16 16" width={size * 0.65} height={size * 0.65} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M3 8.5 6.5 12 13 4.5"
            strokeDasharray={DRAW}
            style={{ strokeDashoffset: checked ? 0 : DRAW, transition: 'stroke-dashoffset 0.25s ease-out' }}
          />
          <path
            d="M4 8h8"
            strokeDasharray={DRAW}
            style={{ strokeDashoffset: indeterminate && !checked ? 0 : DRAW, transition: 'stroke-dashoffset 0.2s ease-out' }}
          />
        </svg>
      </span>
    </span>
  );
}