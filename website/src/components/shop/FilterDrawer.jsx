import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

import ActionButton from '../../ui/custom/button/ActionButton';
import { FILTER_KEYS as K, SORT_OPTIONS, STATUS_OPTIONS, isSet } from './shopMeta';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

const toDraft = (filters) => ({
  status: filters[K.status] ?? '',
  sort: filters[K.sort] ?? '',
  min: isSet(filters[K.min]) ? String(filters[K.min]) : '',
  max: isSet(filters[K.max]) ? String(filters[K.max]) : '',
});

const digits = (value) => value.replace(/\D/g, '');

function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-text">{label}</legend>
      <div role="radiogroup" aria-label={label} className="space-y-1.5">
        {options.map((option) => {
          const on = option.value === value;
          return (
            <button
              key={option.value || 'default'}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(option.value)}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-colors duration-200 motion-reduce:transition-none ${FOCUS} ${
                on
                  ? 'border-accent bg-accent/10 text-text'
                  : 'border-border text-muted hover:bg-border/40 hover:text-text'
              }`}
            >
              {option.label}
              <Check
                size={16}
                aria-hidden="true"
                className={`text-accent transition-opacity duration-200 motion-reduce:transition-none ${
                  on ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PriceField({ id, label, value, placeholder, onChange }) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(digits(event.target.value))}
        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-muted transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 motion-reduce:transition-none"
      />
    </div>
  );
}

// Right-hand filter panel. It edits a draft; nothing changes in the list until "Apply filters".
export default function FilterDrawer({ open, onClose, filters, priceRange, onApply, onReset }) {
  const [draft, setDraft] = useState(() => toDraft(filters));
  const panelRef = useRef(null);

  // Each time the panel opens, start from what is currently applied.
  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(filters));
    panelRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const min = draft.min === '' ? null : Number(draft.min);
  const max = draft.max === '' ? null : Number(draft.max);
  const invalidRange = min !== null && max !== null && min > max;

  const apply = () => {
    if (invalidRange) return;
    onApply({ [K.status]: draft.status, [K.sort]: draft.sort, [K.min]: min, [K.max]: max });
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-[visibility] duration-300 ${open ? 'visible' : 'invisible'}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="filter-drawer-title" className="text-lg font-semibold text-text">
            Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className={`rounded-md p-2 text-muted transition-colors duration-200 hover:bg-border/40 hover:text-text motion-reduce:transition-none ${FOCUS}`}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6">
          <ChoiceGroup label="Sort by" options={SORT_OPTIONS} value={draft.sort} onChange={(sort) => set({ sort })} />
          <ChoiceGroup
            label="Availability"
            options={STATUS_OPTIONS}
            value={draft.status}
            onChange={(status) => set({ status })}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-text">Price range</legend>
            <div className="flex items-end gap-3">
              <PriceField
                id="filter-min"
                label="Minimum"
                value={draft.min}
                placeholder={isSet(priceRange?.min) ? String(priceRange.min) : '0'}
                onChange={(value) => set({ min: value })}
              />
              <span aria-hidden="true" className="pb-3 text-muted">
                to
              </span>
              <PriceField
                id="filter-max"
                label="Maximum"
                value={draft.max}
                placeholder={isSet(priceRange?.max) ? String(priceRange.max) : 'Any'}
                onChange={(value) => set({ max: value })}
              />
            </div>
            {invalidRange && (
              <p role="alert" className="mt-2 text-sm text-error">
                The minimum price is higher than the maximum.
              </p>
            )}
          </fieldset>
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <ActionButton
            variant="secondary"
            onClick={onReset}
          >
            Reset
          </ActionButton>
          <div className="flex-1">
            <ActionButton onClick={apply} disabled={invalidRange}>
              Apply filters
            </ActionButton>
          </div>
        </div>
      </aside>
    </div>
  );
}