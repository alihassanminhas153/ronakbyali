// src/pages/shared/products/ProductCheckoutDrawer.jsx
//
// "Buy now" drawer. Slides in from the right for EVERYONE, guest or logged in.
//
// Guest      : Google button, or the form (address, payment, delivery, customer details).
//              "Order now" only validates and moves to the password step.
//              "Confirm order" signs in (existing email) or creates the account
//              (new email) and then places the order.
// Logged in  : saved customer details are filled in and can be edited.
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import { getDeliveryChargesForLines, getProductCheckoutPrice } from "../../../store/slices/cartSlice";
import { fetchMyOrders, placeDirectOrder } from "../../../store/slices/ordersSlice";
import { placeGuestOrder } from "../../../store/slices/checkoutThunks";
import { continueWithGoogle } from "../../../store/slices/authSlice";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";
import { fillFromProfile, loadDraft, saveDraft, validateDetails } from "../../../lib/checkoutDraft";
import { GoogleButton, OrDivider, PasswordField } from "../../../ui/custom/checkout/CheckoutParts";
import { ContactTable, EmailRow, SectionCard, StepDots } from "../../../ui/custom/checkout/CheckoutUI";
import Drawer from "../../../ui/custom/modal/Drawer";
import TextInput from "../../../ui/custom/input/TextInput";

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

const paymentLabels = { cod: "Cash on delivery", advance: "Advance payment" };

/* Selected / not selected look shared by delivery + payment cards. */
const choiceClass = (selected) =>
  `relative flex h-full w-full cursor-pointer gap-3 rounded-md border p-3 text-left transition focus-within:outline focus-within:outline-2 focus-within:outline-accent ${
    selected ? "border-accent bg-surface-alt" : "border-border bg-bg hover:border-accent"
  }`;

const initialForm = (account, product) => {
  const base = fillFromProfile(
    { customerName: "", customerPhone: "", customerEmail: "", city: "", address: "", notes: "", deliveryType: "regular", paymentType: "cod" },
    account || {}
  );
  if (account) return base;
  // Guest coming back (e.g. Google login did not finish): restore what was typed.
  const draft = loadDraft();
  return draft && draft.productId === product?.$id ? { ...base, ...draft.form, deliveryType: "regular" } : base;
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
  const [submitting, setSubmitting] = useState(false);

  const checkoutUnitPrice = getProductCheckoutPrice(product, form.paymentType);
  const subtotal = checkoutUnitPrice * quantity;
  const originalSubtotal = Math.max(Number(product.originalPrice) || 0, checkoutUnitPrice) * quantity;
  const discountSavings = Math.max(0, originalSubtotal - subtotal);
  const delivery = deliveryCharge;
  const total = subtotal + delivery;

  /* delivery charge */
  useEffect(() => {
    if (!mounted) return undefined;
    let active = true;
    getDeliveryChargesForLines([{ product, quantity }], subtotal)
      .then((charge) => {
        if (!active) return;
        if (charge === false || !Number.isFinite(Number(charge))) setDeliveryError(true);
        else setDeliveryCharge(Number(charge) || 0);
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
      titleClassName="!font-display !text-2xl !font-bold !text-text sm:!text-3xl"
      closeLabel="Close"
      busy={submitting}
      onSubmit={submit}
      width="max-w-3xl"
      footer={(
        <button
          type="submit"
          disabled={submitting || deliveryLoading || deliveryError}
          className="h-11 w-full rounded-md bg-accent px-4 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Please wait..." : buttonLabel}
        </button>
      )}
    >
      <div className="space-y-5">
        {isGuest && <StepDots steps={["Your details", "Confirm"]} current={onPasswordStep ? 1 : 0} />}

        {onPasswordStep ? (
          /* ---------- guest, password step ---------- */
          <SectionCard
            id="checkout-password-heading"
            title="Create or access your account"
          >
            <div className="space-y-4">
              <EmailRow email={form.customerEmail} />
              <PasswordField value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({}); }} error={errors.password} autoFocus />
              <button
                type="button"
                onClick={() => { setStep("details"); setErrors({}); setServerError(""); }}
                className="min-h-9 rounded-md text-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Edit details
              </button>
            </div>
          </SectionCard>
        ) : (
          <>
            {historyError && (
              <p role="status" className="text-sm text-muted">Could not load your last order.</p>
            )}

            {isGuest && (
              <div className="space-y-3">
                <GoogleButton onClick={continueWithGoogleClick} disabled={submitting} />
                <OrDivider />
              </div>
            )}

            <SectionCard id="checkout-address-heading" title="Delivery address">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Street address" required as="textarea" rows={2} value={form.address} onChange={setField("address")} error={errors.address} maxLength={500} autoComplete="street-address" />
                <TextInput label="City" required value={form.city} onChange={setField("city")} error={errors.city} maxLength={100} autoComplete="address-level2" />
                <TextInput className="sm:col-span-2" inputClassName="resize-none" label="Order notes (optional)" as="textarea" rows={2} value={form.notes} onChange={setField("notes")} maxLength={1000} />
              </div>
            </SectionCard>

            <SectionCard id="checkout-payment-heading" title="Payment method">
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                {["cod", "advance"].map((method) => {
                  const selected = form.paymentType === method;
                  const methodPrice = getProductCheckoutPrice(product, method);
                  return (
                    <label key={method} className={choiceClass(selected)}>
                      <input
                        type="radio"
                        name="paymentType"
                        value={method}
                        checked={selected}
                        onChange={() => {
                          setForm((current) => ({ ...current, paymentType: method }));
                          setDeliveryLoading(true);
                          setDeliveryError(false);
                        }}
                        className="mt-1 size-4 shrink-0 accent-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-text">{paymentLabels[method]}</span>
                        <span className="block text-sm tabular-nums text-muted">{money(methodPrice * quantity)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard id="checkout-delivery-heading" title="Delivery">
              <dl className="divide-y divide-border border-y border-border text-sm">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">Method</dt>
                  <dd className="font-medium text-text">Home delivery</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">Delivery charge</dt>
                  <dd className="tabular-nums text-text">{deliveryLoading ? "Calculating..." : delivery === 0 ? "Free" : money(delivery)}</dd>
                </div>
              </dl>
              {deliveryError && <p role="alert" className="text-sm text-error">Delivery charges could not be loaded. Close checkout and try again.</p>}
            </SectionCard>

            {isGuest ? (
              <SectionCard id="checkout-contact-heading" title="Your details">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput label="Full name" required value={form.customerName} onChange={setField("customerName")} error={errors.customerName} maxLength={128} autoComplete="name" />
                  <TextInput label="Phone" required type="tel" value={form.customerPhone} onChange={setField("customerPhone")} error={errors.customerPhone} maxLength={20} inputMode="tel" autoComplete="tel" />
                  <TextInput className="sm:col-span-2" label="Email" required type="email" value={form.customerEmail} onChange={setField("customerEmail")} error={errors.customerEmail} maxLength={320} autoComplete="email" />
                </div>
              </SectionCard>
            ) : (
              <ContactTable form={form} errors={errors} onChange={setField} editing={editingContact} setEditing={setEditingContact} />
            )}
          </>
        )}

        {onPasswordStep ? null : (
          <section aria-labelledby="checkout-summary-heading">
            <h3 id="checkout-summary-heading" className="mb-2 font-semibold text-text">Order summary</h3>
            <dl className="divide-y divide-border border-y border-border text-sm">
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">Product</dt>
                <dd className="min-w-0 text-right font-medium text-text">{product.name} × {quantity}</dd>
              </div>
              {discountSavings > 0 && (
                <>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-muted">Original price</dt>
                    <dd className="tabular-nums text-muted line-through">{money(originalSubtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-muted">Discount</dt>
                    <dd className="tabular-nums text-text">−{money(discountSavings)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-4 py-2.5 font-medium">
                <dt className="text-text">Final amount</dt>
                <dd className="tabular-nums text-text">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums text-text">{deliveryLoading ? "Calculating..." : delivery === 0 ? "Free" : money(delivery)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5 font-semibold text-text">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(total)}</dd>
              </div>
            </dl>
          </section>
        )}

        {serverError && (
          <p role="alert" className="border-y border-error py-2.5 text-sm text-error">
            {serverError}
          </p>
        )}
      </div>
    </Drawer>
  );
}