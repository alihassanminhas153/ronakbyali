import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Bell, BarChart3, CalendarClock, Check, Eye, FileText, Layers, Lock, Minus, Plus, RotateCcw, X } from 'lucide-react';

import { createAlert, resetAlertSeen, saveAlert } from '../../../store/slices/alertSlice';
import { ALERT_LIMITS, ALERT_TYPES, alertState } from '../../../lib/appwrite/alert';
import AppIcon, { resolveAppIconName } from '../../../ui/custom/AppIcon';
import { tint, toneVar } from '../../../ui/graphs/utils';
import DatePicker from '../../../ui/custom/input/DatePicker';
import { StateBadge } from './AlertBadges';
import AlertPreview from './AlertPreview';
import { TYPE_META, describeSchedule, formatDateTime, seenRate } from './alertMeta';
import { toForm, toPayload, validate } from './alertSchema';
import { toTitleCase } from '../../../lib/textCase';

/* ---------- small field helpers (self-contained, theme tokens only) ---------- */

const controlCls = (err) =>
  `w-full min-h-11 rounded-md border bg-bg px-3.5 py-2.5 text-sm text-text transition-[border-color,box-shadow] placeholder:text-muted/70 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
    err
      ? 'border-error focus:border-error focus:ring-error/15'
      : 'border-border hover:border-accent/50 focus:border-accent focus:ring-accent/15'
  }`;

function Field({ label, hint, error, optional, children, className = '', as: Tag = 'label' }) {
  return (
    <Tag className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-semibold text-text">
        <span>{label}{optional && <span className="ml-1.5 font-normal text-muted">optional</span>}</span>
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
      <span className={`grid transition-all duration-200 ${error ? 'mt-1.5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <span className="overflow-hidden text-xs font-medium text-error-fg">{error}</span>
      </span>
    </Tag>
  );
}

// A card with a tinted header: icon tile, title and a one-line subtitle.
function Section({ title, subtitle, icon, tone = 1, children, delay = 0, bodyClassName = 'grid gap-5 p-5 sm:grid-cols-2' }) {
  const color = toneVar(tone);
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className="group/sec animate-rise overflow-hidden rounded-lg border border-border bg-surface shadow-soft"
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5" style={{ background: tint(color, 6) }}>
        <span className="grid size-10 shrink-0 place-items-center rounded-md" style={{ background: tint(color, 16) }}>
          <AppIcon
            name={resolveAppIconName(icon)}
            tone={tone}
            className="size-6 object-contain transition-transform duration-300 group-hover/sec:-rotate-6 group-hover/sec:scale-110"
          />
        </span>
        <div className="min-w-0">
          <h3 className="heading-sm text-text">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const PAGE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'products', label: 'Products list' },
  { value: 'product', label: 'Product page' },
];

const initialForm = (alert) => {
  const form = toForm(alert);
  form.title = toTitleCase(form.title);
  form.message = toTitleCase(form.message);
  form.buttonText = toTitleCase(form.buttonText);
  return form;
};

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-bg text-muted hover:border-accent/50 hover:text-text'
      }`}
    >
      {active && <Check size={14} strokeWidth={3} aria-hidden="true" />}
      {children}
    </button>
  );
}

function Switch({ checked, onChange, label, hint, tone = 3 }) {
  const color = toneVar(tone);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={checked ? { borderColor: color, background: tint(color, 8) } : undefined}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-border bg-bg px-4 py-3 text-left transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-semibold text-text">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200"
        style={{ background: checked ? color : 'color-mix(in srgb, var(--text-muted) 45%, var(--bg))' }}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-on-accent shadow-soft transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function Count({ value, max }) {
  return <span className={value > max ? 'font-medium text-error-fg' : ''}>{value}/{max}</span>;
}

/* small pictures for the "How should it appear?" choice */
const ART = 'relative block h-14 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-surface';

function BarArt() {
  return (
    <span aria-hidden="true" className={ART}>
      <span className="absolute inset-x-0 top-0 h-3.5 bg-accent/80" />
      <span className="absolute left-2 right-6 top-6 h-1.5 rounded-full bg-border" />
      <span className="absolute left-2 right-10 top-9 h-1.5 rounded-full bg-border" />
    </span>
  );
}

function PopupArt() {
  return (
    <span aria-hidden="true" className={ART}>
      <span className="absolute inset-0 bg-overlay/40" />
      <span className="absolute left-1/2 top-1/2 h-8 w-14 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-bg shadow-soft">
        <span className="absolute inset-x-2 top-2 h-1.5 rounded-full bg-border" />
        <span className="absolute bottom-1.5 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full bg-accent/80" />
      </span>
    </span>
  );
}

function DisplayChoice({ popup, onChange, tone = 5 }) {
  const color = toneVar(tone);
  const options = [
    { value: false, label: 'Announcement bar', hint: 'A slim strip across the page.', art: <BarArt /> },
    { value: true, label: 'Popup', hint: 'A box in the middle of the screen.', art: <PopupArt /> },
  ];
  return (
    <div role="radiogroup" aria-label="How the alert appears" className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = popup === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            style={selected ? { borderColor: color, background: tint(color, 8), boxShadow: `0 0 0 3px ${tint(color, 18)}` } : undefined}
            className="relative flex flex-col items-start gap-3 rounded-lg border border-border bg-bg p-3.5 text-left transition-[border-color,background,box-shadow] hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {selected && (
              <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full text-on-accent" style={{ background: color }}>
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
            {option.art}
            <span>
              <span className="block text-sm font-semibold text-text">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ScheduleDateTime({ label, value, onChange, error }) {
  const date = value ? value.slice(0, 10) : '';
  const time = value ? value.slice(11, 16) : '12:00';
  return (
    <Field as="div" label={label} optional error={error} className="sm:col-span-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <DatePicker
          value={date}
          onChange={(nextDate) => onChange(nextDate ? `${nextDate}T${time || '12:00'}` : '')}
          error={Boolean(error)}
          clearable
          aria-label={`${label} date`}
        />
        <div className="block">
          <input
            type="time"
            value={time}
            disabled={!date}
            aria-label={`${label} time`}
            onChange={(event) => onChange(date ? `${date}T${event.target.value}` : '')}
            className={controlCls(error)}
          />
        </div>
      </div>
    </Field>
  );
}

/* ---------- the drawer ---------- */

// props: open, alert (null = add), onClose, onSaved
// An expired alert opens read-only: every field is locked and there is no save button.
export default function AlertForm({ open, alert, onClose, onSaved }) {
  const dispatch = useDispatch();
  const editing = Boolean(alert);
  const readOnly = editing && alertState(alert) === 'expired';

  const [form, setForm] = useState(() => initialForm(alert));
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
    const normalized = ['title', 'message', 'buttonText'].includes(key) ? toTitleCase(value) : value;
    setForm((f) => ({ ...f, [key]: normalized }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const on = (key) => (e) => set(key)(e.target.value);
  const blockWheel = (e) => e.currentTarget.blur();

  // `set` stores the value it is given, so it must receive the finished array, never a
  // callback. (Passing a callback stored the function in form.pages and crashed the form.)
  const pages = Array.isArray(form.pages) ? form.pages : [];
  const togglePage = (page) => {
    set('pages')(pages.includes(page) ? pages.filter((item) => item !== page) : [...pages, page]);
  };
  const bumpPriority = (step) => set('priority')(String((Math.trunc(Number(form.priority)) || 0) + step));

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
        className={`absolute inset-0 bg-overlay backdrop-blur-xs transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
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
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            {readOnly ? <Lock size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="heading truncate text-text">
              {readOnly ? 'Expired alert' : editing ? 'Edit alert' : 'New alert'}
            </h2>
            <p className="truncate text-xs text-muted">{editing ? alert.title : 'Fill in the details, then save.'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-alt hover:text-text disabled:opacity-60"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {editing && (
            <div className="animate-rise flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-soft">
              <StateBadge alert={alert} />
              <span className="text-xs text-muted">{describeSchedule(alert)}</span>
            </div>
          )}
          {readOnly && (
            <p role="status" className="animate-rise flex items-start gap-2 rounded-lg border border-border bg-surface-alt/60 px-4 py-3 text-xs text-muted">
              <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              This alert has expired, so it is read-only. Create a new alert to run it again.
            </p>
          )}

          {/* a disabled fieldset locks every input and switch inside it */}
          <fieldset disabled={readOnly || saving} className="m-0 min-w-0 space-y-5 border-0 p-0">
            <Section title="Message" subtitle="What people read." icon={FileText} tone={1} delay={0}>
              <Field label="Title" hint={<Count value={form.title.length} max={ALERT_LIMITS.title} />} error={errors.title} className="sm:col-span-2">
                <input value={form.title} onChange={on('title')} maxLength={ALERT_LIMITS.title + 20} placeholder="Eid sale starts tonight" className={controlCls(errors.title)} />
              </Field>
              <Field label="Message" hint={<Count value={form.message.length} max={ALERT_LIMITS.message} />} error={errors.message} className="sm:col-span-2">
                <textarea value={form.message} onChange={on('message')} rows={4} placeholder="Up to 30% off on all lawn suits until Sunday." className={`${controlCls(errors.message)} resize-none`} />
              </Field>
              <div className="sm:col-span-2" role="radiogroup" aria-label="Alert type">
                <span className="mb-1.5 block text-xs font-semibold text-text">Type</span>
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
                        style={selected ? { borderColor: color, background: tint(color, 12), color, boxShadow: `0 0 0 3px ${tint(color, 16)}` } : undefined}
                        className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-3 text-xs font-semibold text-muted transition-[border-color,background,box-shadow,color] hover:border-accent/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon size={20} aria-hidden="true" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>

            <Section title="Display" subtitle="How it appears, and what it links to." icon={Layers} tone={5} delay={60}>
              <div className="sm:col-span-2">
                <DisplayChoice popup={form.popup} onChange={set('popup')} />
              </div>
              <Field as="div" label="Priority" hint="higher shows first" error={errors.priority}>
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    aria-label="Lower priority"
                    onClick={() => bumpPriority(-1)}
                    className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-bg text-muted transition-colors hover:border-accent/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    aria-label="Priority"
                    value={form.priority}
                    onChange={on('priority')}
                    onWheel={blockWheel}
                    className={`${controlCls(errors.priority)} text-center tabular-nums`}
                  />
                  <button
                    type="button"
                    aria-label="Raise priority"
                    onClick={() => bumpPriority(1)}
                    className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-bg text-muted transition-colors hover:border-accent/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
              </Field>
              <Field label="Button text" hint={form.popup ? '' : 'popups only'} error={errors.buttonText}>
                <input value={form.buttonText} onChange={on('buttonText')} disabled={!form.popup} maxLength={ALERT_LIMITS.buttonText + 10} placeholder="Got it" className={controlCls(errors.buttonText)} />
              </Field>
              <Field label="Link" optional error={errors.link} className="sm:col-span-2">
                <input value={form.link} onChange={on('link')} inputMode="url" placeholder="https://... or /shop" className={controlCls(errors.link)} />
              </Field>
              {form.popup && (
                <p className="rounded-md bg-surface-alt/60 px-3.5 py-2.5 text-xs text-muted sm:col-span-2">
                  “{form.buttonText.trim() || 'Got it'}” hides the popup for good. The X or a click outside hides it until the next visit.
                </p>
              )}
            </Section>

            <Section title="Audience and schedule" subtitle="Who sees it, where, and when." icon={CalendarClock} tone={3} delay={120}>
              <Field label="User id" hint="empty = everyone" optional error={errors.userId} className="sm:col-span-2">
                <input value={form.userId} onChange={on('userId')} maxLength={ALERT_LIMITS.userId + 10} placeholder="Paste a user id to target one person" className={controlCls(errors.userId)} />
              </Field>
              <Field as="div" label="Show on pages" hint="bars and popups only" optional className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  <Chip active={pages.length === 0} onClick={() => set('pages')([])}>Everywhere</Chip>
                  {PAGE_OPTIONS.map((option) => (
                    <Chip key={option.value} active={pages.includes(option.value)} onClick={() => togglePage(option.value)}>
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </Field>
              <ScheduleDateTime label="Starts" value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} />
              <ScheduleDateTime label="Ends" value={form.endsAt} onChange={set('endsAt')} error={errors.endsAt} />
              <div className="sm:col-span-2">
                <Switch checked={form.active} onChange={set('active')} tone={2} label="Active" hint={form.active ? 'Customers can see it during its schedule.' : 'Saved but hidden. Turn it on whenever you like.'} />
              </div>
            </Section>
          </fieldset>

          <Section title="Preview" subtitle={form.popup ? 'As a popup' : 'As an announcement bar'} icon={Eye} tone={6} delay={180} bodyClassName="p-5">
            <div className="rounded-md border border-dashed border-border bg-surface-alt/50 p-4">
              <AlertPreview alert={form} />
            </div>
          </Section>

          {editing && (
            <Section title="Reach" subtitle="How many people have seen it." icon={BarChart3} tone={2} delay={240}>
              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                {[
                  ['Views', impressions],
                  ['Confirmed', seenCount],
                  ['Rate', `${seenRate(alert)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border bg-bg px-3 py-3 text-center">
                    <p className="heading text-xl tabular-nums text-text">{value}</p>
                    <p className="mt-0.5 text-xs text-muted">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted sm:col-span-2">
                <span>{seenBy} signed-in {seenBy === 1 ? 'user' : 'users'} pressed the button · Created {formatDateTime(alert.$createdAt)}</span>
                {alert.popup && !readOnly && (
                  <button type="button" onClick={reset} disabled={resetting || seenCount === 0} className="btn btn-ghost gap-1.5 disabled:opacity-50">
                    <RotateCcw size={14} aria-hidden="true" />
                    {confirmReset ? 'Click again to confirm' : resetting ? 'Resetting…' : 'Show to everyone again'}
                  </button>
                )}
              </div>
            </Section>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3.5 sm:px-6">
          <p role="alert" className={`min-w-0 flex-1 text-sm font-medium text-error-fg transition-opacity ${submitError ? 'opacity-100' : 'opacity-0'}`}>{submitError}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost">{readOnly ? 'Close' : 'Cancel'}</button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving}
                style={{ background: 'linear-gradient(120deg, var(--cta-1), var(--cta-2))', color: 'var(--btn-ink)' }}
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