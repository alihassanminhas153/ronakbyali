// src/ui/custom/checkout/CheckoutParts.jsx
// Pieces shared by the checkout drawer (Buy now) and the checkout page.
import { useState } from "react";

const INPUT =
  "mt-1 h-12 w-full rounded-xl border bg-surface-alt/50 px-3.5 pr-16 text-base text-text outline-none transition hover:border-accent/50 focus:border-accent focus:bg-bg focus:ring-4 focus:ring-accent/15";

/* ---------- password with a show / hide control ---------- */
export function PasswordField({ label = "Password *", value, onChange, error, autoComplete = "current-password", autoFocus = false }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-medium text-text">
      {label}
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-required="true"
          aria-invalid={Boolean(error)}
          className={`${INPUT} ${error ? "border-error" : "border-border"}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-16 items-center justify-center rounded-r-md text-xs text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
      {error && <span role="alert" className="mt-1 block text-sm font-normal text-error">{error}</span>}
    </label>
  );
}

/* ---------- continue with Google ---------- */
export function GoogleButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 font-semibold text-text transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.9z" />
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.8 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted" role="separator">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}