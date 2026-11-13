import { useMemo, useState } from 'react';
import { Boxes, PackagePlus } from 'lucide-react';

import productService from '../../../lib/appwrite/product';
import financeService from '../../../lib/appwrite/finance';
import Drawer from '../../../ui/custom/modal/Drawer';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import SwitchField from '../../../ui/custom/input/SwitchField';
import { Field } from '../../../ui/custom/input/FormField';
import { inputCls } from '../../../ui/custom/input/inputStyles';
import { STOCK_CATEGORY, rs, toDateKey, keyToIso } from './financeSchema';

// Adds stock to a product and (optionally) records what it cost.
// props: open, products[], preset (product or null), onClose, onSaved
export default function RestockForm({ open, products = [], preset = null, onClose, onSaved }) {
  const [name, setName] = useState(preset?.name || '');
  const [units, setUnits] = useState('');
  const [unitCost, setUnitCost] = useState(preset?.costPrice ? String(preset.costPrice) : '');
  const [logExpense, setLogExpense] = useState(true);
  const [saveCost, setSaveCost] = useState(true);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const byName = useMemo(() => new Map(products.map((p) => [p.name, p])), [products]);
  const product = byName.get(name) || null;
  const n = Number(units) || 0;
  const cost = Number(unitCost) || 0;
  const before = Number(product?.remaining) || 0;

  const pickProduct = (value) => {
    setName(value);
    const p = byName.get(value);
    setUnitCost(p?.costPrice ? String(p.costPrice) : '');
    setErrors((e) => ({ ...e, product: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!product) found.product = 'Pick a product from the list.';
    if (!(Number.isInteger(n) && n > 0)) found.units = 'Whole number above 0.';
    if (unitCost !== '' && cost < 0) found.unitCost = 'Cannot be negative.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSubmitError('');
    const notes = [];
    const ok = await productService.updateStock(product.$id, { totalAvailable: (Number(product.totalAvailable) || 0) + n });
    if (!ok) { setSaving(false); setSubmitError('Could not update the stock.'); return; }
    if (saveCost && cost > 0 && cost !== Number(product.costPrice)) {
      if (!(await productService.updateProduct(product.$id, { costPrice: cost }))) notes.push('the cost price');
    }
    if (logExpense && cost > 0) {
      const entry = await financeService.addEntry({
        type: 'expense', title: `Restock: ${product.name} x${n}`, category: STOCK_CATEGORY,
        amount: n * cost, date: keyToIso(toDateKey()), note: `${n} units at ${rs(cost)} each`,
      });
      if (!entry) notes.push('the expense entry');
    }
    setSaving(false);
    if (notes.length) { setSubmitError(`Stock added, but ${notes.join(' and ')} could not be saved.`); onSaved?.(); return; }
    onSaved?.();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      busy={saving}
      onSubmit={submit}
      icon={PackagePlus}
      tone={2}
      width="max-w-lg"
      title="Restock a product"
      subtitle="Add units and record what they cost."
      footer={
        <>
          <p role="alert" className={`min-w-0 flex-1 text-sm text-error transition-opacity ${submitError ? 'opacity-100' : 'opacity-0'}`}>{submitError}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary min-w-32 disabled:opacity-60">{saving ? 'Saving…' : 'Add stock'}</button>
          </div>
        </>
      }
    >
      <section style={{ borderTopColor: 'var(--accent-tone-2)' }} className="animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field as="div" label="Product" error={errors.product} className="sm:col-span-2">
            <SearchSelect aria-label="Product" options={products.map((p) => p.name)} value={name} onChange={pickProduct} creatable={false} placeholder="Search a product" searchPlaceholder="Search products…" error={Boolean(errors.product)} />
          </Field>
          <Field label="Units to add" error={errors.units}>
            <input type="number" inputMode="numeric" min="1" step="1" value={units} onChange={(e) => { setUnits(e.target.value); setErrors((x) => ({ ...x, units: undefined })); }} onWheel={(e) => e.currentTarget.blur()} placeholder="10" className={inputCls(errors.units)} />
          </Field>
          <Field label="Cost per unit (Rs)" optional error={errors.unitCost}>
            <input type="number" inputMode="decimal" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} onWheel={(e) => e.currentTarget.blur()} placeholder="0" className={inputCls(errors.unitCost)} />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md bg-surface px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-muted"><Boxes size={15} className="text-accent-tone-2" />Units left</span>
          <span className="tabular-nums text-text">{before} <span className="text-muted">to</span> <b className="text-accent-tone-2">{before + n}</b></span>
        </div>
        {cost > 0 && n > 0 && (
          <p className="animate-rise mt-2 text-right text-xs text-muted">Total cost <b className="text-text">{rs(n * cost)}</b></p>
        )}
      </section>

      <div className="animate-rise space-y-3" style={{ animationDelay: '60ms' }}>
        <SwitchField checked={logExpense} onChange={setLogExpense} tone={4} label="Record as an expense" hint="Adds a “Stock purchase” entry to the ledger (lowers cash in hand)." />
        <SwitchField checked={saveCost} onChange={setSaveCost} tone={3} label="Update the product's cost price" hint="So profit is worked out from the latest cost." />
      </div>
    </Drawer>
  );
}