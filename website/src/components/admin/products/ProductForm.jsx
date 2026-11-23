import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronRight, ImagePlus, Loader2, Plus, Search, Star, X } from 'lucide-react';

import { addProduct, updateProduct, fetchAllProducts, selectAllProducts } from '../../../store/slices/productsSlice';
import { fetchSales, selectSaleOptions, selectSalesList } from '../../../store/slices/saleSlice';
import productService from '../../../lib/appwrite/product';
import ActionButton from '../../../ui/custom/button/ActionButton';
import AdminSearchSelect from '../AdminSearchSelect';
import SearchSelect from '../../../ui/custom/input/SearchSelect';
import SelectionGrid from '../../../ui/custom/input/SelectionGrid';
import ImageUploader from '../../../ui/custom/input/ImageUploader';
import { getSaleStatus } from '../../../lib/saleMath';
import { normalizeNumberInput } from '../../../lib/numberInput';
import { toTitleCase } from '../../../lib/textCase';
import { autoPrice, slugify, toForm, toPayload, validate } from './productSchema';

/* ---------- small helpers (theme tokens only) ---------- */

const inputCls = (err) =>
  `w-full rounded-md border bg-surface px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus:border-accent ${
    err ? 'border-error' : 'border-border hover:border-accent/50'
  }`;
const optionDraft = () => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  price: '',
});
const optionId = () => globalThis.crypto?.randomUUID?.() || `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const rs = (n) => `Rs ${(Number(n) || 0).toLocaleString('en-PK')}`;

// Number fields that start at 0 are left EMPTY so "0" shows as a placeholder
// (an empty box is saved as 0 by toPayload / validate).
const ZERO_BLANK = ['order', 'discountPercentage', 'deliveryCharges', 'totalAvailable', 'sold'];
const blankZeros = (f) => {
  const next = { ...f };
  ZERO_BLANK.forEach((k) => {
    if (next[k] === '' || Number(next[k]) === 0) next[k] = '';
  });
  return next;
};
const initialForm = (product) => {
  const form = blankZeros(toForm(product));
  PRODUCT_TEXT_FIELDS.forEach((key) => { form[key] = toTitleCase(form[key]); });
  form.tags = form.tags.map(toTitleCase);
  form.customOptions = form.customOptions.map((option) => ({ ...option, label: toTitleCase(option.label) }));
  return { ...form, slug: slugify(form.slug || form.name) };
};
const zeroBlank = (v) => (v == null || Number(v) === 0 ? '' : String(v));
const text = (v) => (v == null ? '' : String(v));
const PRODUCT_TEXT_FIELDS = new Set([
  'name',
  'description',
  'category',
  'group',
  'discountName',
  'deliveryTime',
  'deliveryFrom',
  'customDetails',
]);
const editingSlug = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');
const nameFromSlug = (value) => toTitleCase(value.split('-').filter(Boolean).join(' '));

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

function Section({ title, subtitle, children, delay = 0, className = '' }) {
  return (
    <section style={{ animationDelay: `${delay}ms` }} className={`animate-rise rounded-xl border border-border bg-surface p-4 sm:p-5 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
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
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2 text-left transition-colors hover:border-accent/50"
    >
      <span>
        <span className="block text-sm font-medium text-text">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-border'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function TagsField({ value, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = toTitleCase(draft).trim().replace(/,$/, '');
    if (t && t.length <= 50 && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="rounded-md border border-border bg-surface p-2 transition-colors focus-within:border-accent">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="animate-rise inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-text">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="text-muted hover:text-error">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(toTitleCase(e.target.value))}
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

/* ---------- floating notice (slides in from the right edge) ---------- */

function Notice({ notice, onClose }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const hide = setTimeout(() => setShown(false), 6500);
    const gone = setTimeout(() => onClose(notice.id), 6850);
    return () => { cancelAnimationFrame(raf); clearTimeout(hide); clearTimeout(gone); };
  }, [notice.id, onClose]);

  const warn = notice.tone !== 'success';
  const Icon = warn ? AlertTriangle : CheckCircle2;
  return (
    <div
      role={warn ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3 text-sm shadow-soft transition-all duration-300 ease-out ${
        warn ? 'border-warning/40 bg-warning-soft text-warning-fg' : 'border-success/40 bg-success-soft text-success-fg'
      } ${shown ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0'}`}
    >
      <Icon size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{notice.text}</p>
      <button type="button" aria-label="Dismiss" onClick={() => { setShown(false); setTimeout(() => onClose(notice.id), 300); }} className="shrink-0 opacity-70 hover:opacity-100">
        <X size={15} />
      </button>
    </div>
  );
}

// Thumbnail: small server-resized preview first, full file if that fails.
function Thumb({ id, url, className }) {
  const thumb = id ? productService.getThumbUrl?.(id) ?? null : null;
  const [src, setSrc] = useState(thumb || url);
  const failed = useRef(false);
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => { if (!failed.current && url && src !== url) { failed.current = true; setSrc(url); } }}
    />
  );
}

/* ---------- product picker (opens like a file-chooser box) ---------- */

const PAGE = 12;

function ProductPicker({ open, customMode, onClose, onPick }) {
  const [term, setTerm] = useState('');
  const dispatch = useDispatch();
  const all = useSelector(selectAllProducts); // instant: rows already in the store
  const [shown, setShown] = useState(PAGE);
  const [status, setStatus] = useState('idle'); // idle | refreshing | failed
  const [selected, setSelected] = useState(null);

  // Show the store rows right away, then top up with any rows it does not have yet.
  const load = useCallback(async () => {
    setStatus('refreshing');
    try {
      await dispatch(fetchAllProducts()).unwrap();
      setStatus('idle');
    } catch {
      setStatus('failed');
    }
  }, [dispatch]);

  // The store already has the products: only hit the network if it is empty.
  // (Re-fetching all rows replaced every product in the store and re-rendered
  // the whole admin page behind this drawer, which froze the UI on pick.)
  const hadRows = useRef(false);
  hadRows.current = all.length > 0;
  useEffect(() => {
    if (open && !hadRows.current) load();
  }, [open, load]);

  const query = term.trim().toLowerCase();
  const matches = useMemo(() => {
    const list = all
      .filter((p) => Boolean(p.isCustom) === Boolean(customMode))
      .filter((p) => !query || [p.name, p.category, p.group, p.description, ...(p.tags || [])]
        .some((v) => String(v || '').toLowerCase().includes(query)))
      .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
    return list;
  }, [all, customMode, query]);
  const rows = matches.slice(0, shown);
  const total = matches.length;

  useEffect(() => { setShown(PAGE); }, [query, customMode, open]);

  useEffect(() => {
    if (!open) { setTerm(''); setSelected(null); return undefined; }
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  const hasMore = rows.length < total;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a product"
        onClick={(e) => e.stopPropagation()}
        className="animate-rise flex h-[min(85vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-bg shadow-soft sm:rounded-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text">Choose a product</h3>
            <p className="text-xs text-muted">Its details and images will be copied into this form.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {status === 'refreshing' && all.length === 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-border bg-surface p-2">
                  <div className="aspect-square rounded-md bg-surface-alt" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-surface-alt" />
                </div>
              ))}
            </div>
          )}

          {status === 'failed' && all.length === 0 && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-sm text-text">Could not load products.</p>
                <button type="button" onClick={load} className="mt-2 text-sm font-medium text-accent hover:underline">Try again</button>
              </div>
            </div>
          )}

          {!(status === 'refreshing' && all.length === 0) && !(status === 'failed' && all.length === 0) && rows.length === 0 && (
            <div className="grid h-full place-items-center text-center text-sm text-muted">
              {query ? `No products match “${term.trim()}”.` : 'No products yet.'}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {rows.map((p) => {
                  const active = selected?.$id === p.$id;
                  const img = productService.getMainImageUrl(p);
                  const imgId = p.imageIds?.[0];
                  return (
                    <li key={p.$id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelected(p)}
                        onDoubleClick={() => onPick(p)}
                        className={`group relative block w-full rounded-lg border p-2 text-left transition-all ${
                          active ? 'border-accent bg-accent-soft ring-2 ring-accent/40' : 'border-border bg-surface hover:border-accent/50'
                        }`}
                      >
                        <span className="relative block aspect-square overflow-hidden rounded-md bg-surface-alt">
                          {img ? (
                            <Thumb id={imgId} url={img} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-muted"><ImagePlus size={22} aria-hidden="true" /></span>
                          )}
                          {active && (
                            <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-white shadow-soft">
                              <Check size={14} aria-hidden="true" />
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block truncate text-sm font-medium text-text">{p.name}</span>
                        <span className="block truncate text-xs text-muted">{rs(p.price)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="mt-4 w-full rounded-md border border-border py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  Load more
                </button>
              )}
            </>
          )}
        </div>

        {/* search sits at the bottom, like the file name bar of a file chooser */}
        <footer className="space-y-3 border-t border-border bg-surface px-4 py-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={term}
              onChange={(e) => setTerm(toTitleCase(e.target.value))}
              placeholder="Search products by name…"
              aria-label="Search products"
              className={`${inputCls()} h-10 pl-9`}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 truncate text-xs text-muted">{selected ? selected.name : 'Select one product'}</p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
              <button
                type="button"
                disabled={!selected}
                onClick={() => onPick(selected)}
                style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))', color: 'var(--on-brown)' }}
                className="btn min-w-28 transition-[filter,transform] hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                Use product
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ---------- the drawer ---------- */

// props: open, product (null = add), categories[], groups[], onClose, onSaved
export default function ProductForm({ open, product, categories = [], groups = [], onClose, onSaved, mode = 'normal' }) {
  const dispatch = useDispatch();
  const sales = useSelector(selectSalesList);
  const allProducts = useSelector(selectAllProducts);
  const allSaleOptions = useSelector(selectSaleOptions);
  const editing = Boolean(product);
  const customMode = mode === 'custom';
  const fileInput = useRef(null);
  const optionRowRef = useRef(null);

  const [form, setForm] = useState(() => initialForm(product));
  const [customOptions, setCustomOptions] = useState(() => initialForm(product).customOptions);
  const [optionDrafts, setOptionDrafts] = useState(() => [optionDraft()]);
  const [optionErrors, setOptionErrors] = useState({});
  const [optionListError, setOptionListError] = useState('');
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [optionEdit, setOptionEdit] = useState({ label: '', price: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [notices, setNotices] = useState([]);
  const [moreOpen, setMoreOpen] = useState(() =>
    Boolean(product && (product.discountName || product.costPrice || product.priceAdvance || product.priceCOD))
  );

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

  const pushNotice = useCallback((message, tone = 'warning') => {
    setNotices((cur) => [...cur, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: message, tone }]);
  }, []);
  const closeNotice = useCallback((id) => setNotices((cur) => cur.filter((n) => n.id !== id)), []);

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
    const onKey = (e) => e.key === 'Escape' && !saving && !pickerOpen && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, saving, pickerOpen, onClose]);

  useEffect(() => () => imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url)), []);

  const set = (key) => (value) => {
    const normalized = key === 'slug'
      ? editingSlug(value)
      : key === 'tags'
        ? value.map(toTitleCase)
        : PRODUCT_TEXT_FIELDS.has(key)
          ? toTitleCase(value)
          : value;
    setForm((f) => {
      const next = { ...f, [key]: normalized };
      if (key === 'name') next.slug = slugify(normalized);
      if (key === 'slug') next.name = nameFromSlug(normalized);
      if (key === 'originalPrice') {
        next.price = String(autoPrice(next));
      }
      if (key === 'discountPercentage') {
        next.saleId = '';
        next.discountName = '';
        next.price = String(autoPrice(next));
      }
      if (key === 'price' && normalized !== '') {
        next.saleId = '';
        next.discountName = '';
        const original = Number(f.originalPrice) || 0;
        const final = Number(normalized) || 0;
        if (original > 0 && final <= original) {
          const percentage = ((original - final) / original) * 100;
          next.discountPercentage = String(Math.round(percentage * 1_000_000) / 1_000_000);
        } else {
          next.originalPrice = String(final);
          next.discountPercentage = '0';
        }
      }
      return next;
    });
    const clearErrors = new Set([key]);
    if (key === 'name') clearErrors.add('slug');
    if (key === 'slug') clearErrors.add('name');
    if (key === 'originalPrice' || key === 'discountPercentage') clearErrors.add('price');
    if (key === 'price') {
      clearErrors.add('originalPrice');
      clearErrors.add('discountPercentage');
    }
    if (Array.from(clearErrors).some((field) => errors[field])) {
      setErrors((current) => {
        const next = { ...current };
        clearErrors.forEach((field) => { next[field] = undefined; });
        return next;
      });
    }
  };
  const onNumber = (key) => (event) => set(key)(normalizeNumberInput(event.target.value));
  const selectSale = (saleId) => {
    const sale = sales.find((item) => item.$id === saleId);
    setErrors((current) => ({ ...current, discountPercentage: undefined, price: undefined }));
    setForm((f) => {
      if (!sale) {
        return {
          ...f,
          saleId: '',
          discountName: '',
          discountPercentage: '',
          price: f.originalPrice === '' ? '' : String(Number(f.originalPrice) || 0),
        };
      }
      const percentage = Number(sale.discountPercentage) || 0;
      return {
        ...f,
        saleId,
        discountName: toTitleCase(sale.name || ''),
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
    ? `Price after sale: ${rs(Math.round((Number(form.originalPrice) || 0) * (1 - (Number(selectedSale.discountPercentage) || 0) / 100)))}`
    : '';
  const total = Number(form.totalAvailable) || 0;
  const sold = Number(form.sold) || 0;
  const remaining = Math.max(0, total - sold);

  /* ----- copy everything from a picked product ----- */

  const applyProduct = (p) => {
    setPickerOpen(false);
    setCopying(true);
    try {
      /* sale: never apply one that has ended or no longer exists */
      let saleId = '';
      let discountName = '';
      let discountPercentage = '';
      let price = '';
      const original = Number(p.originalPrice) || 0;
      if (p.saleId) {
        const sale = sales.find((s) => s.$id === p.saleId);
        if (!sale) {
          pushNotice('The sale on that product no longer exists, so no sale was applied.');
          price = String(original);
        } else if (getSaleStatus(sale) === 'ended') {
          pushNotice(`The sale “${sale.name || 'Sale'}” has ended, so it was not applied.`);
          price = String(original);
        } else {
          const pct = Number(sale.discountPercentage) || 0;
          saleId = sale.$id;
          discountName = sale.name || '';
          discountPercentage = zeroBlank(pct);
          price = String(Math.round(original * (1 - pct / 100)));
        }
      } else {
        discountName = text(p.discountName);
        discountPercentage = zeroBlank(p.discountPercentage);
        price = p.price != null ? String(p.price) : String(autoPrice({ originalPrice: original, discountPercentage: p.discountPercentage }));
      }

      /* slug: unique against the products already in the store (re-checked on save) */
      const base = slugify(p.name) || 'product';
      const taken = new Set(allProducts.map((x) => x.slug).filter(Boolean));
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

      /* images: reuse the SAME bucket file ids (nothing is downloaded or re-uploaded) */
      const ids = (Array.isArray(p.imageIds) ? p.imageIds : []).filter(Boolean);
      const copied = ids.map((id) => ({ key: id, id, url: productService.getImageUrl(id) }));

      let sample = [];
      if (customMode && p.customFileId) {
        sample = [{ key: p.customFileId, kind: 'existing', id: p.customFileId, url: productService.getImageUrl(p.customFileId) }];
      }

      imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url));
      setImages(copied);
      if (customMode) setSampleImages(sample);

      setForm((f) => blankZeros({
        ...f,
        name: toTitleCase(text(p.name)),
        slug,
        description: toTitleCase(text(p.description)),
        category: toTitleCase(text(p.category)),
        group: toTitleCase(text(p.group)),
        tags: Array.isArray(p.tags) ? p.tags.map(toTitleCase) : [],
        featured: Boolean(p.featured),
        order: zeroBlank(p.order),
        saleId,
        discountName: toTitleCase(discountName),
        discountPercentage,
        originalPrice: text(p.originalPrice),
        price,
        costPrice: text(p.costPrice),
        priceAdvance: text(p.priceAdvance),
        priceCOD: text(p.priceCOD),
        deliveryCharges: zeroBlank(p.deliveryCharges),
        deliveryTime: toTitleCase(text(p.deliveryTime)),
        deliveryFrom: toTitleCase(text(p.deliveryFrom)),
        totalAvailable: zeroBlank(p.totalAvailable),
        sold: '', // a new product has sold nothing yet
        customDetails: customMode ? toTitleCase(text(p.customDetails)) : '',
      }));
      if (customMode) {
        let source = [];
        try {
          const raw = typeof p.customOptions === 'string' ? JSON.parse(p.customOptions || '[]') : p.customOptions;
          source = Array.isArray(raw) ? raw : [];
        } catch {
          source = [];
        }
        setCustomOptions(source.map((o) => ({ ...o, label: toTitleCase(o.label), id: optionId() })));
        setOptionDrafts([optionDraft()]);
        setOptionErrors({});
        setEditingOptionId(null);
      }
      setErrors({});
      setSubmitError('');
      setMoreOpen(Boolean(p.discountName || p.costPrice || p.priceAdvance || p.priceCOD));

      pushNotice(`Details copied from “${p.name}”. Check the slug and price, then save.`, 'success');
    } finally {
      setCopying(false);
    }
  };

  /* ----- custom options (unchanged behaviour) ----- */

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
    const normalized = key === 'label'
      ? toTitleCase(value)
      : key === 'price'
        ? normalizeNumberInput(value)
        : value;
    setOptionDrafts((rows) => rows.map((row) => row.id === id ? { ...row, [key]: normalized } : row));
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
      ? { ...item, label: toTitleCase(optionEdit.label).trim(), price: Number(optionEdit.price) }
      : item));
    setEditingOptionId(null);
    setOptionErrors((current) => ({ ...current, [editingOptionId]: undefined }));
  };

  /* ----- images ----- */

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

  /* ----- save ----- */

  const submit = async (e) => {
    e.preventDefault();
    if (copying) return;
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
      const slug = await productService.generateUniqueSlug(slugify(form.slug || form.name), product?.$id);
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
      // images may be shared with products that were copied from this one
      if (removed.length) await productService.deleteImagesIfUnused(removed);
      if (product?.customFileId && product.customFileId !== customFileId) {
        await productService.deleteImagesIfUnused([product.customFileId]);
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
      onChange={onNumber(key)}
      onWheel={blockWheel}
      className={inputCls(errors[key])}
      {...props}
    />
  );

  const noun = customMode ? 'custom product' : 'product';

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
        aria-label={editing ? `Edit ${noun}` : `Add ${noun}`}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading truncate text-text">{editing ? `Edit ${noun}` : `Add ${noun}`}</h2>
            <p className="truncate text-xs text-muted">{editing ? product.name : 'Fill in the details, then save.'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {/* hero: start from an existing product (new products only) */}
          {!editing && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={copying || saving}
              className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-3 text-left transition-colors hover:border-accent hover:bg-accent-soft disabled:cursor-wait disabled:opacity-70 sm:p-4"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-alt text-accent transition-transform duration-200 group-hover:scale-105">
                {copying ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Plus size={22} aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text">{copying ? 'Copying product…' : 'Pick data from a product'}</span>
                <span className="block text-xs text-muted">
                  {copying ? 'Copying details and images, one moment.' : 'Start from an existing product. Its details and images are copied.'}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
            </button>
          )}

          <Section title="Basics" subtitle="What the shopper sees first." delay={0}>
            <Field label="Name" error={errors.name} className="sm:col-span-2">
              <input value={form.name} onChange={on('name')} maxLength={255} placeholder="Rose lawn suit" className={inputCls(errors.name)} />
            </Field>
            <Field as="div" label="Slug" hint="used in the product link" error={errors.slug} className="sm:col-span-2">
              <div className="relative">
                <input
                  aria-label="Slug"
                  value={form.slug}
                  onChange={(e) => set('slug')(editingSlug(e.target.value))}
                  onBlur={() => set('slug')(slugify(form.slug))}
                  placeholder="rose-lawn-suit"
                  className={`${inputCls(errors.slug)} pr-10`}
                />
                {form.slug && (
                  <button
                    type="button"
                    aria-label="Clear slug"
                    title="Clear slug"
                    onClick={() => {
                      setForm((current) => ({ ...current, slug: '' }));
                      setErrors((current) => ({ ...current, slug: undefined }));
                    }}
                    className="absolute inset-y-0 right-1 grid w-9 place-items-center rounded text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </Field>
            <div className="sm:col-span-2">
              <SelectionGrid className="gap-4">
                <Field as="div" label="Category" error={errors.category} className="min-w-0">
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
                <Field as="div" label="Group" optional className="min-w-0">
                  <SearchSelect
                    aria-label="Group"
                    options={groups}
                    value={form.group}
                    onChange={set('group')}
                    placeholder="Select or create a group"
                    searchPlaceholder="Search groups…"
                  />
                </Field>
              </SelectionGrid>
            </div>
            <Field label="Description" optional className="sm:col-span-2">
              <textarea value={form.description} onChange={on('description')} rows={4} className={`${inputCls()} resize-none py-2`} placeholder="Fabric, fit, care…" />
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-text">Tags <span className="font-normal text-muted">(optional)</span></span>
              <TagsField value={form.tags} onChange={set('tags')} />
            </div>
            <Field label="Display order" hint="lower shows first" error={errors.order}>{num('order', { step: 1, placeholder: '0' })}</Field>
            <div className="flex items-end">
              <Switch checked={form.featured} onChange={set('featured')} label="Featured" hint="Show on the home page" />
            </div>
          </Section>

          <Section title="Pricing" subtitle="Original price, discount, and final price stay in sync." delay={60}>
            <div className="min-w-0 sm:col-span-2">
              <AdminSearchSelect
                className="min-w-0"
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
            <Field
              label="Discount %"
              hint={selectedSale ? 'Editing removes the selected sale' : 'Updates the final price'}
              error={errors.discountPercentage}
            >
              {num('discountPercentage', { max: 100, placeholder: '0' })}
            </Field>
            <Field
              label="Final price (Rs)"
              hint={selectedSale ? 'Editing removes the sale and updates discount' : 'Editing this updates the discount'}
              error={errors.price}
              className="sm:col-span-2"
            >
              {num('price', { placeholder: String(computedPrice) })}
            </Field>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className="flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-accent"
              >
                <ChevronDown size={14} className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                {moreOpen ? 'Hide' : 'Show'} more pricing options
              </button>
              {moreOpen && (
                <div className="animate-rise mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Discount name" optional className="sm:col-span-2">
                    <input value={form.discountName} onChange={on('discountName')} maxLength={100} placeholder="Eid sale" disabled={Boolean(form.saleId)} className={inputCls()} />
                  </Field>
                  <Field label="Cost price (Rs)" hint="admin only" optional error={errors.costPrice}>{num('costPrice', { placeholder: '0' })}</Field>
                  <Field label="Advance payment (Rs)" optional error={errors.priceAdvance}>{num('priceAdvance', { placeholder: '0' })}</Field>
                  <Field label="Cash on delivery price (Rs)" optional error={errors.priceCOD} className="sm:col-span-2">{num('priceCOD', { placeholder: '0' })}</Field>
                </div>
              )}
            </div>
          </Section>

          <Section
            title={customMode ? 'Delivery' : 'Stock & delivery'}
            subtitle={customMode ? 'Charges, time and where it ships from.' : 'Remaining and stock status update automatically.'}
            delay={120}
          >
            {!customMode && (
              <>
                <Field label="Total available" error={errors.totalAvailable}>{num('totalAvailable', { step: 1, placeholder: '0' })}</Field>
                <Field label="Sold" error={errors.sold}>{num('sold', { step: 1, placeholder: '0' })}</Field>
                <div className="flex items-center justify-between rounded-md bg-bg px-3 py-2.5 text-sm sm:col-span-2">
                  <span className="text-muted">Remaining</span>
                  <span className="flex items-center gap-2">
                    <b className="tabular-nums text-text">{remaining}</b>
                    <span className={`rounded-full px-2 py-0.5 text-xs transition-colors ${remaining > 0 ? 'bg-success-soft text-success-fg' : 'bg-error-soft text-error-fg'}`}>
                      {remaining > 0 ? 'In stock' : 'Out of stock'}
                    </span>
                  </span>
                </div>
              </>
            )}
            <Field label="Delivery charges (Rs)" error={errors.deliveryCharges}>{num('deliveryCharges', { placeholder: '0' })}</Field>
            <Field label="Delivery time" optional>
              <input value={form.deliveryTime} onChange={on('deliveryTime')} maxLength={100} placeholder="3-5 working days" className={inputCls()} />
            </Field>
            <Field label="Ships from" optional className="sm:col-span-2">
              <input value={form.deliveryFrom} onChange={on('deliveryFrom')} maxLength={150} placeholder="Lahore" className={inputCls()} />
            </Field>
          </Section>

          {customMode && (
            <Section title="Customizations" subtitle="Give customers clear choices and prices for their made-to-order product." delay={150}>
              <Field label="Instructions for the customer" hint={`${form.customDetails.length}/1000`} className="sm:col-span-2">
                <textarea
                  value={form.customDetails}
                  onChange={on('customDetails')}
                  rows={3}
                  maxLength={1000}
                  className={`${inputCls()} resize-none py-2`}
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
                        onChange={(event) => setOptionEdit((current) => ({ ...current, label: toTitleCase(event.target.value) }))}
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
                          onChange={(event) => setOptionEdit((current) => ({
                            ...current,
                            price: normalizeNumberInput(event.target.value),
                          }))}
                          className={inputCls(optionErrors[option.id]?.price)}
                        />
                        {optionErrors[option.id]?.price && <p className="text-xs text-error">{optionErrors[option.id].price}</p>}
                        <ActionButton type="button" onClick={saveOptionEdit}>Save</ActionButton>
                        <ActionButton type="button" variant="secondary" onClick={() => { setEditingOptionId(null); setOptionErrors((current) => ({ ...current, [option.id]: undefined })); }}>Cancel</ActionButton>
                      </div>
                    </div>
                  ) : (
                    <div key={option.id} className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2">
                      <button
                        type="button"
                        onClick={() => { setEditingOptionId(option.id); setOptionEdit({ label: option.label, price: String(option.price) }); }}
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-text hover:text-accent"
                      >
                        {option.label} · + Rs {Number(option.price).toLocaleString('en-PK')}
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

          <section style={{ animationDelay: '180ms' }} className="animate-rise rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-text">Images</h3>
            <p className="mt-0.5 text-xs text-muted">The first image is the main one. Tap the star on an image to make it main.</p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`mt-4 flex w-full items-center justify-center gap-3 rounded-md border border-dashed px-4 py-5 text-sm transition-colors ${
                dragOver ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-bg text-muted hover:border-accent hover:bg-accent-soft hover:text-accent'
              }`}
            >
              <ImagePlus size={22} className="shrink-0" />
              <span className="text-left">
                <span className="block font-medium">Click to upload images</span>
                <span className="block text-xs opacity-80">or drag and drop them here</span>
              </span>
            </button>

            {errors.images && <p className="mt-2 text-xs text-error">{errors.images}</p>}

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <div key={img.key} className="group animate-rise relative aspect-square overflow-hidden rounded-md border border-border bg-bg">
                    <Thumb id={img.id} url={img.url} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-white">Main</span>}
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
              disabled={saving || copying}
              style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))', color: 'var(--on-brown)' }}
              className="btn min-w-32 transition-[filter,transform] hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {saving ? 'Saving…' : copying ? 'Copying…' : editing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </footer>

        {/* floating notices slide in from the right edge, under the header */}
        <div className="pointer-events-none fixed right-0 top-20 z-[80] flex w-full max-w-sm flex-col gap-2 overflow-hidden p-3">
          {notices.map((n) => <Notice key={n.id} notice={n} onClose={closeNotice} />)}
        </div>
      </form>

      <ProductPicker open={pickerOpen} customMode={customMode} onClose={() => setPickerOpen(false)} onPick={applyProduct} />
    </div>
  );
}

export function CustomProductForm(props) {
  return <ProductForm {...props} mode="custom" />;
}