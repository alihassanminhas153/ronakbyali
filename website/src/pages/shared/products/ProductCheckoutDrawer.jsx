// src/pages/shared/products/ProductCheckoutDrawer.jsx
//
// "Buy now" drawer. Slides in from the right for EVERYONE, guest or logged in.
//
// Layout (top to bottom): your details -> product details (image header) -> order button.
//
// Guest      : Google button, or the form. "Order now" creates the account with a generated
//              password (10 chars, see lib/generatePassword.js), places the order, and then shows
//              the password in a dialog the user must acknowledge (save it / change it later).
//              If the email ALREADY has an account the generated password cannot sign in, so the
//              drawer asks for that account's password instead (the "password" step).
// Logged in  : saved customer details are filled in and can be edited.
//
// Designs: when product.hasDesigns is true the drawer asks for the designs first (how many of each) and
// the order uses the total of those. They show as plain text with an Edit button. `designs` (optional)
// pre-fills the choice if the page already asked. Orders are sent with `designs`, one line per design:
// [{ productId, quantity, variant (design name), designImageId }].
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getDeliveryChargesForLines, getProductCheckoutPrice } from "../../../store/slices/cartSlice";
import { selectSalesList } from "../../../store/slices/saleSlice";
import { fetchMyOrders, placeDirectOrder } from "../../../store/slices/ordersSlice";
import { placeGuestOrder } from "../../../store/slices/checkoutThunks";
import { continueWithGoogle } from "../../../store/slices/authSlice";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";
import { fillFromProfile, loadDraft, saveDraft, validateDetails } from "../../../lib/checkoutDraft";
import { generatePassword } from "../../../lib/generatePassword";
import productService from "../../../lib/appwrite/product";
import { GoogleButton, OrDivider, PasswordField } from "../../../ui/custom/checkout/CheckoutParts";
import { ContactTable, EmailRow, SectionCard } from "../../../ui/custom/checkout/CheckoutUI";
import PasswordNotice from "../../../ui/custom/checkout/PasswordNotice";
import Drawer from "../../../ui/custom/modal/Drawer";
import { DesignSummary, useDesignChooser } from "../../../components/shop/DesignChooser";
import { hasDesigns, picksToLines, totalQty } from "../../../lib/designPicks";
import CheckoutField from "../../../ui/custom/checkout/CheckoutField";
import { Home, Mail, MapPin, Phone, StickyNote, User } from "lucide-react";

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

const paymentLabels = { cod: "Cash on delivery", advance: "Advance payment" };

/* Selected / not selected look shared by delivery + payment cards. */
const choiceClass = (selected) =>
  `relative flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition focus-within:outline focus-within:outline-2 focus-within:outline-accent ${
    selected ? "border-accent bg-accent/5 ring-4 ring-accent/10" : "border-border bg-surface-alt/40 hover:border-accent/60"
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

export default function ProductCheckoutDrawer({ mounted, open, onClose, onPlaced, product, quantity: quantityProp, account, designs: designsProp }) {
  const dispatch = useDispatch();
  const sales = useSelector(selectSalesList);
  const isGuest = !account;

  const [form, setForm] = useState(() => initialForm(account, product));
  const [step, setStep] = useState("details"); // "details" | "password" (only when the email already has an account)
  const [password, setPassword] = useState("");
  const [editingContact, setEditingContact] = useState(() => Boolean(account) && !(account.name && account.phone));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [historyError, setHistoryError] = useState(false);
  const [deliveryError, setDeliveryError] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /* set after an account was created with a generated password: { password, email, order } */
  const [created, setCreated] = useState(null);

  /* designs: [{ imageId, name, quantity }] */
  const needsDesign = hasDesigns(product);
  const [picks, setPicks] = useState(() => (needsDesign && Array.isArray(designsProp) ? designsProp : []));
  const chooser = useDesignChooser();
  const { ask } = chooser;
  const quantity = needsDesign ? totalQty(picks) : quantityProp;
  const designLines = needsDesign ? picksToLines(product, picks) : null;

  const editDesigns = () =>
    ask(product, { initialPicks: picks, confirmLabel: "Save designs", onConfirm: setPicks });

  // asked once when the drawer opens; closing the box without a choice closes the drawer too
  useEffect(() => {
    if (!open || !needsDesign || picks.length) return;
    ask(product, { confirmLabel: "Continue", onConfirm: setPicks, onCancel: onClose });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, needsDesign]);

  const checkoutUnitPrice = getProductCheckoutPrice(product, form.paymentType, sales);
  const subtotal = checkoutUnitPrice * quantity;
  const originalSubtotal = Math.max(Number(product.originalPrice) || 0, checkoutUnitPrice) * quantity;
  const discountSavings = Math.max(0, originalSubtotal - subtotal);
  const delivery = deliveryCharge;
  const total = subtotal + delivery;

  /* delivery charge */
  useEffect(() => {
    if (!mounted) return undefined;
    let active = true;
    if (!quantity) {
      setDeliveryLoading(false);
      return undefined;
    }
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

  /* the guest just got logged in (e.g. account created, order failed): switch to the logged-in view */
  useEffect(() => {
    if (!account) return;
    setStep("details");
    setPassword("");
    setForm((current) => fillFromProfile(current, account));
    setEditingContact(!(account.name && account.phone));
  }, [account]);

  if (!mounted) return null;

  const productImage = product.imageIds?.[0] ? productService.getImageUrl(product.imageIds[0]) : "";

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
      designs: picks,
      form,
      returnPath: `${window.location.pathname}${window.location.search}`,
    });
    dispatch(continueWithGoogle());
  };

  /* guest: sign in / create the account, then place the order.
     generated = the password was made by us (new customer), not typed by the user. */
  const runGuestOrder = async (pw, generated) => {
    setSubmitting(true);
    const result = await dispatch(placeGuestOrder({ product, quantity, form, password: pw, designs: designLines }));
    setSubmitting(false);

    const ok = placeGuestOrder.fulfilled.match(result);
    const message = ok ? "" : String(result.payload || result.error?.message || "Could not place your order. Please try again.");

    // The email already has an account, so the generated password cannot sign in: ask for the real one.
    if (generated && !ok && /wrong email or password/i.test(message)) {
      setStep("password");
      setErrors({});
      return;
    }

    // This call created the account: the user must see the password before anything else happens.
    if (generated && result.meta?.accountCreated) {
      if (message) setServerError(message);
      setCreated({ password: pw, email: form.customerEmail.trim().toLowerCase(), order: ok ? result.payload : null });
      return;
    }

    if (ok) onPlaced(result.payload);
    else setServerError(message);
  };

  const closePasswordNotice = () => {
    const order = created?.order;
    setCreated(null);
    if (order) onPlaced(order);
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError("");

    /* guest whose email already has an account: they type its password */
    if (step === "password") {
      if (password.length < 8) {
        setErrors({ password: "Use at least 8 characters." });
        return;
      }
      setErrors({});
      await runGuestOrder(password, false);
      return;
    }

    if (needsDesign && !picks.length) {
      setServerError("Choose a design first.");
      editDesigns();
      return;
    }

    /* client-side checks only, no Appwrite call */
    const found = validateDetails(form, { needEmail: isGuest });
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.customerName || found.customerPhone) setEditingContact(true);
      return;
    }

    /* guest: generated password, no password step */
    if (isGuest) {
      await runGuestOrder(generatePassword(form.customerName), true);
      return;
    }

    /* logged in: place the order */
    setSubmitting(true);
    const result = await dispatch(placeDirectOrder({ product, quantity, form, designs: designLines, toast: true }));
    setSubmitting(false);
    if (placeDirectOrder.fulfilled.match(result)) onPlaced(result.payload);
    else if (result.payload && result.payload !== LOGIN_REQUIRED) setServerError(String(result.payload));
    else if (result.payload !== LOGIN_REQUIRED) setServerError(result.error?.message || "Could not place your order. Please try again.");
  };

  const onPasswordStep = step === "password";
  const buttonLabel = deliveryLoading
    ? "Calculating delivery..."
    : onPasswordStep
      ? `Sign in & confirm order · ${money(total)}`
      : isGuest
        ? `Order now · ${money(total)}`
        : `Place order · ${money(total)}`;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={onPasswordStep ? "Sign in to continue" : "Complete your order"}
        titleClassName={`!font-display !text-2xl !font-bold sm:!text-3xl ${productImage ? "!text-white" : "!text-text"}`}
        subtitle={product.name}
        headerImage={productImage}
        blurFooter
        closeLabel="Close"
        busy={submitting || Boolean(created)}
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
          {onPasswordStep ? (
            /* ---------- guest, email already has an account ---------- */
            <SectionCard id="checkout-password-heading" title="You already have an account">
              <div className="space-y-4">
                <p className="text-sm text-muted">Enter the password of this account to place your order.</p>
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

              {/* ---------- 1. your details ---------- */}
              {isGuest ? (
                <>
                  <div className="space-y-3">
                    <GoogleButton onClick={continueWithGoogleClick} disabled={submitting} />
                    <OrDivider />
                  </div>
                  <SectionCard id="checkout-contact-heading" title="Your details">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CheckoutField icon={User} label="Full name" required value={form.customerName} onChange={setField("customerName")} error={errors.customerName} maxLength={128} autoComplete="name" />
                      <CheckoutField icon={Phone} label="Phone" required type="tel" value={form.customerPhone} onChange={setField("customerPhone")} error={errors.customerPhone} maxLength={20} inputMode="tel" autoComplete="tel" />
                      <CheckoutField icon={Mail} className="sm:col-span-2" label="Email" required type="email" value={form.customerEmail} onChange={setField("customerEmail")} error={errors.customerEmail} maxLength={320} autoComplete="email" />
                      <CheckoutField icon={MapPin} label="City" required value={form.city} onChange={setField("city")} error={errors.city} maxLength={100} autoComplete="address-level2" />
                      <CheckoutField icon={Home} className="sm:col-span-2" inputClassName="resize-none" label="Street address" required as="textarea" rows={2} value={form.address} onChange={setField("address")} error={errors.address} maxLength={500} autoComplete="street-address" />
                    </div>
                    <p className="text-xs text-muted">We will create your account with this email and show you a password to save after you order.</p>
                  </SectionCard>
                </>
              ) : (
                <>
                  <ContactTable form={form} errors={errors} onChange={setField} editing={editingContact} setEditing={setEditingContact} />
                  <SectionCard id="checkout-address-heading" title="Delivery address">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CheckoutField icon={MapPin} label="City" required value={form.city} onChange={setField("city")} error={errors.city} maxLength={100} autoComplete="address-level2" />
                      <CheckoutField icon={Home} className="sm:col-span-2" inputClassName="resize-none" label="Street address" required as="textarea" rows={2} value={form.address} onChange={setField("address")} error={errors.address} maxLength={500} autoComplete="street-address" />
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ---------- 2. product details (image header) ---------- */}
              <section aria-labelledby="checkout-product-heading" className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-alt/50 px-4 py-3">
                  <div className="min-w-0">
                    <h3 id="checkout-product-heading" className="truncate font-semibold text-text">{product.name}</h3>
                    <p className="text-sm text-muted">Quantity: {quantity}</p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold tabular-nums text-text">{money(subtotal)}</p>
                </div>

                <div className="space-y-5 p-4">
                  {needsDesign && (
                    <dl className="divide-y divide-border border-y border-border text-sm">
                      <DesignSummary picks={picks} onEdit={editDesigns} />
                    </dl>
                  )}

                  <SectionCard id="checkout-payment-heading" title="Payment method">
                    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                      {["cod", "advance"].map((method) => {
                        const selected = form.paymentType === method;
                        const methodPrice = getProductCheckoutPrice(product, method, sales);
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

                  <CheckoutField icon={StickyNote} inputClassName="resize-none" label="Order notes (optional)" as="textarea" rows={2} value={form.notes} onChange={setField("notes")} maxLength={1000} />

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
                        <dt className="text-muted">Delivery (home delivery)</dt>
                        <dd className="tabular-nums text-text">{deliveryLoading ? "Calculating..." : delivery === 0 ? "Free" : money(delivery)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 py-2.5 font-semibold text-text">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{money(total)}</dd>
                      </div>
                    </dl>
                    {deliveryError && <p role="alert" className="mt-2 text-sm text-error">Delivery charges could not be loaded. Close checkout and try again.</p>}
                  </section>
                </div>
              </section>
            </>
          )}

          {serverError && (
            <p role="alert" className="border-y border-error py-2.5 text-sm text-error">
              {serverError}
            </p>
          )}
        </div>
        {chooser.element}
      </Drawer>

      <PasswordNotice
        open={Boolean(created)}
        email={created?.email}
        password={created?.password || ""}
        orderPlaced={Boolean(created?.order)}
        onDone={closePasswordNotice}
      />
    </>
  );
}