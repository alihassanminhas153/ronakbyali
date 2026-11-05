import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Labelled input with inline error/hint. type="password" gets a show/hide toggle.
// `icon` is an optional lucide icon component shown inside the left edge of the input.
export default function AuthField({ label, type = 'text', error, hint, icon: Icon, className = '', ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[0.8rem] font-medium text-muted lg:text-sm">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
        )}

        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`h-12 w-full rounded-md border bg-bg text-base text-text outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-muted/60 disabled:opacity-60 lg:h-[3.25rem] ${
            Icon ? 'pl-11' : 'pl-3.5'
          } ${isPassword ? 'pr-12' : 'pr-3.5'} ${error ? 'border-error' : 'border-border'}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p id={messageId} className="mt-2 text-sm text-error">{error}</p>
      ) : hint ? (
        <p id={messageId} className="mt-2 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}