// src/pages/shared/products/ProductCheckoutDrawer.jsx
//
// "Buy now" drawer. Slides in from the right for EVERYONE, guest or logged in.
//
// Guest      : Google button, or the form (name, phone, email, city, address).
//              "Order now" only validates and moves to the password step.
//              "Confirm order" signs in (existing email) or creates the account
//              (new email) and then places the order.
// Logged in  : saved details shown as text (Change to edit), city + address as inputs.
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Banknote,
  ChevronLeft,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

import { getDeliveryChargesForLines, getProductCheckoutPrice } from "../../../store/slices/cartSlice";
import { fetchMyOrders, placeDirectOrder } from "../../../store/slices/ordersSlice";
import { placeGuestOrder } from "../../../store/slices/checkoutThunks";
import { continueWithGoogle } from "../../../store/slices/authSlice";
import { getMainImageUrl } from "../../../store/slices/productsSlice";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";
import { settingsService } from "../../../store/slices/services";
import { fillFromProfile, loadDraft, saveDraft, validateDetails } from "../../../lib/checkoutDraft";
import { ContactSummary, GoogleButton, OrDivider, PasswordField } from "../../../ui/custom/checkout/CheckoutParts";
import Drawer from "../../../ui/custom/modal/Drawer";
import TextInput from "../../../ui/custom/input/TextInput";
import ActionButton from "../../../ui/custom/button/ActionButton";

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

const paymentLabels = { cod: "Cash on delivery", advance: "Advance payment" };
const paymentIcons = { cod: Banknote, advance: Smartphone };

const initialForm = (account, product) => {
  const base = fillFromProfile(
    { customerName: "", customerPhone: "", customerEmail: "", city: "", address: "", notes: "", deliveryType: "regular", paymentType: "cod" },
    account || {}
  );
  if (account) return base;
  // Guest coming back (e.g. Google login did not finish): restore what was typed.
  const draft = loadDraft();
  return draft && draft.productId === product?.$id ? { ...base, ...draft.form } : base;
};

export default function ProductCheckoutDrawer({ mounted, open, onClose, onPlaced, product, quantity, account }) {
  const dispatch = useDispatch();
  const isGuest = !account;

  const [form, setForm] = useState(() => initialForm(account, product));
  const [step, setStep] = useState("details"); // "details" | "password"
  const [password, setPassword] = useState("");
  const [editingContact, setEditingContact] = useState(() => Boolean(account) && !(account.name && account.phone));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [historyError, setHistoryError] = useState(false);
  const [deliveryError, setDeliveryError] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState({ codEnabled: true });
  const [submitting, setSubmitting] = useState(false);

  const checkoutUnitPrice = getProductCheckoutPrice(product, form.paymentType);
  const subtotal = checkoutUnitPrice * quantity;
  const delivery = form.deliveryType === "pickup" ? 0 : deliveryCharge;
  const total = subtotal + delivery;
  const originalUnitPrice = Number(product.originalPrice) || Number(product.price) || 0;
  const hasDiscount = originalUnitPrice > checkoutUnitPrice;
  const discountPercent = hasDiscount ? Math.round((1 - checkoutUnitPrice / originalUnitPrice) * 100) : 0;
  const savings = Math.max(0, originalUnitPrice - checkoutUnitPrice) * quantity;
  const productImage = getMainImageUrl(product);

  /* delivery charge + store settings */
  useEffect(() => {
    if (!mounted) return undefined;
    let active = true;
    Promise.all([
      getDeliveryChargesForLines([{ product, quantity }], subtotal),
      settingsService.getAllSettings(),
    ])
      .then(([charge, settings]) => {
        if (!active) return;
        if (charge === false || !Number.isFinite(Number(charge))) setDeliveryError(true);
        else setDeliveryCharge(Number(charge) || 0);
        setStoreSettings(settings || {});
        setDeliveryLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        setDeliveryError(true);
        setDeliveryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mounted, subtotal, product, quantity]);

  /* logged in: fill from the last order (name, phone, city, address) */
  useEffect(() => {
    if (!mounted || !account) return undefined;
    let active = true;
    dispatch(fetchMyOrders({ limit: 1, offset: 0 })).then((result) => {
      if (!active) return;
      if (fetchMyOrders.fulfilled.match(result)) {
        const latest = result.payload.rows[0];
        if (latest) {
          setForm((current) => ({
            ...current,
            customerName: latest.customerName || current.customerName,
            customerPhone: latest.customerPhone || current.customerPhone,
            customerEmail: latest.customerEmail || current.customerEmail,
            city: latest.city || current.city,
            address: latest.address || current.address,
          }));
        }
      } else if (result.payload !== LOGIN_REQUIRED) {
        setHistoryError(true);
      }
    });
    return () => {
      active = false;
    };
  }, [mounted, dispatch, account]);

  /* the guest just got logged in (e.g. order failed after sign-in): switch to the logged-in view */
  useEffect(() => {
    if (!account) return;
    setStep("details");
    setPassword("");
    setForm((current) => fillFromProfile(current, account));
    setEditingContact(!(account.name && account.phone));
  }, [account]);

  if (!mounted) return null;

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const continueWithGoogleClick = () => {
    // Keep what was typed; the order is created after Google login, not now.
    saveDraft({
      productId: product.$id,
      slug: product.slug,
      quantity,
      form,
      returnPath: `${window.location.pathname}${window.location.search}`,
    });
    dispatch(continueWithGoogle());
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError("");

    /* guest, step 2: password -> sign in / create account -> order */
    if (step === "password") {
      if (password.length < 8) {
        setErrors({ password: "Use at least 8 characters." });
        return;
      }
      setErrors({});
      setSubmitting(true);
      const result = await dispatch(placeGuestOrder({ product, quantity, form, password }));
      setSubmitting(false);
      if (placeGuestOrder.fulfilled.match(result)) onPlaced(result.payload);
      else setServerError(String(result.payload || result.error?.message || "Could not place your order. Please try again."));
      return;
    }

    /* step 1: client-side checks only, no Appwrite call */
    const found = validateDetails(form, { needEmail: isGuest });
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.customerName || found.customerPhone) setEditingContact(true);
      return;
    }
    if (isGuest) {
      setStep("password");
      return;
    }

    /* logged in: place the order */
    setSubmitting(true);
    const result = await dispatch(placeDirectOrder({ product, quantity, form, toast: true }));
    setSubmitting(false);
    if (placeDirectOrder.fulfilled.match(result)) onPlaced(result.payload);
    else if (result.payload && result.payload !== LOGIN_REQUIRED) setServerError(String(result.payload));
    else if (result.payload !== LOGIN_REQUIRED) setServerError(result.error?.message || "Could not place your order. Please try again.");
  };

  const onPasswordStep = step === "password";
  const buttonLabel = deliveryLoading
    ? "Calculating delivery..."
    : onPasswordStep
      ? `Confirm order · ${money(total)}`
      : isGuest
        ? `Order now · ${money(total)}`
        : `Place order · ${money(total)}`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={onPasswordStep ? "Confirm your order" : "Complete your order"}
      titleClassName="!font-display !text-2xl !font-bold !tracking-wide !text-accent sm:!text-3xl"
      subtitle={onPasswordStep ? form.customerEmail : "Delivery and payment"}
      icon={ShoppingBag}
      tone={3}
      busy={submitting}
      onSubmit={submit}
      width="max-w-3xl"
      footer={(
        <ActionButton type="submit" loading={submitting} disabled={deliveryLoading || deliveryError} icon={PackageCheck} className="w-full">
          {buttonLabel}
        </ActionButton>
      )}
    >
      <div className="space-y-5">
        {/* item */}
        <section className="rounded-lg border border-border bg-surface p-3 sm:p-4" aria-label="Order item">
          <div className="flex items-center gap-3">
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-surface-alt sm:h-24 sm:w-20">
              {productImage && <img src={productImage} alt={product.name} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 font-semibold text-text">{product.name}</h3>
              <p className="mt-1 text-sm text-muted">Quantity: {quantity}</p>
            </div>
          </div>
        </section>

        {onPasswordStep ? (
          /* ---------- guest, password step ---------- */
          <section className="space-y-4 rounded-lg border border-border p-3 sm:p-4" aria-label="Password">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Email</p>
              <p className="mt-0.5 break-words font-medium text-text">{form.customerEmail}</p>
            </div>
            <PasswordField value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({}); }} error={errors.password} autoFocus />
            <button
              type="button"
              onClick={() => { setStep("details"); setErrors({}); setServerError(""); }}
              className="inline-flex min-h-9 items-center gap-1 rounded-md text-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ChevronLeft size={16} aria-hidden="true" /> Edit details
            </button>
          </section>
        ) : (
          <>
            {historyError && <p role="status" className="rounded-md bg-warning/10 px-3 py-2 text-sm text-text">Could not load your last order.</p>}

            {isGuest && (
              <div className="space-y-4">
                <GoogleButton onClick={continueWithGoogleClick} disabled={submitting} />
                <OrDivider />
              </div>
            )}

            <section aria-labelledby="checkout-contact-heading" className="rounded-lg border border-border p-3 sm:p-4">
              {isGuest ? (
                <>
                  <h3 id="checkout-contact-heading" className="mb-3 flex items-center gap-2 font-semibold text-text">
                    <MapPin size={17} className="text-accent" aria-hidden="true" /> Delivery details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextInput label="Full name" required value={form.customerName} onChange={setField("customerName")} error={errors.customerName} maxLength={128} autoComplete="name" />
                    <TextInput label="Phone" required type="tel" value={form.customerPhone} onChange={setField("customerPhone")} error={errors.customerPhone} maxLength={20} inputMode="tel" autoComplete="tel" />
                    <TextInput className="sm:col-span-2" label="Email" required type="email" value={form.customerEmail} onChange={setField("customerEmail")} error={errors.customerEmail} maxLength={320} autoComplete="email" />
                    <TextInput label="City" required value={form.city} onChange={setField("city")} error={errors.city} maxLength={100} autoComplete="address-level2" />
                    <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Street address" required as="textarea" rows={2} value={form.address} onChange={setField("address")} error={errors.address} maxLength={500} autoComplete="street-address" />
                    <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Order notes" as="textarea" rows={2} value={form.notes} onChange={setField("notes")} maxLength={1000} />
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <ContactSummary profile={account} form={form} errors={errors} onChange={setField} editing={editingContact} setEditing={setEditingContact} />
                  <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    <TextInput label="City" required value={form.city} onChange={setField("city")} error={errors.city} maxLength={100} autoComplete="address-level2" />
                    <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Street address" required as="textarea" rows={2} value={form.address} onChange={setField("address")} error={errors.address} maxLength={500} autoComplete="street-address" />
                    <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Order notes" as="textarea" rows={2} value={form.notes} onChange={setField("notes")} maxLength={1000} />
                  </div>
                </div>
              )}
            </section>

            <section aria-labelledby="checkout-delivery-heading" className="rounded-lg border border-border p-3 sm:p-4">
              <h3 id="checkout-delivery-heading" className="mb-3 flex items-center gap-2 font-semibold text-text">
                <Truck size={17} className="text-accent" aria-hidden="true" /> Delivery options
              </h3>
              <div className="grid items-stretch gap-2 sm:grid-cols-2">
                <label className={`flex h-full min-h-24 cursor-pointer flex-col justify-between gap-3 rounded-md border p-3 transition ${form.deliveryType === "regular" ? "border-accent bg-accent-soft" : "border-border hover:border-accent/50"}`}>
                  <input type="radio" name="direct-delivery" value="regular" checked={form.deliveryType === "regular"} onChange={setField("deliveryType")} className="sr-only" />
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium"><Truck size={16} aria-hidden="true" /> Home delivery</span>
                    <span className="text-sm font-semibold tabular-nums">{deliveryLoading ? "…" : deliveryCharge ? money(deliveryCharge) : "Free"}</span>
                  </span>
                  {storeSettings.deliveryTimeRegular && (
                    <span className="flex items-start gap-1.5 text-xs text-muted"><Clock3 size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> {storeSettings.deliveryTimeRegular}</span>
                  )}
                </label>
                <label className={`flex h-full min-h-24 cursor-pointer flex-col justify-between gap-3 rounded-md border p-3 transition ${form.deliveryType === "pickup" ? "border-accent bg-accent-soft" : "border-border hover:border-accent/50"}`}>
                  <input type="radio" name="direct-delivery" value="pickup" checked={form.deliveryType === "pickup"} onChange={setField("deliveryType")} className="sr-only" />
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium"><Store size={16} aria-hidden="true" /> Store pickup</span>
                    <span className="text-sm font-semibold">Free</span>
                  </span>
                  {storeSettings.storeAddress && <span className="line-clamp-2 text-xs text-muted">{storeSettings.storeAddress}</span>}
                </label>
              </div>
              {deliveryError && <p role="alert" className="mt-2 text-sm text-error">Delivery charges could not be loaded. Close checkout and try again.</p>}
            </section>

            <section aria-labelledby="checkout-payment-heading">
              <h3 id="checkout-payment-heading" className="mb-1 flex items-center gap-2 font-semibold text-text">
                <CreditCard size={17} className="text-accent" aria-hidden="true" /> Payment method
              </h3>
              <div className="grid grid-cols-1 items-stretch gap-2 min-[420px]:grid-cols-2" role="radiogroup" aria-label="Payment method">
                {["cod", "advance"].map((method) => {
                  const Icon = paymentIcons[method] || Wallet;
                  const selected = form.paymentType === method;
                  const methodPrice = getProductCheckoutPrice(product, method);
                  const discount = Math.max(0, originalUnitPrice - methodPrice);
                  return (
                    <button
                      key={method}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setForm((current) => ({ ...current, paymentType: method }))}
                      className={`flex h-full min-h-20 w-full items-center gap-2 rounded-md border p-2.5 text-left text-sm transition ${selected ? "border-accent bg-accent-soft text-accent" : "border-border text-text hover:border-accent/60"}`}
                    >
                      <Icon size={18} className="shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block font-medium">{paymentLabels[method]}</span>
                        <span className="block text-xs tabular-nums">{money(methodPrice)}{discount > 0 ? ` · save ${money(discount)}` : ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* summary */}
        <section className="rounded-lg border border-border bg-surface p-3 sm:p-4" aria-label="Order total">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-text"><ShoppingBag size={17} className="text-accent" aria-hidden="true" /> Order summary</h3>
          <dl className="space-y-2 text-sm">
            {hasDiscount && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Original price</dt>
                  <dd className="tabular-nums text-muted line-through">{money(originalUnitPrice * quantity)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="min-w-0 text-accent">
                    <span className="block truncate">{product.discountName || "Discount"}{discountPercent > 0 ? ` · ${discountPercent}% off` : ""}</span>
                  </dt>
                  <dd className="shrink-0 font-medium tabular-nums text-accent">−{money(savings)}</dd>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-text">{hasDiscount ? "Discounted price" : `Price × ${quantity}`}</dt>
              <dd className="text-lg font-semibold tabular-nums text-text">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{form.deliveryType === "pickup" || delivery === 0 ? "Free" : deliveryLoading ? "Calculating…" : money(delivery)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="text-xl tabular-nums">{money(total)}</dd></div>
          </dl>
        </section>

        {serverError && <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{serverError}</p>}
      </div>
    </Drawer>
  );
}