import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Labelled input with inline error/hint. type="password" gets a show/hide toggle.
export default function AuthField({ label, type = 'text', error, hint, className = '', ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[0.8rem] font-medium text-muted">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`h-11 w-full rounded-md border bg-bg px-3.5 text-base text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:opacity-60 ${
            isPassword ? 'pr-11' : ''
          } ${error ? 'border-error' : 'border-border'}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p id={messageId} className="mt-1.5 text-sm text-error">{error}</p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}