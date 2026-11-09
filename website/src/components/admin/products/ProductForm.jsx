import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Boxes, FileText, ImagePlus, Star, Truck, Wallet, X, Image as ImageIcon } from 'lucide-react';

import { addProduct, updateProduct } from '../../../store/slices/productsSlice';
import productService from '../../../lib/appwrite/product';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import { colorFor, tint, toneVar } from '../../../ui/graphs/utils';
import { autoPrice, slugify, toForm, toPayload, validate } from './productSchema';

/* ---------- small field helpers (self-contained, theme tokens only) ---------- */

const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-graph-1 ${
    err ? 'border-error' : 'border-border hover:border-graph-1/50'
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

function Switch({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-graph-3/60"
    >
      <span>
        <span className="block text-sm font-medium text-text">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-graph-3' : 'bg-border'}`}>
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
    <div className="rounded-md border border-border bg-surface p-2 transition-colors focus-within:border-graph-1">
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
export default function ProductForm({ open, product, categories = [], groups = [], onClose, onSaved }) {
  const dispatch = useDispatch();
  const editing = Boolean(product);
  const fileInput = useRef(null);

  const [form, setForm] = useState(() => toForm(product));
  const [slugTouched, setSlugTouched] = useState(editing);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Images in display order. Existing: { key, id, url }  New (uploaded on save): { key, file, url }
  const [images, setImages] = useState(() =>
    (product?.imageIds || []).map((id) => ({ key: id, id, url: productService.getImageUrl(id) }))
  );
  const imagesRef = useRef(images);
  imagesRef.current = images;

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

  useEffect(() => () => imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url)), []);

  const set = (key) => (value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'name' && !slugTouched) next.slug = slugify(value);
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const on = (key) => (e) => set(key)(e.target.value);
  const blockWheel = (e) => e.currentTarget.blur(); // scrolling over a number box must not change it

  const computedPrice = useMemo(() => autoPrice(form), [form]);
  const total = Number(form.totalAvailable) || 0;
  const sold = Number(form.sold) || 0;
  const remaining = Math.max(0, total - sold);

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
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setSubmitError('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    setSubmitError('');
    let uploadedIds = [];
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

      // 3. save the row (service fills priceFormat, remaining and status)
      const data = productService.prepareProductData({ ...toPayload(form), slug, imageIds });
      if (editing) await dispatch(updateProduct([product.$id, data])).unwrap();
      else await dispatch(addProduct([data])).unwrap();

      // 4. remove images the admin deleted from the bucket
      const removed = (product?.imageIds || []).filter((id) => !imageIds.includes(id));
      if (removed.length) await productService.deleteImages(removed);

      onSaved?.();
    } catch (err) {
      if (uploadedIds.length) await productService.deleteImages(uploadedIds); // roll back
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
        aria-label={editing ? 'Edit product' : 'Add product'}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading truncate text-text">{editing ? 'Edit product' : 'Add product'}</h2>
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
            <Field label="Original price (Rs)" error={errors.originalPrice}>{num('originalPrice', { placeholder: '3000' })}</Field>
            <Field label="Discount %" error={errors.discountPercentage}>{num('discountPercentage', { max: 100, placeholder: '0' })}</Field>
            <Field label="Discount name" optional>
              <input value={form.discountName} onChange={on('discountName')} maxLength={100} placeholder="Eid sale" className={inputCls()} />
            </Field>
            <Field label="Final price (Rs)" hint={`auto: ${computedPrice.toLocaleString('en-PK')}`} error={errors.price}>
              {num('price', { placeholder: String(computedPrice) })}
            </Field>
            <Field label="Cost price (Rs)" hint="admin only" optional error={errors.costPrice}>{num('costPrice')}</Field>
            <Field label="Advance payment (Rs)" optional error={errors.priceAdvance}>{num('priceAdvance')}</Field>
            <Field label="Cash on delivery price (Rs)" optional error={errors.priceCOD}>{num('priceCOD')}</Field>
          </Section>

          <Section title="Stock" subtitle="Remaining and stock status update automatically." icon={Boxes} tone={2} delay={120}>
            <Field label="Total available" error={errors.totalAvailable}>{num('totalAvailable', { step: 1, placeholder: '0' })}</Field>
            <Field label="Sold" error={errors.sold}>{num('sold', { step: 1, placeholder: '0' })}</Field>
            <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5 text-sm sm:col-span-2">
              <span className="text-muted">Remaining</span>
              <span className="flex items-center gap-2">
                <b className="text-text tabular-nums">{remaining}</b>
                <span className={`rounded-full px-2 py-0.5 text-xs transition-colors ${remaining > 0 ? 'bg-graph-2/10 text-graph-2' : 'bg-graph-4/10 text-graph-4'}`}>
                  {remaining > 0 ? 'In stock' : 'Out of stock'}
                </span>
              </span>
            </div>
          </Section>

          <Section title="Delivery" subtitle="Charges, time and where it ships from." icon={Truck} tone={5} delay={180}>
            <Field label="Delivery charges (Rs)" error={errors.deliveryCharges}>{num('deliveryCharges', { placeholder: '0' })}</Field>
            <Field label="Delivery time" optional>
              <input value={form.deliveryTime} onChange={on('deliveryTime')} maxLength={100} placeholder="3-5 working days" className={inputCls()} />
            </Field>
            <Field label="Ships from" optional className="sm:col-span-2">
              <input value={form.deliveryFrom} onChange={on('deliveryFrom')} maxLength={150} placeholder="Lahore" className={inputCls()} />
            </Field>
          </Section>

          <section style={{ animationDelay: '240ms', borderTopColor: 'var(--graph-6)' }} className="group/sec animate-rise rounded-lg border border-border border-t-2 bg-surface-alt/40 p-4">
            <SectionHead icon={ImageIcon} tone={6} title="Images" subtitle="The first image is the main one. Tap the star on an image to make it main." />
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.key} className="group animate-rise relative aspect-square overflow-hidden rounded-md border border-border bg-surface">
                  <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-graph-6 px-2 py-0.5 text-[10px] font-medium text-white">Main</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    {i !== 0 && (
                      <button type="button" aria-label="Make main" onClick={() => makeMain(img)} className="grid h-7 w-7 place-items-center rounded bg-white/90 text-black"><Star size={14} /></button>
                    )}
                    <button type="button" aria-label="Remove image" onClick={() => removeImage(img)} className="grid h-7 w-7 place-items-center rounded bg-white/90 text-black"><X size={14} /></button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="grid aspect-square place-items-center rounded-md border border-dashed border-border text-muted transition-colors hover:border-graph-6 hover:bg-graph-6/10 hover:text-graph-6"
              >
                <span className="grid justify-items-center gap-1 text-xs"><ImagePlus size={20} />Add</span>
              </button>
            </div>
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
            <button type="submit" disabled={saving} className="btn btn-primary min-w-32 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}