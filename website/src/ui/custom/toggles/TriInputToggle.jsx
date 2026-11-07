// Segmented control for a small set of options (built for three, works for 2-4).
//   options: [{ value, label }]   value: the selected option's value
// A highlight slides under the active option (transform only).
export default function TriInputToggle({
  options = [],
  value,
  onChange,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex h-10 rounded-md border border-border bg-bg p-0.5 ${className}`}
    >
      <div className="relative grid h-full grid-flow-col auto-cols-fr">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-sm bg-surface-alt shadow-soft transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{
            width: `${100 / Math.max(options.length, 1)}%`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange?.(option.value)}
              className={`relative z-10 h-full rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? 'text-text' : 'text-muted hover:text-text'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}