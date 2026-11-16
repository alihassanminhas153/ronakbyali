import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Boxes, FileText, ImagePlus, Star, Truck, Wallet, X, Image as ImageIcon } from 'lucide-react';

import { addProduct, updateProduct } from '../../../store/slices/productsSlice';
import { fetchSales, selectSaleOptions, selectSalesList } from '../../../store/slices/saleSlice';
import productService from '../../../lib/appwrite/product';
import ActionButton from '../../../ui/custom/button/ActionButton';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import SelectInput from '../../../ui/custom/input/SelectInput';
import ImageUploader from '../../../ui/custom/input/ImageUploader';
import AppIcon, { resolveAppIconName } from '../../../ui/custom/AppIcon';
import { colorFor, tint, toneVar } from '../../../ui/graphs/utils';
import { getSaleStatus } from '../../../lib/saleMath';
import { autoPrice, slugify, toForm, toPayload, validate } from './productSchema';

/* ---------- small field helpers (self-contained, theme tokens only) ---------- */

const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-accent-tone-1 ${
    err ? 'border-error' : 'border-border hover:border-accent-tone-1/50'
  }`;
const optionDraft = () => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  price: '',
});
const optionId = () => globalThis.crypto?.randomUUID?.() || `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

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
      <AppIcon
        name={resolveAppIconName(Icon)}
        tone={tone}
        className="h-9 w-9 shrink-0 object-contain transition-transform duration-300 group-hover/sec:-rotate-6 group-hover/sec:scale-110"
      />
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
      style={{ animationDelay: `${delay}ms` }}
      className="group/sec animate-rise rounded-lg border border-border bg-surface-alt/40 p-4"
    >
      <SectionHead icon={icon} title={title} subtitle={subtitle} tone={tone} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent-tone-3/60"
    >
      <span>
        <span className="block text-sm font-medium text-text">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-accent-tone-3' : 'bg-border'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function TagsField({ value, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim().replace(/,$/, '');
    if (t && t.length <= 50 && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="rounded-md border border-border bg-surface p-2 transition-colors focus-within:border-accent-tone-1">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="animate-rise inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: tint(colorFor(t), 14), color: colorFor(t) }}>
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={value.length ? 'Add tag' : 'Type a tag and press Enter'}
          className="min-h-8 min-w-32 flex-1 border-0 bg-transparent p-1 text-sm"
        />
      </div>
    </div>
  );
}

/* ---------- the drawer ---------- */

// props: open, product (null = add), categories[], groups[], onClose, onSaved
export default function ProductForm({ open, product, categories = [], groups = [], onClose, onSaved, mode = 'normal' }) {
  const dispatch = useDispatch();
  const sales = useSelector(selectSalesList);
  const allSaleOptions = useSelector(selectSaleOptions);
  const editing = Boolean(product);
  const customMode = mode === 'custom';
  const fileInput = useRef(null);
  const optionRowRef = useRef(null);

  const [form, setForm] = useState(() => toForm(product));
  const [customOptions, setCustomOptions] = useState(() => toForm(product).customOptions);
  const [optionDrafts, setOptionDrafts] = useState(() => [optionDraft()]);
  const [optionErrors, setOptionErrors] = useState({});
  const [optionListError, setOptionListError] = useState('');
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [optionEdit, setOptionEdit] = useState({ label: '', price: '' });
  const [slugTouched, setSlugTouched] = useState(editing);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Images in display order. Existing: { key, id, url }  New (uploaded on save): { key, file, url }
  const [images, setImages] = useState(() =>
    (product?.imageIds || []).map((id) => ({ key: id, id, url: productService.getImageUrl(id) }))
  );
  const [sampleImages, setSampleImages] = useState(() =>
    product?.customFileId
      ? [{ key: product.customFileId, kind: 'existing', id: product.customFileId, url: productService.getImageUrl(product.customFileId) }]
      : []
  );
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // Slide-in: mount closed, flip to open on the next frame so the transition runs.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) { setShown(false); return undefined; }
    dispatch(fetchSales());
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [dispatch, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, saving, onClose]);

  useEffect(() => () => imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url)), []);

  const set = (key) => (value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'name' && !slugTouched) next.slug = slugify(value);
      if (key === 'originalPrice' && f.saleId) {
        const sale = sales.find((item) => item.$id === f.saleId);
        if (sale) {
          const percentage = Number(sale.discountPercentage) || 0;
          next.price = String(Math.round((Number(value) || 0) * (1 - percentage / 100)));
        }
      }
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const selectSale = (saleId) => {
    const sale = sales.find((item) => item.$id === saleId);
    setErrors((current) => ({ ...current, discountPercentage: undefined, price: undefined }));
    setForm((f) => {
      if (!sale) {
        return {
          ...f,
          saleId: '',
          discountName: '',
          discountPercentage: '0',
          price: String(Number(f.originalPrice) || 0),
        };
      }
      const percentage = Number(sale.discountPercentage) || 0;
      return {
        ...f,
        saleId,
        discountName: sale.name || '',
        discountPercentage: String(percentage),
        price: String(Math.round((Number(f.originalPrice) || 0) * (1 - percentage / 100))),
      };
    });
  };
  const on = (key) => (e) => set(key)(e.target.value);
  const blockWheel = (e) => e.currentTarget.blur(); // scrolling over a number box must not change it

  const computedPrice = useMemo(() => autoPrice(form), [form]);
  const saleOptions = allSaleOptions.filter((option) => {
    const sale = sales.find((item) => item.$id === option.value);
    return sale && (option.value === form.saleId || getSaleStatus(sale) !== 'ended');
  });
  const selectedSale = sales.find((item) => item.$id === form.saleId);
  const salePriceHint = selectedSale
    ? `Price after sale: Rs ${Math.round((Number(form.originalPrice) || 0) * (1 - (Number(selectedSale.discountPercentage) || 0) / 100)).toLocaleString('en-PK')}`
    : '';
  const total = Number(form.totalAvailable) || 0;
  const sold = Number(form.sold) || 0;
  const remaining = Math.max(0, total - sold);

  const validateOption = (labelValue, priceValue, skipId = null) => {
    const label = String(labelValue || '').trim();
    const price = priceValue === '' ? Number.NaN : Number(priceValue);
    if (!label) return { label: 'Enter a customization name.' };
    if (label.length > 60) return { label: 'Use 60 characters or fewer.' };
    if (customOptions.some((item) => item.id !== skipId && item.label.trim().toLowerCase() === label.toLowerCase())) {
      return { label: 'Customization names must be unique.' };
    }
    if (!Number.isFinite(price) || price < 0 || price > 1000000) {
      return { price: 'Enter a price from Rs 0 to Rs 1,000,000.' };
    }
    return {};
  };

  const updateDraft = (id, key, value) => {
    setOptionDrafts((rows) => rows.map((row) => row.id === id ? { ...row, [key]: value } : row));
    setOptionErrors((current) => ({ ...current, [id]: undefined }));
    setOptionListError('');
  };

  const addCustomization = (event, draft) => {
    event.preventDefault();
    if (customOptions.length >= 20) {
      setOptionListError('You can add up to 20 customizations.');
      return;
    }
    const found = validateOption(draft.label, draft.price);
    if (Object.keys(found).length) {
      setOptionErrors((current) => ({ ...current, [draft.id]: found }));
      return;
    }
    setCustomOptions((items) => [...items, {
      id: optionId(),
      label: draft.label.trim(),
      price: Number(draft.price),
    }]);
    setOptionDrafts((rows) => rows.filter((row) => row.id !== draft.id));
    setOptionErrors((current) => ({ ...current, [draft.id]: undefined }));
    setOptionListError('');
  };

  const addOptionRow = () => {
    if (customOptions.length + optionDrafts.length >= 20) {
      setOptionListError('You can add up to 20 customizations.');
      return;
    }
    setOptionDrafts((rows) => [...rows, optionDraft()]);
    setOptionListError('');
  };

  const saveOptionEdit = (event) => {
    event.preventDefault();
    const found = validateOption(optionEdit.label, optionEdit.price, editingOptionId);
    if (Object.keys(found).length) {
      setOptionErrors((current) => ({ ...current, [editingOptionId]: found }));
      return;
    }
    setCustomOptions((items) => items.map((item) => item.id === editingOptionId
      ? { ...item, label: optionEdit.label.trim(), price: Number(optionEdit.price) }
      : item));
    setEditingOptionId(null);
    setOptionErrors((current) => ({ ...current, [editingOptionId]: undefined }));
  };

  const addFiles = (list) => {
    const picked = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
    setImages((cur) => [...cur, ...picked.map((file) => {
      const url = URL.createObjectURL(file);
      return { key: url, file, url };
    })]);
  };
  const removeImage = (img) => {
    if (img.file) URL.revokeObjectURL(img.url);
    setImages((cur) => cur.filter((x) => x !== img));
  };
  const makeMain = (img) => setImages((cur) => [img, ...cur.filter((x) => x !== img)]);

  const submit = async (e) => {
    e.preventDefault();
    const formForValidation = customMode ? { ...form, totalAvailable: '0', sold: '0' } : { ...form, isCustom: false };
    const found = validate(formForValidation);
    const partialOptions = optionDrafts.some((row) => row.label.trim() || row.price !== '');
    if (customMode && customOptions.length === 0) found.customOptions = 'Add at least one customization.';
    if (customMode && partialOptions) found.customOptions = 'Add or remove the unfinished customization row.';
    setErrors(found);
    if (Object.keys(found).length) {
      setSubmitError('Please fix the highlighted fields.');
      if (found.customOptions) optionRowRef.current?.focus();
      return;
    }
    setSaving(true);
    setSubmitError('');
    let uploadedIds = [];
    let uploadedSampleId = null;
    try {
      // 1. unique slug
      const slug = await productService.generateUniqueSlug(form.slug || form.name, product?.$id);
      if (!slug) throw new Error('Could not create a unique slug. Try another name.');

      // 2. upload new images (kept ones stay as they are)
      const fresh = images.filter((i) => i.file);
      if (fresh.length) {
        const uploaded = await productService.uploadImages(fresh.map((i) => i.file));
        if (!uploaded) throw new Error('Image upload failed.');
        uploadedIds = uploaded.map((f) => f.$id);
      }
      let next = 0;
      const imageIds = images.map((i) => (i.file ? uploadedIds[next++] : i.id)); // keeps the admin's order

      let customFileId = null;
      if (customMode && sampleImages[0]) {
        if (sampleImages[0].kind === 'new') {
          const uploaded = await productService.uploadImage(sampleImages[0].file);
          if (!uploaded) throw new Error('Sample image upload failed.');
          uploadedSampleId = uploaded.$id;
          customFileId = uploadedSampleId;
        } else {
          customFileId = sampleImages[0].id;
        }
      }

      // 3. save the row (service fills priceFormat, remaining and status)
      const payload = {
        ...toPayload({ ...form, isCustom: customMode, customOptions }),
        slug,
        imageIds,
        customFileId: customMode ? customFileId : null,
      };
      if (customMode) {
        delete payload.totalAvailable;
        delete payload.sold;
        delete payload.remaining;
        payload.status = 'inStock';
      }
      const data = productService.prepareProductData(payload);
      if (editing) await dispatch(updateProduct([product.$id, data])).unwrap();
      else await dispatch(addProduct([data])).unwrap();

      // 4. remove images the admin deleted from the bucket
      const removed = (product?.imageIds || []).filter((id) => !imageIds.includes(id));
      if (removed.length) await productService.deleteImages(removed);
      if (product?.customFileId && product.customFileId !== customFileId) {
        await productService.deleteImage(product.customFileId);
      }

      onSaved?.();
    } catch (err) {
      if (uploadedIds.length) await productService.deleteImages(uploadedIds); // roll back
      if (uploadedSampleId) await productService.deleteImage(uploadedSampleId);
      setSubmitError(typeof err === 'string' ? err : err?.message || 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  };

  const num = (key, props = {}) => (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      value={form[key]}
      onChange={on(key)}
      onWheel={blockWheel}
      className={inputCls(errors[key])}
      {...props}
    />
  );

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
        aria-label={editing ? `Edit ${customMode ? 'custom product' : 'product'}` : `Add ${customMode ? 'custom product' : 'product'}`}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading truncate text-text">
              {editing ? `Edit ${customMode ? 'custom product' : 'product'}` : `Add ${customMode ? 'custom product' : 'product'}`}
            </h2>
            <p className="truncate text-xs text-muted">{editing ? product.name : 'Fill in the details, then save.'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <Section title="Basics" subtitle="What the shopper sees first." icon={FileText} tone={1} delay={0}>
            <Field label="Name" error={errors.name} className="sm:col-span-2">
              <input value={form.name} onChange={on('name')} maxLength={255} placeholder="Rose lawn suit" className={inputCls(errors.name)} />
            </Field>
            <Field label="Slug" hint="used in the product link" error={errors.slug} className="sm:col-span-2">
              <input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set('slug')(slugify(e.target.value)); }}
                placeholder="rose-lawn-suit"
                className={inputCls(errors.slug)}
              />
            </Field>
            <Field as="div" label="Category" error={errors.category}>
              <SearchSelect
                aria-label="Category"
                options={categories}
                value={form.category}
                onChange={set('category')}
                placeholder="Select or create a category"
                searchPlaceholder="Search categories…"
                error={Boolean(errors.category)}
                clearable={false}
              />
            </Field>
            <Field as="div" label="Group" optional>
              <SearchSelect
                aria-label="Group"
                options={groups}
                value={form.group}
                onChange={set('group')}
                placeholder="Select or create a group"
                searchPlaceholder="Search groups…"
              />
            </Field>
            <Field label="Description" optional className="sm:col-span-2">
              <textarea value={form.description} onChange={on('description')} rows={4} className={`${inputCls()} resize-y py-2`} placeholder="Fabric, fit, care…" />
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-text">Tags <span className="font-normal text-muted">(optional)</span></span>
              <TagsField value={form.tags} onChange={set('tags')} />
            </div>
            <Field label="Display order" hint="lower shows first" error={errors.order}>{num('order', { step: 1 })}</Field>
            <div className="flex items-end">
              <Switch checked={form.featured} onChange={set('featured')} label="Featured" hint="Show on the home page" />
            </div>
          </Section>

          <Section title="Pricing" subtitle="Final price and the formatted label are calculated for you." icon={Wallet} tone={3} delay={60}>
            <div className="sm:col-span-2">
              <SelectInput
                label="Sale"
                value={form.saleId}
                onChange={selectSale}
                options={saleOptions}
                placeholder="No sale"
                clearable
                hint={salePriceHint}
                size="md"
              />
            </div>
            <Field label={`${customMode ? 'Starting' : 'Original'} price (Rs)`} error={errors.originalPrice}>{num('originalPrice', { placeholder: '3000' })}</Field>
            <Field label="Discount %" error={errors.discountPercentage}>{num('discountPercentage', { max: 100, placeholder: '0', disabled: Boolean(form.saleId) })}</Field>
            <Field label="Discount name" optional>
              <input value={form.discountName} onChange={on('discountName')} maxLength={100} placeholder="Eid sale" disabled={Boolean(form.saleId)} className={inputCls()} />
            </Field>
            <Field label="Final price (Rs)" hint={`auto: ${computedPrice.toLocaleString('en-PK')}`} error={errors.price}>
              {num('price', { placeholder: String(computedPrice) })}
            </Field>
            <Field label="Cost price (Rs)" hint="admin only" optional error={errors.costPrice}>{num('costPrice')}</Field>
            <Field label="Advance payment (Rs)" optional error={errors.priceAdvance}>{num('priceAdvance')}</Field>
            <Field label="Cash on delivery price (Rs)" optional error={errors.priceCOD}>{num('priceCOD')}</Field>
          </Section>

          {!customMode && (
            <Section title="Stock" subtitle="Remaining and stock status update automatically." icon={Boxes} tone={2} delay={120}>
              <Field label="Total available" error={errors.totalAvailable}>{num('totalAvailable', { step: 1, placeholder: '0' })}</Field>
              <Field label="Sold" error={errors.sold}>{num('sold', { step: 1, placeholder: '0' })}</Field>
              <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5 text-sm sm:col-span-2">
                <span className="text-muted">Remaining</span>
                <span className="flex items-center gap-2">
                  <b className="text-text tabular-nums">{remaining}</b>
                  <span className={`rounded-full px-2 py-0.5 text-xs transition-colors ${remaining > 0 ? 'bg-accent-tone-2/10 text-accent-tone-2' : 'bg-accent-tone-4/10 text-accent-tone-4'}`}>
                    {remaining > 0 ? 'In stock' : 'Out of stock'}
                  </span>
                </span>
              </div>
            </Section>
          )}

          <Section title="Delivery" subtitle="Charges, time and where it ships from." icon={Truck} tone={5} delay={180}>
            <Field label="Delivery charges (Rs)" error={errors.deliveryCharges}>{num('deliveryCharges', { placeholder: '0' })}</Field>
            <Field label="Delivery time" optional>
              <input value={form.deliveryTime} onChange={on('deliveryTime')} maxLength={100} placeholder="3-5 working days" className={inputCls()} />
            </Field>
            <Field label="Ships from" optional className="sm:col-span-2">
              <input value={form.deliveryFrom} onChange={on('deliveryFrom')} maxLength={150} placeholder="Lahore" className={inputCls()} />
            </Field>
          </Section>

          {customMode && (
            <Section title="Customizations" subtitle="Give customers clear choices and prices for their made-to-order product." icon={Star} tone={7} delay={210}>
              <Field label="Instructions for the customer" hint={`${form.customDetails.length}/1000`} className="sm:col-span-2">
                <textarea
                  value={form.customDetails}
                  onChange={on('customDetails')}
                  rows={3}
                  maxLength={1000}
                  className={`${inputCls()} resize-y py-2`}
                  placeholder="What should customers send, which sizes are needed, and what are the deadlines?"
                />
              </Field>
              <div ref={optionRowRef} tabIndex={-1} className="space-y-3 sm:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold text-text">What can be customized</h4>
                  <p className="text-xs text-muted">Each option price is added to the starting price for every item.</p>
                </div>
                <div className="space-y-2">
                  {customOptions.map((option) => editingOptionId === option.id ? (
                    <div key={option.id} className="grid gap-2 rounded-md border border-accent/40 bg-surface p-3">
                      <input
                        aria-label="Customization name"
                        value={optionEdit.label}
                        maxLength={60}
                        onChange={(event) => setOptionEdit((current) => ({ ...current, label: event.target.value }))}
                        className={inputCls(optionErrors[option.id]?.label)}
                      />
                      {optionErrors[option.id]?.label && <p className="text-xs text-error">{optionErrors[option.id].label}</p>}
                      <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <input
                          aria-label="Customization price in rupees"
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          value={optionEdit.price}
                          onChange={(event) => setOptionEdit((current) => ({ ...current, price: event.target.value }))}
                          className={inputCls(optionErrors[option.id]?.price)}
                        />
                        {optionErrors[option.id]?.price && <p className="text-xs text-error">{optionErrors[option.id].price}</p>}
                        <ActionButton type="button" onClick={saveOptionEdit}>Save</ActionButton>
                        <ActionButton type="button" variant="secondary" onClick={() => { setEditingOptionId(null); setOptionErrors((current) => ({ ...current, [option.id]: undefined })); }}>Cancel</ActionButton>
                      </div>
                    </div>
                  ) : (
                    <div key={option.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                      <button
                        type="button"
                        onClick={() => { setEditingOptionId(option.id); setOptionEdit({ label: option.label, price: String(option.price) }); }}
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-text hover:text-accent"
                      >
                        {option.label} · + Rs {option.price.toLocaleString('en-PK')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomOptions((items) => items.filter((item) => item.id !== option.id))}
                        aria-label={`Remove ${option.label}`}
                        className="grid size-8 shrink-0 place-items-center rounded text-muted hover:bg-error/10 hover:text-error"
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {optionDrafts.map((draft) => (
                    <div key={draft.id} className="grid grid-cols-1 items-start gap-2 min-[481px]:grid-cols-[minmax(0,1fr)_8rem_auto]">
                      <label className="block">
                        <span className="sr-only">Customization name</span>
                        <input
                          value={draft.label}
                          maxLength={60}
                          onChange={(event) => updateDraft(draft.id, 'label', event.target.value)}
                          placeholder="e.g. Embroidery"
                          aria-invalid={Boolean(optionErrors[draft.id]?.label)}
                          className={inputCls(optionErrors[draft.id]?.label)}
                        />
                        {optionErrors[draft.id]?.label && <span className="mt-1 block text-xs text-error">{optionErrors[draft.id].label}</span>}
                      </label>
                      <label className="block">
                        <span className="sr-only">Customization price in rupees</span>
                        <input
                          value={draft.price}
                          onChange={(event) => updateDraft(draft.id, 'price', event.target.value)}
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          placeholder="PKR"
                          aria-invalid={Boolean(optionErrors[draft.id]?.price)}
                          className={inputCls(optionErrors[draft.id]?.price)}
                        />
                        {optionErrors[draft.id]?.price && <span className="mt-1 block text-xs text-error">{optionErrors[draft.id].price}</span>}
                      </label>
                      <ActionButton type="button" onClick={(event) => addCustomization(event, draft)}>Add</ActionButton>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOptionRow}
                  disabled={customOptions.length + optionDrafts.length >= 20}
                  className="w-full rounded-md border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add more
                </button>
                {(optionListError || errors.customOptions) && <p role="alert" className="text-xs text-error">{optionListError || errors.customOptions}</p>}
              </div>
              <div className="sm:col-span-2">
                <ImageUploader
                  items={sampleImages}
                  onChange={setSampleImages}
                  label="Sample image"
                  hint="Optional example shown to customers."
                  max={1}
                  maxSizeMB={5}
                  disabled={saving}
                />
              </div>
            </Section>
          )}

          <section style={{ animationDelay: '240ms' }} className="group/sec animate-rise rounded-lg border border-border bg-surface-alt/40 p-4">
            <SectionHead icon={ImageIcon} tone={6} title="Images" subtitle="The first image is the main one. Tap the star on an image to make it main." />
            {/* full-width rectangular upload button + drop zone */}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`mt-4 flex w-full items-center justify-center gap-3 rounded-md border border-dashed px-4 py-5 text-sm transition-colors ${
                dragOver ? 'border-accent-tone-6 bg-accent-tone-6/10 text-accent-tone-6' : 'border-border bg-surface text-muted hover:border-accent-tone-6 hover:bg-accent-tone-6/10 hover:text-accent-tone-6'
              }`}
            >
              <ImagePlus size={22} className="shrink-0" />
              <span className="text-left">
                <span className="block font-medium">Click to upload images</span>
                <span className="block text-xs opacity-80">or drag and drop them here</span>
              </span>
            </button>

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <div key={img.key} className="group animate-rise relative aspect-square overflow-hidden rounded-md border border-border bg-surface">
                    <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-accent-tone-6 px-2 py-0.5 text-[10px] font-medium text-white">Main</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      {i !== 0 && (
                        <button type="button" aria-label="Make main" onClick={() => makeMain(img)} className="grid h-7 w-7 place-items-center rounded bg-white/90 text-black"><Star size={14} /></button>
                      )}
                      <button type="button" aria-label="Remove image" onClick={() => removeImage(img)} className="grid h-7 w-7 place-items-center rounded bg-white/90 text-black"><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </section>

          {editing && (
            <p className="px-1 text-xs text-muted">
              Reviews: {product.reviewCount || 0} · Rating {Number(product.ratingAverage || 0).toFixed(1)} / 5 (updated from customer reviews)
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">
          <p role="alert" className={`min-w-0 flex-1 text-sm text-error transition-opacity ${submitError ? 'opacity-100' : 'opacity-0'}`}>{submitError}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))', color: 'var(--on-brown)' }}
              className="btn min-w-32 transition-[filter,transform] hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

export function CustomProductForm(props) {
  return <ProductForm {...props} mode="custom" />;
}