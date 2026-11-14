// src/pages/shared/products/ProductCheckoutDrawer.jsx
//
// "Buy now" drawer. Slides in from the right for EVERYONE, guest or logged in.
//
// Guest      : Google button, or the form (name, phone, email, city, address).
//              "Order now" only validates and moves to the password step.
//              "Confirm order" signs in (existing email) or creates the account
//              (new email) and then places the order.
// Logged in  : name, phone and email shown as a read-only table (Edit changes
//              name/phone). City and address are the only inputs.
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { PackageCheck, ShoppingBag } from "lucide-react"; // Drawer / ActionButton props
import {
  CaretLeft,
  CheckCircle,
  Clock,
  CreditCard,
  DeviceMobile,
  Lock,
  MapPinLine,
  Money,
  Receipt,
  ShieldCheck,
  Storefront,
  Truck,
  UserCircle,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";

import { getDeliveryChargesForLines, getProductCheckoutPrice } from "../../../store/slices/cartSlice";
import { fetchMyOrders, placeDirectOrder } from "../../../store/slices/ordersSlice";
import { placeGuestOrder } from "../../../store/slices/checkoutThunks";
import { continueWithGoogle } from "../../../store/slices/authSlice";
import { getMainImageUrl } from "../../../store/slices/productsSlice";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";
import { settingsService } from "../../../store/slices/services";
import { fillFromProfile, loadDraft, saveDraft, validateDetails } from "../../../lib/checkoutDraft";
import { GoogleButton, OrDivider, PasswordField } from "../../../ui/custom/checkout/CheckoutParts";
import { ContactTable, EmailRow, IconChip, SectionCard, StepDots } from "../../../ui/custom/checkout/CheckoutUI";
import Drawer from "../../../ui/custom/modal/Drawer";
import TextInput from "../../../ui/custom/input/TextInput";
import ActionButton from "../../../ui/custom/button/ActionButton";

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

const paymentLabels = { cod: "Cash on delivery", advance: "Advance payment" };
const paymentIcons = { cod: Money, advance: DeviceMobile };
const paymentTones = { cod: "warning", advance: "purple" };

/* Selected / not selected look shared by delivery + payment cards. */
const choiceClass = (selected) =>
  `group/choice relative flex h-full w-full cursor-pointer gap-3 rounded-md border p-3 text-left transition focus-within:outline focus-within:outline-2 focus-within:outline-accent ${
    selected ? "border-accent bg-accent-soft" : "border-border bg-bg hover:border-accent/50"
  }`;

function RadioMark({ selected }) {
  return selected ? (
    <CheckCircle size={20} weight="fill" className="shrink-0 text-accent" aria-hidden="true" />
  ) : (
    <span className="size-5 shrink-0 rounded-full border border-border" aria-hidden="true" />
  );
}

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
      <div className="space-y-4">
        {isGuest && <StepDots steps={["Your details", "Confirm"]} current={onPasswordStep ? 1 : 0} />}

        {/* item */}
        <section className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 sm:p-4" aria-label="Order item">
          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-surface-alt sm:h-24 sm:w-20">
            {productImage && <img src={productImage} alt={product.name} className="h-full w-full object-cover" />}
            <span className="absolute bottom-1 right-1 rounded-full bg-text px-1.5 py-0.5 text-[11px] font-semibold leading-none text-bg">×{quantity}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-semibold text-text">{product.name}</h3>
            <p className="mt-1 text-sm tabular-nums text-muted">{money(checkoutUnitPrice)} each</p>
            {hasDiscount && discountPercent > 0 && <span className="badge badge-success mt-1.5">{discountPercent}% off</span>}
          </div>
          <p className="shrink-0 text-lg font-semibold tabular-nums text-text">{money(subtotal)}</p>
        </section>

        {onPasswordStep ? (
          /* ---------- guest, password step ---------- */
          <SectionCard
            id="checkout-password-heading"
            icon={Lock}
            tone="purple"
            hover="group-hover/head:-rotate-12"
            title="Secure your order"
            hint="New here? We create your account. Already registered? You are signed in."
            className="animate-rise"
          >
            <div className="space-y-4">
              <EmailRow email={form.customerEmail} />
              <PasswordField value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({}); }} error={errors.password} autoFocus />
              <button
                type="button"
                onClick={() => { setStep("details"); setErrors({}); setServerError(""); }}
                className="group/back inline-flex min-h-9 items-center gap-1 rounded-md text-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <CaretLeft size={16} weight="bold" aria-hidden="true" className="transition-transform group-hover/back:-translate-x-0.5" /> Edit details
              </button>
            </div>
          </SectionCard>
        ) : (
          <>
            {historyError && (
              <p role="status" className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-fg">
                <WarningCircle size={18} weight="duotone" aria-hidden="true" /> Could not load your last order.
              </p>
            )}

            {isGuest && (
              <div className="space-y-4">
                <GoogleButton onClick={continueWithGoogleClick} disabled={submitting} />
                <OrDivider />
              </div>
            )}

            {/* who is ordering */}
            {isGuest ? (
              <SectionCard id="checkout-contact-heading" icon={UserCircle} tone="info" hover="group-hover/head:scale-110" title="Your details" hint="We use these to reach you about the order">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput label="Full name" required value={form.customerName} onChange={setField("customerName")} error={errors.customerName} maxLength={128} autoComplete="name" />
                  <TextInput label="Phone" required type="tel" value={form.customerPhone} onChange={setField("customerPhone")} error={errors.customerPhone} maxLength={20} inputMode="tel" autoComplete="tel" />
                  <TextInput className="sm:col-span-2" label="Email" required type="email" value={form.customerEmail} onChange={setField("customerEmail")} error={errors.customerEmail} maxLength={320} autoComplete="email" />
                </div>
              </SectionCard>
            ) : (
              <ContactTable form={form} errors={errors} onChange={setField} editing={editingContact} setEditing={setEditingContact} />
            )}

            {/* where to deliver: always inputs */}
            <SectionCard id="checkout-address-heading" icon={MapPinLine} tone="rose" hover="group-hover/head:-translate-y-0.5" title="Delivery address" hint="Check this is where you want the parcel">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput className="sm:col-span-2" label="City" required value={form.city} onChange={setField("city")} error={errors.city} maxLength={100} autoComplete="address-level2" />
                <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Street address" required as="textarea" rows={2} value={form.address} onChange={setField("address")} error={errors.address} maxLength={500} autoComplete="street-address" />
                <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Order notes (optional)" as="textarea" rows={2} value={form.notes} onChange={setField("notes")} maxLength={1000} />
              </div>
            </SectionCard>

            {/* delivery options */}
            <SectionCard id="checkout-delivery-heading" icon={Truck} tone="info" hover="group-hover/head:animate-nudge" title="Delivery options">
              <div className="grid items-stretch gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery options">
                <label className={choiceClass(form.deliveryType === "regular")}>
                  <input type="radio" name="direct-delivery" value="regular" checked={form.deliveryType === "regular"} onChange={setField("deliveryType")} className="sr-only" />
                  <IconChip icon={Truck} tone="info" hover="group-hover/choice:animate-nudge" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-text">Home delivery</span>
                    <span className="block text-sm font-semibold tabular-nums text-text">{deliveryLoading ? "…" : deliveryCharge ? money(deliveryCharge) : "Free"}</span>
                    {storeSettings.deliveryTimeRegular && (
                      <span className="mt-1 flex items-start gap-1.5 text-xs text-muted"><Clock size={14} weight="duotone" className="mt-0.5 shrink-0" aria-hidden="true" /> {storeSettings.deliveryTimeRegular}</span>
                    )}
                  </span>
                  <RadioMark selected={form.deliveryType === "regular"} />
                </label>
                <label className={choiceClass(form.deliveryType === "pickup")}>
                  <input type="radio" name="direct-delivery" value="pickup" checked={form.deliveryType === "pickup"} onChange={setField("deliveryType")} className="sr-only" />
                  <IconChip icon={Storefront} tone="success" hover="group-hover/choice:scale-110" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-text">Store pickup</span>
                    <span className="block text-sm font-semibold text-text">Free</span>
                    {storeSettings.storeAddress && <span className="mt-1 line-clamp-2 block text-xs text-muted">{storeSettings.storeAddress}</span>}
                  </span>
                  <RadioMark selected={form.deliveryType === "pickup"} />
                </label>
              </div>
              {deliveryError && (
                <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-error-fg">
                  <WarningCircle size={18} weight="duotone" aria-hidden="true" /> Delivery charges could not be loaded. Close checkout and try again.
                </p>
              )}
            </SectionCard>

            {/* payment */}
            <SectionCard id="checkout-payment-heading" icon={CreditCard} tone="purple" hover="group-hover/head:-rotate-6" title="Payment method">
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
                      className={choiceClass(selected)}
                    >
                      <IconChip icon={Icon} tone={paymentTones[method] || "accent"} hover="group-hover/choice:-rotate-12" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-text">{paymentLabels[method]}</span>
                        <span className="block text-sm tabular-nums text-muted">{money(methodPrice)}</span>
                        {discount > 0 && <span className="badge badge-success mt-1">Save {money(discount)}</span>}
                      </span>
                      <RadioMark selected={selected} />
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </>
        )}

        {/* summary */}
        <section className="rounded-lg border border-border bg-surface p-4 sm:p-5" aria-labelledby="checkout-summary-heading">
          <header className="group/head mb-4 flex items-center gap-3">
            <IconChip icon={Receipt} tone="success" hover="group-hover/head:-rotate-6" />
            <h3 id="checkout-summary-heading" className="heading-sm text-text">Order summary</h3>
          </header>
          <dl className="space-y-2 text-sm">
            {hasDiscount && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Original price</dt>
                  <dd className="tabular-nums text-muted line-through">{money(originalUnitPrice * quantity)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="min-w-0 text-success-fg">
                    <span className="block truncate">{product.discountName || "Discount"}{discountPercent > 0 ? ` · ${discountPercent}% off` : ""}</span>
                  </dt>
                  <dd className="shrink-0 font-medium tabular-nums text-success-fg">−{money(savings)}</dd>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-text">{hasDiscount ? "Discounted price" : `Price × ${quantity}`}</dt>
              <dd className="font-semibold tabular-nums text-text">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{form.deliveryType === "pickup" || delivery === 0 ? "Free" : deliveryLoading ? "Calculating…" : money(delivery)}</dd></div>
            <div className="!mt-3 flex items-center justify-between gap-4 rounded-md bg-accent-soft px-3 py-2.5 font-semibold text-text">
              <dt>Total</dt><dd className="text-xl tabular-nums text-accent">{money(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck size={15} weight="duotone" className="shrink-0 text-success-fg" aria-hidden="true" /> Your details are only used to deliver this order.
          </p>
        </section>

        {serverError && (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-error/30 bg-error-soft px-3 py-2 text-sm text-error-fg">
            <WarningCircle size={18} weight="duotone" className="mt-0.5 shrink-0" aria-hidden="true" /> {serverError}
          </p>
        )}
      </div>
    </Drawer>
  );
}