// src/ui/custom/checkout/CheckoutParts.jsx
// Pieces shared by the checkout drawer (Buy now) and the checkout page.
import { useState } from "react";
import { Eye, EyeOff, Pencil, Check } from "lucide-react";
import TextInput from "../input/TextInput";

const INPUT =
  "mt-1 h-11 w-full rounded-md border bg-surface px-3 pr-11 text-text focus:border-accent focus:outline-none";

/* ---------- logged-in user: details as text, with a Change button ---------- */
export function ContactSummary({ profile, form, errors = {}, onChange, editing, setEditing }) {
  const rows = [
    { label: "Name", value: form.customerName },
    { label: "Username", value: profile?.username ? `@${profile.username}` : "" },
    { label: "Email", value: form.customerEmail || profile?.email },
    { label: "Phone", value: form.customerPhone },
  ].filter((row) => row.label !== "Username" || row.value);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-text">Your details</h3>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {editing ? <Check size={15} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
          {editing ? "Done" : "Change"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextInput label="Full name" required value={form.customerName} onChange={onChange("customerName")} error={errors.customerName} maxLength={128} autoComplete="name" />
          <TextInput label="Phone" required type="tel" value={form.customerPhone} onChange={onChange("customerPhone")} error={errors.customerPhone} maxLength={20} inputMode="tel" autoComplete="tel" />
        </div>
      ) : (
        <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
              <dd className={`mt-0.5 break-words ${value ? "font-medium text-text" : "text-muted"}`}>{value || "Not added"}</dd>
            </div>
          ))}
        </dl>
      )}
      {!editing && (errors.customerName || errors.customerPhone) && (
        <p role="alert" className="mt-2 text-sm text-error">{errors.customerName || errors.customerPhone}</p>
      )}
    </div>
  );
}

/* ---------- password with a show / hide eye ---------- */
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
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
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