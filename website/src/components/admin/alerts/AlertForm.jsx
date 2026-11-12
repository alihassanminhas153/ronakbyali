import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { BarChart3, CalendarClock, Eye, FileText, Layers, Lock, RotateCcw, X } from 'lucide-react';

import { createAlert, resetAlertSeen, saveAlert } from '../../../store/slices/alertSlice';
import { ALERT_LIMITS, ALERT_TYPES, alertState } from '../../../lib/appwrite/alert';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { StateBadge } from './AlertBadges';
import AlertPreview from './AlertPreview';
import { TYPE_META, describeSchedule, formatDateTime, seenRate } from './alertMeta';
import { toForm, toPayload, validate } from './alertSchema';

/* ---------- small field helpers (self-contained, theme tokens only) ---------- */

const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-accent-tone-1 disabled:cursor-not-allowed disabled:opacity-70 ${
    err ? 'border-error' : 'border-border hover:border-accent-tone-1/50'
  }`;

function Field({ label, hint, error, optional, children, className = '', as: Tag = 'label' }) {
  return (
    <Tag className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-text">
        <span>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</span>
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
      <span className={`grid transition-all duration-200 ${error ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <span className="overflow-hidden text-xs text-error">{error}</span>
      </span>
    </Tag>
  );
}

function SectionHead({ icon: Icon, title, subtitle, tone }) {
  const color = toneVar(tone);
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover/sec:-rotate-6 group-hover/sec:scale-110" style={{ background: tint(color, 14), color }}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <h3 className="heading-sm" style={{ color }}>{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, tone = 1, children, delay = 0 }) {
  return (
    <section
      style={{ animationDelay: `${delay}ms`, borderTopColor: toneVar(tone) }}
      className="group/sec animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4"
    >
      <SectionHead icon={icon} title={title} subtitle={subtitle} tone={tone} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, label, hint, tone = 3 }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent-tone-3/60 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span>
        <span className="block text-sm font-medium text-text">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200" style={{ background: checked ? toneVar(tone) : 'var(--border)' }}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function Count({ value, max }) {
  return <span className={value > max ? 'text-error' : ''}>{value}/{max}</span>;
}

/* ---------- the drawer ---------- */

// props: open, alert (null = add), onClose, onSaved
// An expired alert opens read-only: every field is locked and there is no save button.
export default function AlertForm({ open, alert, onClose, onSaved }) {
  const dispatch = useDispatch();
  const editing = Boolean(alert);
  const readOnly = editing && alertState(alert) === 'expired';

  const [form, setForm] = useState(() => toForm(alert));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Slide-in: mount closed, flip to open on the next frame so the transition runs.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) { setShown(false); return undefined; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, saving, onClose]);

  // The confirm step on "Reset seen" goes away by itself.
  useEffect(() => {
    if (!confirmReset) return undefined;
    const id = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(id);
  }, [confirmReset]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const on = (key) => (e) => set(key)(e.target.value);
  const blockWheel = (e) => e.currentTarget.blur();

  const submit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setSubmitError('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    setSubmitError('');
    try {
      const data = toPayload(form);
      if (editing) await dispatch(saveAlert({ alertId: alert.$id, data })).unwrap();
      else await dispatch(createAlert({ data })).unwrap();
      onSaved?.();
    } catch (err) {
      setSubmitError(typeof err === 'string' ? err : err?.message || 'Could not save the alert.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setResetting(true);
    setConfirmReset(false);
    try {
      await dispatch(resetAlertSeen({ alertId: alert.$id, toast: true })).unwrap();
    } catch (err) {
      setSubmitError(typeof err === 'string' ? err : err?.message || 'Could not reset who has seen it.');
    } finally {
      setResetting(false);
    }
  };

  const impressions = Number(alert?.impressions) || 0;
  const seenCount = Number(alert?.seenCount) || 0;
  const seenBy = (alert?.seenBy || []).length;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? 0 : 350}ms` }}
      aria-hidden={!open}
    >
      <div
        onClick={() => !saving && onClose()}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label={readOnly ? 'View alert' : editing ? 'Edit alert' : 'Add alert'}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading flex items-center gap-2 truncate text-text">
              {readOnly && <Lock size={16} className="shrink-0 text-muted" />}
              {readOnly ? 'Expired alert' : editing ? 'Edit alert' : 'Add alert'}
            </h2>
            <p className="truncate text-xs text-muted">{editing ? alert.title : 'Fill in the details, then save.'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {editing && (
            <div className="animate-rise flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <StateBadge alert={alert} />
              <span className="text-xs text-muted">{describeSchedule(alert)}</span>
            </div>
          )}
          {readOnly && (
            <p role="status" className="animate-rise flex items-start gap-2 rounded-lg border border-border bg-surface-alt/60 px-4 py-3 text-xs text-muted">
              <Lock size={14} className="mt-0.5 shrink-0" />
              This alert has expired, so it is read-only. Create a new alert to run it again.
            </p>
          )}

          {/* a disabled fieldset locks every input and switch inside it */}
          <fieldset disabled={readOnly || saving} className="m-0 min-w-0 space-y-4 border-0 p-0">
            <Section title="Message" subtitle="What people read." icon={FileText} tone={1} delay={0}>
              <Field label="Title" hint={<Count value={form.title.length} max={ALERT_LIMITS.title} />} error={errors.title} className="sm:col-span-2">
                <input value={form.title} onChange={on('title')} maxLength={ALERT_LIMITS.title + 20} placeholder="Eid sale starts tonight" className={inputCls(errors.title)} />
              </Field>
              <Field label="Message" hint={<Count value={form.message.length} max={ALERT_LIMITS.message} />} error={errors.message} className="sm:col-span-2">
                <textarea value={form.message} onChange={on('message')} rows={4} placeholder="Up to 30% off on all lawn suits until Sunday." className={`${inputCls(errors.message)} resize-y py-2`} />
              </Field>
              <div className="sm:col-span-2" role="radiogroup" aria-label="Alert type">
                <span className="mb-1.5 block text-xs font-medium text-text">Type</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {ALERT_TYPES.map((t) => {
                    const meta = TYPE_META[t];
                    const color = toneVar(meta.tone);
                    const selected = form.type === t;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={meta.hint}
                        onClick={() => set('type')(t)}
                        style={selected ? { borderColor: color, background: tint(color, 12), color } : undefined}
                        className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface px-2 py-2.5 text-xs font-medium text-muted transition-colors hover:border-accent-tone-1/50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <Icon size={18} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>

            <Section title="Display" subtitle="Bar across the page, or a popup." icon={Layers} tone={5} delay={60}>
              <div className="sm:col-span-2">
                <Switch checked={form.popup} onChange={set('popup')} tone={5} label="Show as popup" hint={form.popup ? 'Appears in the middle of the screen.' : 'Shows as an announcement bar.'} />
              </div>
              <Field label="Priority" hint="higher shows first" error={errors.priority}>
                <input type="number" inputMode="numeric" step="1" value={form.priority} onChange={on('priority')} onWheel={blockWheel} className={inputCls(errors.priority)} />
              </Field>
              <Field label="Button text" hint={form.popup ? '' : 'popups only'} error={errors.buttonText}>
                <input value={form.buttonText} onChange={on('buttonText')} disabled={!form.popup} maxLength={ALERT_LIMITS.buttonText + 10} placeholder="Got it" className={inputCls(errors.buttonText)} />
              </Field>
              <Field label="Link" optional error={errors.link} className="sm:col-span-2">
                <input value={form.link} onChange={on('link')} inputMode="url" placeholder="https://... or /shop" className={inputCls(errors.link)} />
              </Field>
              {form.popup && (
                <p className="text-xs text-muted sm:col-span-2">
                  "{form.buttonText.trim() || 'Got it'}" hides the popup for good. The X or a click outside hides it until the next visit.
                </p>
              )}
            </Section>

            <Section title="Audience and schedule" subtitle="Who sees it, and when." icon={CalendarClock} tone={3} delay={120}>
              <Field label="User id" hint="empty = everyone" optional error={errors.userId} className="sm:col-span-2">
                <input value={form.userId} onChange={on('userId')} maxLength={ALERT_LIMITS.userId + 10} placeholder="Paste a user id to target one person" className={inputCls(errors.userId)} />
              </Field>
              <Field label="Starts" optional error={errors.startsAt}>
                <input type="datetime-local" value={form.startsAt} onChange={on('startsAt')} className={inputCls(errors.startsAt)} />
              </Field>
              <Field label="Ends" optional error={errors.endsAt}>
                <input type="datetime-local" value={form.endsAt} onChange={on('endsAt')} className={inputCls(errors.endsAt)} />
              </Field>
              <div className="sm:col-span-2">
                <Switch checked={form.active} onChange={set('active')} tone={2} label="Active" hint={form.active ? 'Customers can see it during its schedule.' : 'Saved but hidden. Turn it on whenever you like.'} />
              </div>
            </Section>
          </fieldset>

          <section style={{ animationDelay: '180ms', borderTopColor: 'var(--accent-tone-6)' }} className="group/sec animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4">
            <SectionHead icon={Eye} tone={6} title="Preview" subtitle={form.popup ? 'As a popup' : 'As an announcement bar'} />
            <div className="mt-4"><AlertPreview alert={form} /></div>
          </section>

          {editing && (
            <Section title="Reach" subtitle="How many people have seen it." icon={BarChart3} tone={2} delay={240}>
              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                {[
                  ['Views', impressions],
                  ['Confirmed', seenCount],
                  ['Rate', `${seenRate(alert)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-surface px-3 py-2.5 text-center">
                    <p className="heading text-lg tabular-nums text-text">{value}</p>
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted sm:col-span-2">
                <span>{seenBy} signed-in {seenBy === 1 ? 'user' : 'users'} pressed the button · Created {formatDateTime(alert.$createdAt)}</span>
                {alert.popup && !readOnly && (
                  <button type="button" onClick={reset} disabled={resetting || seenCount === 0} className="btn btn-ghost gap-1.5 disabled:opacity-50">
                    <RotateCcw size={14} />
                    {confirmReset ? 'Click again to confirm' : resetting ? 'Resetting…' : 'Show to everyone again'}
                  </button>
                )}
              </div>
            </Section>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">
          <p role="alert" className={`min-w-0 flex-1 text-sm text-error transition-opacity ${submitError ? 'opacity-100' : 'opacity-0'}`}>{submitError}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost">{readOnly ? 'Close' : 'Cancel'}</button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving}
                style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))', color: 'var(--on-brown)' }}
                className="btn min-w-32 transition-[filter,transform] hover:brightness-110 active:scale-95 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create alert'}
              </button>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
}