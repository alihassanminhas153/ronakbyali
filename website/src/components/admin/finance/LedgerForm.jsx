import { useMemo, useState } from 'react';
import { FileText, Info, Wallet } from 'lucide-react';

import financeService from '../../../lib/appwrite/finance';
import Drawer from '../../../ui/custom/modal/Drawer';
import Segmented from '../../../ui/custom/input/Segmented';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import DatePicker from '../../../ui/custom/input/DatePicker';
import { Field, inputCls } from '../../../ui/custom/input/FormField';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { STOCK_CATEGORY, TYPE_META, TYPE_ORDER, toDateKey, toForm, toPayload, validate } from './financeSchema';

const TYPE_OPTIONS = TYPE_ORDER.map((t) => ({ value: t, label: TYPE_META[t].label, icon: TYPE_META[t].icon, tone: TYPE_META[t].tone }));

// props: open, entry (null = add), defaultType, entries[] (to suggest categories), onClose, onSaved
export default function LedgerForm({ open, entry, defaultType = 'expense', entries = [], onClose, onSaved }) {
  const editing = Boolean(entry);
  const [form, setForm] = useState(() => toForm(entry, defaultType));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const meta = TYPE_META[form.type];
  const color = toneVar(meta.tone);

  // suggestions = the defaults for this type + whatever you already used
  const categories = useMemo(() => {
    const used = entries.filter((e) => e.type === form.type && e.category).map((e) => e.category);
    return [...new Set([...meta.categories, ...used])];
  }, [entries, form.type, meta]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const on = (key) => (e) => set(key)(e.target.value);

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) { setSubmitError('Please fix the highlighted fields.'); return; }
    setSaving(true);
    setSubmitError('');
    const data = toPayload(form);
    const saved = editing ? await financeService.updateEntry(entry.$id, data) : await financeService.addEntry(data);
    setSaving(false);
    if (!saved) { setSubmitError(financeService.lastError || 'Could not save the entry.'); return; }
    onSaved?.(saved);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      busy={saving}
      onSubmit={submit}
      icon={meta.icon}
      tone={meta.tone}
      title={editing ? 'Edit entry' : 'New entry'}
      subtitle={editing ? entry.title : 'Record money coming in or going out.'}
      footer={
        <>
          <p role="alert" className={`min-w-0 flex-1 text-sm text-error transition-opacity ${submitError ? 'opacity-100' : 'opacity-0'}`}>{submitError}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary min-w-32 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add entry'}
            </button>
          </div>
        </>
      }
    >
      <section className="animate-rise">
        <span className="mb-1.5 block text-xs font-medium text-text">What is this?</span>
        <Segmented options={TYPE_OPTIONS} value={form.type} onChange={(t) => setForm((f) => ({ ...f, type: t, category: '' }))} aria-label="Entry type" />
        <p key={form.type} className="animate-rise mt-3 flex gap-2 rounded-md px-3 py-2.5 text-xs" style={{ background: tint(color, 10), color }}>
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>{meta.hint}</span>
        </p>
      </section>

      <section style={{ animationDelay: '60ms', borderTopColor: color }} className="animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: tint(color, 14), color }}><FileText size={18} /></span>
          <h3 className="heading-sm" style={{ color }}>Details</h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Title" error={errors.title} className="sm:col-span-2">
            <input value={form.title} onChange={on('title')} maxLength={150} placeholder="Instagram ads, March" className={inputCls(errors.title)} />
          </Field>
          <Field as="div" label="Category" optional>
            <SearchSelect aria-label="Category" options={categories} value={form.category} onChange={set('category')} placeholder="Select or create" searchPlaceholder="Search categories…" />
          </Field>
          <Field label="Amount (Rs)" error={errors.amount}>
            <input type="number" inputMode="decimal" min="0" step="any" value={form.amount} onChange={on('amount')} onWheel={(e) => e.currentTarget.blur()} placeholder="0" className={inputCls(errors.amount)} />
          </Field>
          <Field as="div" label="Date" error={errors.date} className="sm:col-span-2">
            <DatePicker aria-label="Date" value={form.date} onChange={set('date')} max={toDateKey()} error={Boolean(errors.date)} />
          </Field>
          <Field label="Note" optional className="sm:col-span-2">
            <textarea value={form.note} onChange={on('note')} rows={3} maxLength={1000} placeholder="Invoice number, who was paid…" className={`${inputCls()} resize-y py-2`} />
          </Field>
        </div>
        {form.type === 'expense' && form.category === STOCK_CATEGORY && (
          <p className="animate-rise mt-3 flex gap-2 text-xs text-muted">
            <Wallet size={14} className="mt-0.5 shrink-0" />
            Stock purchases lower cash in hand but are not subtracted from profit, because the cost is taken from each product's cost price when it sells.
          </p>
        )}
      </section>
    </Drawer>
  );
}