import { useState } from 'react';
import { useDispatch } from 'react-redux';

import { ALERT_TYPES } from '../../../lib/appwrite';
import { addToast } from '../../../store/slices/uiSlice';
import { addSale, updateSale } from '../../../store/slices/saleSlice';
import ActionButton from '../../../ui/custom/button/ActionButton';
import DatePicker from '../../../ui/custom/input/DatePicker';
import SelectInput from '../../../ui/custom/input/SelectInput';
import SwitchField from '../../../ui/custom/input/SwitchField';
import TextInput from '../../../ui/custom/input/TextInput';
import { normalizeNumberInput } from '../../../lib/numberInput';
import { toTitleCase } from '../../../lib/textCase';

const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const initialForm = (sale) => ({
  name: toTitleCase(sale?.name || ''),
  startsAt: toDateTimeInput(sale?.startsAt),
  endsAt: toDateTimeInput(sale?.endsAt),
  discountPercentage: sale?.discountPercentage == null ? '' : String(sale.discountPercentage),
  makeAlert: Boolean(sale?.makeAlert),
  type: sale?.type || 'promo',
});

function SaleDateTimeField({ label, value, onChange, error }) {
  const date = value ? value.slice(0, 10) : '';
  const time = value ? value.slice(11, 16) : '12:00';

  return (
    <div>
      <p className="mb-2 block text-[0.8rem] font-medium text-muted lg:text-sm">
        {label}<span className="ml-0.5 text-error" aria-hidden="true">*</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <DatePicker
          value={date}
          onChange={(nextDate) => onChange(nextDate ? `${nextDate}T${time || '12:00'}` : '')}
          error={Boolean(error)}
          clearable
          aria-label={`${label} date`}
        />
        <TextInput
          type="time"
          value={time}
          disabled={!date}
          aria-label={`${label} time`}
          onChange={(event) => onChange(date ? `${date}T${event.target.value}` : '')}
          inputClassName="!h-11"
        />
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}

export default function SaleForm({ sale, onCancel, onSaved }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(() => initialForm(sale));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (key) => (value) => {
    const normalized = key === 'name' ? toTitleCase(value) : value;
    setForm((current) => ({ ...current, [key]: normalized }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const onChange = (key) => (event) => set(key)(event.target.value);
  const onNumberChange = (key) => (event) => set(key)(normalizeNumberInput(event.target.value));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const start = new Date(form.startsAt).getTime();
    const end = new Date(form.endsAt).getTime();
    const percentage = Number(form.discountPercentage);
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (!Number.isFinite(start)) nextErrors.startsAt = 'Choose a valid start date and time.';
    if (!Number.isFinite(end)) nextErrors.endsAt = 'Choose a valid end date and time.';
    else if (Number.isFinite(start) && end <= start) nextErrors.endsAt = 'End must be after start.';
    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
      nextErrors.discountPercentage = 'Enter a value from 1 to 100.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSubmitError('Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    setSubmitError('');
    const payload = {
      name: form.name.trim(),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      discountPercentage: percentage,
      makeAlert: form.makeAlert,
      type: form.type,
    };

    try {
      const saved = sale
        ? await dispatch(updateSale([sale.$id, payload])).unwrap()
        : await dispatch(addSale(payload)).unwrap();
      dispatch(addToast({ type: 'success', message: sale ? 'Sale updated' : 'Sale created' }));
      if (saved?.alertWarning) {
        dispatch(addToast({
          type: 'warning',
          message: saved.alertWarningType === 'create'
            ? 'Sale saved, but the alert could not be created.'
            : 'Sale saved, but its alert could not be synchronized.',
        }));
      }
      onSaved?.(saved);
    } catch (error) {
      setSubmitError(typeof error === 'string' ? error : error?.message || 'Could not save the sale.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <TextInput
        label="Name"
        required
        maxLength={100}
        value={form.name}
        onChange={onChange('name')}
        error={errors.name}
        placeholder="Eid Sale"
      />
      <SaleDateTimeField
        label="Starts"
        value={form.startsAt}
        onChange={set('startsAt')}
        error={errors.startsAt}
      />
      <SaleDateTimeField
        label="Ends"
        value={form.endsAt}
        onChange={set('endsAt')}
        error={errors.endsAt}
      />
      <TextInput
        label="Discount %"
        type="number"
        min="1"
        max="100"
        step="any"
        required
        suffix="%"
        value={form.discountPercentage}
        onChange={onNumberChange('discountPercentage')}
        error={errors.discountPercentage}
        onWheel={(event) => event.currentTarget.blur()}
      />
      <SwitchField
        checked={form.makeAlert}
        onChange={set('makeAlert')}
        label="Create alert automatically"
        hint="Show a matching alert on the products pages."
      />
      {form.makeAlert && (
        <SelectInput
          label="Alert type"
          value={form.type}
          onChange={set('type')}
          options={ALERT_TYPES.map((type) => ({
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
          }))}
        />
      )}

      {submitError && <p role="alert" className="text-sm text-error">{submitError}</p>}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <ActionButton variant="secondary" onClick={onCancel} disabled={saving}>Cancel</ActionButton>
        <ActionButton type="submit" loading={saving}>{sale ? 'Save sale' : 'Create sale'}</ActionButton>
      </div>
    </form>
  );
}
