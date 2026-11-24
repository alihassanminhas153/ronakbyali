// src/ui/custom/checkout/CheckoutField.jsx
//
// Checkout input. Same props as TextInput (label, error, hint, as, required, showCount,
// className, inputClassName + any input prop), plus:
//   icon : a lucide-react icon shown inside the field on the left
// Look: soft filled field, rounded-xl, icon that lights up on focus, accent ring, inline error.
import { useId } from "react";
import { AlertCircle } from "lucide-react";

const BASE =
  "peer w-full rounded-xl border bg-surface-alt/50 text-base text-text outline-none transition placeholder:text-muted/60 " +
  "hover:border-accent/50 focus:border-accent focus:bg-bg focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

export default function CheckoutField({
  label,
  error,
  hint,
  as = "input",
  icon: Icon,
  required = false,
  showCount = false,
  className = "",
  inputClassName = "",
  ...props
}) {
  const id = useId();
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Tag = as;
  const isArea = as === "textarea";
  const count = showCount && props.maxLength ? `${String(props.value ?? "").length}/${props.maxLength}` : null;

  return (
    <div className={`group ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[0.8rem] font-semibold tracking-wide text-text">
          {label}
          {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <span
            className={`pointer-events-none absolute left-3.5 flex items-center text-muted transition-colors group-focus-within:text-accent ${
              isArea ? "top-3.5" : "inset-y-0"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
        <Tag
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          aria-required={required || undefined}
          className={`${BASE} ${isArea ? "py-3" : "h-12"} ${Icon ? "pl-11" : "pl-3.5"} pr-3.5 ${inputClassName} ${
            error ? "border-error ring-4 ring-error/10" : "border-border"
          }`}
          {...props}
        />
      </div>

      {(error || hint || count) && (
        <div className="mt-1.5 flex items-start justify-between gap-3 text-sm">
          <p id={messageId} role={error ? "alert" : undefined} className={`flex items-center gap-1.5 ${error ? "text-error" : "text-muted"}`}>
            {error && <AlertCircle size={14} className="shrink-0" aria-hidden="true" />}
            {error || hint}
          </p>
          {count && <span className="shrink-0 text-xs text-muted">{count}</span>}
        </div>
      )}
    </div>
  );
}