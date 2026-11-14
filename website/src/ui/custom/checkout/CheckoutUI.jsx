// src/ui/custom/checkout/CheckoutUI.jsx   (NEW FILE)
//
// Small building blocks for the checkout drawer.
// Every colour comes from index.css variables (Tailwind tokens such as
// bg-accent-soft, text-info-fg, border-border). Nothing is hard-coded, so
// light and dark mode both keep working.
//
// Icons: Phosphor "duotone" weight = two tones in one icon (solid line +
// soft tinted fill), both taken from the chip's text colour.
import { Check, EnvelopeSimple, Lock, PencilSimple, Phone, User, UserCircle, CheckCircle } from "@phosphor-icons/react";
import TextInput from "../input/TextInput";

/* Full class strings only (Tailwind cannot see names built with ${}). */
export const TONES = {
  accent: "bg-accent-soft text-accent",
  info: "bg-info-soft text-info-fg",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  rose: "bg-entity-4-soft text-entity-4-fg",
  purple: "bg-entity-8-soft text-entity-8-fg",
};

/* Coloured square with a two-tone icon. `hover` is a group-hover class
   written by the caller, e.g. "group-hover/head:animate-nudge". */
export function IconChip({ icon: Icon, tone = "accent", hover = "", size = 20 }) {
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-md ${TONES[tone]}`}>
      <Icon size={size} weight="duotone" aria-hidden="true" className={`transition-transform duration-200 ${hover}`} />
    </span>
  );
}

/* Section with an icon header. Hovering the header animates the icon. */
export function SectionCard({ id, icon, tone, hover, title, hint, action, children, className = "" }) {
  return (
    <section aria-labelledby={id} className={`rounded-lg border border-border bg-bg p-4 sm:p-5 ${className}`}>
      <header className="group/head mb-4 flex items-center gap-3">
        <IconChip icon={icon} tone={tone} hover={hover} />
        <div className="min-w-0 flex-1">
          <h3 id={id} className="heading-sm text-text">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/* Progress for guests: Details -> Confirm */
export function StepDots({ steps, current }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Checkout progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors ${done || active ? "bg-accent text-on-accent" : "bg-surface-alt text-muted"}`}>
              {done ? <Check size={13} weight="bold" aria-hidden="true" /> : i + 1}
            </span>
            <span className={`text-sm ${active ? "font-semibold text-text" : "text-muted"}`}>{label}</span>
            {i < steps.length - 1 && <span className={`h-px flex-1 ${done ? "bg-accent" : "bg-border"}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

const ROWS = [
  { key: "customerName", label: "Full name", icon: User, tone: "info", hover: "group-hover/row:scale-110", editable: true, input: { maxLength: 128, autoComplete: "name" } },
  { key: "customerPhone", label: "Phone", icon: Phone, tone: "success", hover: "group-hover/row:-rotate-12", editable: true, input: { type: "tel", inputMode: "tel", maxLength: 20, autoComplete: "tel" } },
  { key: "customerEmail", label: "Email", icon: EnvelopeSimple, tone: "warning", hover: "group-hover/row:-translate-y-0.5", editable: false, input: {} },
];

/* Logged-in customers: what we already know is shown as a read-only table.
   - name / phone  : text, "Edit" turns them into inputs (a missing value shows an input by itself)
   - email         : text only, it belongs to the account
   City and address are NOT here, they stay as normal inputs below. */
export function ContactTable({ form, errors, onChange, editing, setEditing }) {
  const rows = ROWS.filter((row) => row.editable || String(form[row.key] ?? "").trim());

  const editButton = (
    <button
      type="button"
      onClick={() => setEditing(!editing)}
      aria-pressed={editing}
      className="group/btn inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-bg px-3 text-sm font-medium text-text transition hover:border-accent hover:bg-accent-soft hover:text-accent"
    >
      {editing ? (
        <><CheckCircle size={16} weight="duotone" aria-hidden="true" /> Done</>
      ) : (
        <><PencilSimple size={16} weight="duotone" aria-hidden="true" className="transition-transform group-hover/btn:-rotate-12" /> Edit</>
      )}
    </button>
  );

  return (
    <SectionCard
      id="checkout-contact-heading"
      icon={UserCircle}
      tone="info"
      hover="group-hover/head:scale-110"
      title="Your details"
      hint="Saved from your account"
      action={editButton}
    >
      <dl className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
        {rows.map((row) => {
          const value = String(form[row.key] ?? "").trim();
          const showInput = row.editable && (editing || !value);

          if (showInput) {
            return (
              <div key={row.key}>
                <dt className="sr-only">{row.label}</dt>
                <dd className="p-3">
                  <TextInput label={row.label} required value={form[row.key] ?? ""} onChange={onChange(row.key)} error={errors[row.key]} {...row.input} />
                </dd>
              </div>
            );
          }

          return (
            <div key={row.key} className="group/row flex items-center gap-3 px-3 py-2.5">
              <IconChip icon={row.icon} tone={row.tone} hover={row.hover} size={18} />
              <dt className="w-16 shrink-0 text-sm text-muted sm:w-24">{row.label}</dt>
              <dd className="min-w-0 flex-1 break-words font-medium text-text">{value}</dd>
              {!row.editable && <Lock size={15} weight="duotone" className="shrink-0 text-muted" aria-label="Linked to your account" />}
            </div>
          );
        })}
      </dl>
    </SectionCard>
  );
}

/* Read-only email row, used on the guest password step. */
export function EmailRow({ email }) {
  return (
    <dl className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="group/row flex items-center gap-3 px-3 py-2.5">
        <IconChip icon={EnvelopeSimple} tone="warning" hover="group-hover/row:-translate-y-0.5" size={18} />
        <dt className="w-16 shrink-0 text-sm text-muted sm:w-24">Email</dt>
        <dd className="min-w-0 flex-1 break-words font-medium text-text">{email}</dd>
      </div>
    </dl>
  );
}
