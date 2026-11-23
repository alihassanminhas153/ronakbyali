import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';

import { clearProductDetail, fetchProductBySlug, selectProductDetail, selectProductDetailStatus } from '../../../store/slices/productsSlice';
import { clearLastPlacedOrder, placeCustomOrder, selectLastPlacedOrder, selectPlaceOrderError, selectPlaceOrderStatus } from '../../../store/slices/ordersSlice';
import { continueWithGoogle } from '../../../store/slices/authSlice';
import { selectSalesList } from '../../../store/slices/saleSlice';
import { getDeliveryChargesForLines } from '../../../store/slices/cartSlice';
import { placeGuestCustomOrder } from '../../../store/slices/checkoutThunks';
import { PATHS } from '../../../router/path';
import { clearDraft, fillFromProfile, loadDraft, saveDraft, validateDetails } from '../../../lib/checkoutDraft';
import customOrderService from '../../../lib/appwrite/customOrder';
import productService from '../../../lib/appwrite/product';
import { getEffectivePricing } from '../../../lib/saleMath';
import { GoogleButton, OrDivider, PasswordField } from '../../../ui/custom/checkout/CheckoutParts';
import PageHeader from '../../../ui/custom/PageHeader';
import TextInput from '../../../ui/custom/input/TextInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import { OrderFormArt, OrderSuccessArt } from '../../../ui/art';
import NotFound from '../structure/NotFound';

const DELIVERY_OPTIONS = [
  { value: 'regular', label: 'Regular delivery' },
  { value: 'fast', label: 'Fast delivery' },
  { value: 'pickup', label: 'Pickup' },
];
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-PK')}`;
const baseForm = { customerName: '', customerPhone: '', customerEmail: '', city: '', address: '', notes: '', deliveryType: 'regular' };

function initialDraft(slug, profile) {
  const saved = loadDraft();
  const draft = saved?.isCustom && saved.slug === slug ? saved : null;
  return {
    draft,
    form: fillFromProfile({ ...baseForm, ...(draft?.form || {}) }, profile || {}),
  };
}

function useReferenceFiles() {
  const [files, setFiles] = useState([]);
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  const add = (input) => {
    const next = Array.from(input || []);
    const invalidType = next.some((file) => !IMAGE_TYPES.has(file.type));
    const tooLarge = next.some((file) => file.size > MAX_FILE_SIZE);
    if (invalidType) return { error: 'Reference images must be JPG, PNG, or WebP files.' };
    if (tooLarge) return { error: 'Each reference image must be 5 MB or smaller.' };
    if (files.length + next.length > 5) return { error: 'Choose no more than 5 reference images.' };
    setFiles((current) => [...current, ...next.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    return { error: '' };
  };
  const remove = (item) => {
    URL.revokeObjectURL(item.url);
    setFiles((current) => current.filter((entry) => entry !== item));
  };
  const clear = () => {
    filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    setFiles([]);
  };
  return { files, add, remove, clear };
}

export default function CustomizeCheckout() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const location = useLocation();
  const profile = useSelector((state) => state.auth.profile);
  const product = useSelector(selectProductDetail);
  const productStatus = useSelector(selectProductDetailStatus);
  const sales = useSelector(selectSalesList);
  const placeStatus = useSelector(selectPlaceOrderStatus);
  const placeError = useSelector(selectPlaceOrderError);
  const order = useSelector(selectLastPlacedOrder);
  const saved = useMemo(() => initialDraft(slug, profile), [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState(saved.form);
  const [selectedIds, setSelectedIds] = useState(saved.draft?.selectedIds || []);
  const [quantity, setQuantity] = useState(saved.draft?.quantity || 1);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('details');
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryError, setDeliveryError] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [needsFiles, setNeedsFiles] = useState(Boolean(saved.draft?.needsReferenceFiles || location.state?.needsReferenceFiles));
  const fileInput = useRef(null);
  const formRef = useRef(null);
  const referenceFiles = useReferenceFiles();

  useEffect(() => {
    dispatch(fetchProductBySlug(slug));
    return () => dispatch(clearProductDetail());
  }, [dispatch, slug]);

  useEffect(() => () => dispatch(clearLastPlacedOrder()), [dispatch]);

  useEffect(() => {
    if (profile) setForm((current) => fillFromProfile(current, profile));
  }, [profile]);

  const options = useMemo(() => customOrderService.parseOptions(product), [product]);
  const pricing = useMemo(
    () => product ? customOrderService.priceSelection(product, selectedIds, quantity, sales) : false,
    [product, selectedIds, quantity, sales],
  );
  const basePrice = product ? getEffectivePricing(product, sales).price : 0;
  const subtotal = pricing && pricing.subtotal;
  const total = (Number(subtotal) || 0) + deliveryCharge;
  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));

  useEffect(() => {
    if (!product || !pricing || form.deliveryType === 'pickup') {
      setDeliveryCharge(0);
      setDeliveryError('');
      setDeliveryLoading(false);
      return undefined;
    }
    let active = true;
    setDeliveryLoading(true);
    setDeliveryError('');
    getDeliveryChargesForLines([{ product, quantity: Number(quantity) }], subtotal)
      .then((charge) => {
        if (!active) return;
        if (charge === false || !Number.isFinite(Number(charge))) {
          setDeliveryError('Could not calculate delivery charges. Please try again.');
          return;
        }
        setDeliveryCharge(Number(charge) || 0);
      })
      .catch(() => {
        if (active) setDeliveryError('Could not calculate delivery charges. Please try again.');
      })
      .finally(() => {
        if (active) setDeliveryLoading(false);
      });
    return () => { active = false; };
  }, [product, quantity, subtotal, form.deliveryType, pricing]);

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const toggleOption = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setErrors((current) => ({ ...current, selectedIds: undefined }));
  };

  const saveGuestDraft = () => saveDraft({
    isCustom: true,
    productId: product.$id,
    slug: product.slug,
    selectedIds,
    quantity: Number(quantity),
    form,
    hasReferenceFiles: referenceFiles.files.length > 0,
    returnPath: location.pathname,
  });

  const continueGoogle = () => {
    if (!saveGuestDraft()) {
      setSubmitError('Could not save your customization details. Please continue with email and password instead.');
      return;
    }
    dispatch(continueWithGoogle());
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateDetails(form, { needEmail: !profile });
    if (options.length && !selectedIds.length) nextErrors.selectedIds = 'Choose at least one customization.';
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > 50) nextErrors.quantity = 'Choose a quantity between 1 and 50.';
    setErrors(nextErrors);
    setFileError('');
    setSubmitError('');
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      formRef.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    if (!pricing) {
      setErrors({ selectedIds: customOrderService.lastError || 'Choose at least one customization.' });
      return;
    }
    if (deliveryError || deliveryLoading) return;

    if (!profile && step === 'details') {
      setStep('password');
      return;
    }

    const payload = {
      product,
      quantity: count,
      selectedIds,
      form: { ...form, deliveryCharges: deliveryCharge },
      files: referenceFiles.files.map((item) => item.file),
    };
    const result = profile
      ? await dispatch(placeCustomOrder({ ...payload, toast: true }))
      : await dispatch(placeGuestCustomOrder({ ...payload, password }));
    if (placeCustomOrder.fulfilled.match(result) || placeGuestCustomOrder.fulfilled.match(result)) {
      clearDraft();
      referenceFiles.clear();
      setNeedsFiles(false);
      setForm({ ...baseForm, deliveryType: 'regular' });
      setSelectedIds([]);
      setQuantity(1);
      setPassword('');
    } else if (result.payload && typeof result.payload === 'string') {
      setSubmitError(result.payload);
    }
  };

  if (productStatus === 'failed') return <NotFound message="This product is not available for customization." />;
  if (productStatus === 'succeeded' && product && (product.slug !== slug || product.isCustom !== true)) {
    return <NotFound message="This product is not available for customization." />;
  }
  if (placeStatus === 'succeeded' && order?.isCustom) {
    return (
      <div className="space-y-5">
        <PageHeader art={<OrderSuccessArt decorative />} title="Request sent" subtitle={`Order ${order.orderNumber}`} />
        <section className="rounded-2xl border border-border bg-surface p-6 text-center sm:p-10">
          <OrderSuccessArt className="mx-auto w-full max-w-xs" decorative />
          <h2 className="mt-4 font-display text-2xl font-bold text-text">We will contact you soon to confirm</h2>
          <p className="mt-2 text-sm text-muted">Your customization request has been received.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {profile?.username && <Link className="btn btn-primary" to={PATHS.user.orders(profile.username)}>View my orders</Link>}
            <Link className="btn btn-ghost" to={PATHS.products}>Continue shopping</Link>
          </div>
        </section>
      </div>
    );
  }
  if (!product || product.slug !== slug) return <p className="py-12 text-center text-sm text-muted" role="status">Loading product…</p>;

  const productImage = product.imageIds?.[0] ? productService.getImageUrl(product.imageIds[0]) : '';
  const sampleImage = product.customFileId ? productService.getImageUrl(product.customFileId) : '';
  const busy = placeStatus === 'loading';

  return (
    <div className="space-y-5">
      <PageHeader art={<OrderFormArt decorative />} title="Customize your order" subtitle="Choose your options and tell us how you would like it made." />
      {needsFiles && (
        <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text">
          Please select your reference images again. Images cannot be kept while you sign in.
        </p>
      )}
      {!profile && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Sign in or create an account to send your customization request.</p>
          <GoogleButton onClick={continueGoogle} disabled={busy} />
          <OrDivider />
          <p className="text-xs text-muted">You can also continue with your email and password after filling the form.</p>
        </div>
      )}
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="custom-product-summary">
          <h2 id="custom-product-summary" className="text-lg font-semibold text-text">Product summary</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            {productImage && <img src={productImage} alt={product.name} loading="lazy" className="h-36 w-full rounded-lg bg-surface-alt object-contain sm:w-36" />}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-text">{product.name}</h3>
              <p className="mt-1 text-sm text-muted">Starting price: {money(basePrice)} each</p>
              {product.customDetails && <p className="mt-3 whitespace-pre-line text-sm text-muted">{product.customDetails}</p>}
              {sampleImage && <a className="mt-3 inline-block" href={sampleImage} target="_blank" rel="noreferrer"><img src={sampleImage} alt={`${product.name} sample`} className="size-20 rounded-md border border-border object-cover" /></a>}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="custom-options-heading">
          <h2 id="custom-options-heading" className="text-lg font-semibold text-text">Choose customizations</h2>
          <fieldset className="space-y-2">
            <legend className="sr-only">Available customizations</legend>
            {options.map((option) => (
              <label key={option.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2 hover:border-accent">
                <input type="checkbox" checked={selectedIds.includes(option.id)} onChange={() => toggleOption(option.id)} className="size-4 accent-accent" />
                <span className="flex-1 text-sm font-medium text-text">{option.label}</span>
                <span className="text-sm tabular-nums text-muted">+ {money(option.price)}</span>
              </label>
            ))}
          </fieldset>
          {errors.selectedIds && <p role="alert" className="text-sm text-error">{errors.selectedIds}</p>}
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="custom-details-heading">
          <h2 id="custom-details-heading" className="text-lg font-semibold text-text">Your request</h2>
          <TextInput name="quantity" label="Quantity" type="number" min="1" max="50" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} error={errors.quantity} />
          <div>
            <span className="mb-2 block text-sm font-medium text-text">Reference images (optional)</span>
            <label
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.current?.click(); } }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const result = referenceFiles.add(event.dataTransfer.files);
                setFileError(result.error);
              }}
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-bg p-4 text-center text-sm text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span>Choose or drop up to 5 JPG, PNG, or WebP images · 5 MB each</span>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => {
                const result = referenceFiles.add(event.target.files);
                setFileError(result.error);
                event.target.value = '';
              }} />
            </label>
            {referenceFiles.files.length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {referenceFiles.files.map((item) => (
                  <li key={item.url} className="relative">
                    <img src={item.url} alt={item.file.name} className="aspect-square w-full rounded-md border border-border object-cover" />
                    <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => referenceFiles.remove(item)} className="absolute right-1 top-1 rounded bg-bg/90 px-2 py-1 text-xs text-text">Remove</button>
                  </li>
                ))}
              </ul>
            )}
            {fileError && <p role="alert" className="mt-2 text-sm text-error">{fileError}</p>}
          </div>
          <TextInput name="notes" label="Describe what you want" as="textarea" rows={4} maxLength={1000} showCount value={form.notes} onChange={setField('notes')} hint="Tell us about colors, sizes, placement, or other details." />
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="custom-customer-heading">
          <h2 id="custom-customer-heading" className="text-lg font-semibold text-text">Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput name="customerName" label="Name" required autoComplete="name" value={form.customerName} onChange={setField('customerName')} error={errors.customerName} maxLength={128} />
            <TextInput name="customerPhone" label="Phone" required type="tel" autoComplete="tel" value={form.customerPhone} onChange={setField('customerPhone')} error={errors.customerPhone} maxLength={20} />
            <TextInput name="customerEmail" label="Email" required={!profile} type="email" autoComplete="email" value={form.customerEmail} onChange={setField('customerEmail')} error={errors.customerEmail} maxLength={320} />
            <TextInput name="city" label="City" required autoComplete="address-level2" value={form.city} onChange={setField('city')} error={errors.city} maxLength={100} />
            <TextInput name="address" className="sm:col-span-2" label="Address" required as="textarea" rows={2} inputClassName="resize-none" autoComplete="street-address" value={form.address} onChange={setField('address')} error={errors.address} maxLength={500} />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="custom-delivery-heading">
          <h2 id="custom-delivery-heading" className="text-lg font-semibold text-text">Delivery</h2>
          <SelectInput className="min-w-0" label="Delivery type" value={form.deliveryType} onChange={(deliveryType) => setForm((current) => ({ ...current, deliveryType }))} options={DELIVERY_OPTIONS} size="md" />
        </section>

        <p className="rounded-lg border border-border bg-surface-alt p-4 text-sm text-muted">
          Customized orders are paid in advance. After you place this request our team will contact you (for example on WhatsApp) to confirm the details and agree how to pay online.
        </p>

        <section className="space-y-2 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="custom-price-heading">
          <h2 id="custom-price-heading" className="text-lg font-semibold text-text">Price summary</h2>
          <div className="flex justify-between gap-3 text-sm text-muted"><span>Starting price × {quantity}</span><span>{money(basePrice * (Number(quantity) || 0))}</span></div>
          {selectedOptions.map((option) => <div key={option.id} className="flex justify-between gap-3 text-sm text-muted"><span>{option.label} × {quantity}</span><span>{money(option.price * (Number(quantity) || 0))}</span></div>)}
          <div className="flex justify-between gap-3 text-sm text-muted"><span>Delivery</span><span>{deliveryLoading ? 'Calculating…' : money(deliveryCharge)}</span></div>
          <div className="flex justify-between gap-3 border-t border-border pt-3 font-semibold text-text"><span>Total</span><span>{money(total)}</span></div>
          <p className="text-xs text-muted">Final price confirmed by our team</p>
          {deliveryError && <p role="alert" className="text-sm text-error">{deliveryError}</p>}
        </section>

        {!profile && step === 'password' && (
          <section className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-text">Create or access your account</h2>
            <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} error={errors.password} autoComplete="new-password" />
            <button type="button" onClick={() => { setStep('details'); setErrors({}); }} className="text-sm font-medium text-accent hover:underline">Edit details</button>
          </section>
        )}

        {(placeError || submitError) && <p role="alert" className="text-sm text-error">{placeError || submitError}</p>}
        <button type="submit" disabled={busy || deliveryLoading || Boolean(deliveryError)} className="h-12 w-full rounded-md bg-accent px-5 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? 'Sending request…' : 'Send customization request'}
        </button>
      </form>
    </div>
  );
}
