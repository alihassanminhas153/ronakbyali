import { useId } from 'react';

// On/off switch with a label and optional description.
export default function SwitchInput({ label, description, checked = false, onChange, disabled = false, className = '' }) {
  const id = useId();

  return (
    <div className={`flex items-start justify-between gap-4 rounded-md border border-border bg-bg px-4 py-3 ${className}`}>
      <div className="min-w-0">
        <label id={`${id}-label`} htmlFor={id} className="block cursor-pointer text-sm font-medium text-text">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
          checked ? 'bg-accent' : 'bg-surface-alt'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0.5 top-0.5 rounded-full bg-surface shadow-soft transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
          style={{ width: '1.125rem', height: '1.125rem' }}
        />
      </button>
    </div>
  );
}
