import { Mail, Phone, User } from "lucide-react";
import CheckoutField from "./CheckoutField";

export function SectionCard({ id, title, action, children, className = "" }) {
  return (
    <section aria-labelledby={id} className={`space-y-3 ${className}`}>
      <header className="flex items-center justify-between gap-3">
        <h3 id={id} className="font-semibold text-text">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StepDots({ steps, current }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Checkout progress">
      {steps.map((label, i) => {
        const active = i === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
              active ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-muted"
            }`}>
              {i + 1}
            </span>
            <span className={`text-sm ${active ? "font-semibold text-text" : "text-muted"}`}>{label}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

const ROWS = [
  { key: "customerName", label: "Full name", icon: User, editable: true, input: { maxLength: 128, autoComplete: "name" } },
  { key: "customerPhone", label: "Phone", icon: Phone, editable: true, input: { type: "tel", inputMode: "tel", maxLength: 20, autoComplete: "tel" } },
  { key: "customerEmail", label: "Email", icon: Mail, editable: false, input: { type: "email", maxLength: 320, autoComplete: "email" } },
];

export function ContactTable({ form, errors, onChange, editing, setEditing }) {
  const editButton = (
    <button
      type="button"
      onClick={() => setEditing(!editing)}
      aria-pressed={editing}
      className="min-h-9 rounded-md border border-border px-3 text-sm font-medium text-text hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {editing ? "Done" : "Edit"}
    </button>
  );

  return (
    <SectionCard id="checkout-contact-heading" title="Your details" action={editButton}>
      <dl className="divide-y divide-border border-y border-border">
        {ROWS.map((row) => {
          const value = String(form[row.key] ?? "").trim();
          const showInput = (row.editable && editing) || !value;

          if (showInput) {
            return (
              <div key={row.key} className="py-2.5">
                <dt className="sr-only">{row.label}</dt>
                <dd>
                  <CheckoutField icon={row.icon} label={row.label} required={row.key !== "customerEmail"} value={form[row.key] ?? ""} onChange={onChange(row.key)} error={errors[row.key]} {...row.input} />
                </dd>
              </div>
            );
          }

          return (
            <div key={row.key} className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 py-2.5 text-sm">
              <dt className="text-muted">{row.label}</dt>
              <dd className="break-words text-right font-medium text-text">{value}</dd>
            </div>
          );
        })}
      </dl>
    </SectionCard>
  );
}

export function EmailRow({ email }) {
  return (
    <dl className="border-y border-border">
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2.5 text-sm">
        <dt className="text-muted">Email</dt>
        <dd className="break-words text-right font-medium text-text">{email}</dd>
      </div>
    </dl>
  );
}