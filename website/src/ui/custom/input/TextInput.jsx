import { useId } from 'react';

const BASE =
  'w-full rounded-md border bg-bg text-base text-text outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60';

// Labelled text field. as="textarea" gives a multi-line field.
//   prefix / suffix : small text inside the field edge (e.g. "Rs", "%")
//   showCount       : shows "12/120" when maxLength is set
export default function TextInput({
  label,
  error,
  hint,
  as = 'input',
  prefix,
  suffix,
  required = false,
  showCount = false,
  className = '',
  inputClassName = '',
  ...props
}) {
  const id = useId();
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Tag = as;
  const isArea = as === 'textarea';
  const count = showCount && props.maxLength ? `${String(props.value ?? '').length}/${props.maxLength}` : null;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-[0.8rem] font-medium text-muted lg:text-sm">
          {label}
          {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-sm text-muted">
            {prefix}
          </span>
        )}
        <Tag
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          aria-required={required || undefined}
          className={`${BASE} ${isArea ? 'py-3' : 'h-12'} ${prefix ? 'pl-12' : 'pl-3.5'} ${suffix ? 'pr-12' : 'pr-3.5'} ${inputClassName} ${
            error ? 'border-error' : 'border-border'
          }`}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>

      {(error || hint || count) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-sm">
          <p id={messageId} className={error ? 'text-error' : 'text-muted'}>
            {error || hint}
          </p>
          {count && <span className="shrink-0 text-xs text-muted">{count}</span>}
        </div>
      )}
    </div>
  );
}
