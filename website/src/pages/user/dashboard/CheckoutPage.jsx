// src/pages/user/dashboard/Checkout.jsx   (route: /:username/checkout)
import PageHeader from "../../../ui/custom/PageHeader";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchCart,
  selectCartLines,
  selectCartCount,
  selectCartStatus,
  getDeliveryChargesForLines,
  getProductCheckoutPrice,
} from "../../../store/slices/cartSlice";
import {
  placeOrder,
  addCartToOrder,
  fetchOpenOrders,
  selectOpenOrders,
  selectOpenOrdersStatus,
  parseOrderItems,
  clearLastPlacedOrder,
} from "../../../store/slices/ordersSlice";
import { PATHS } from "../../../router/path";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";
import { validateDetails } from "../../../lib/checkoutDraft";
import TextInput from "../../../ui/custom/input/TextInput";
import { selectSalesList } from "../../../store/slices/saleSlice";

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;
const PAYMENT_OPTIONS = [
  { value: "cod", label: "Cash on delivery" },
  { value: "advance", label: "Advance payment" },
];

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { username } = useParams();

  const profile = useSelector((s) => s.auth.profile);
  const lines = useSelector(selectCartLines);
  const sales = useSelector(selectSalesList);
  const count = useSelector(selectCartCount);
  const cartStatus = useSelector(selectCartStatus);
  const openOrders = useSelector(selectOpenOrders);
  const openStatus = useSelector(selectOpenOrdersStatus);

  // null = not chosen yet, "new" = new order, otherwise the id of the earlier order
  const [choice, setChoice] = useState(null);
  const [paymentType, setPaymentType] = useState("cod");
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliveryError, setDeliveryError] = useState(false);
  const [form, setForm] = useState({
    customerName: profile?.name || "",
    customerPhone: profile?.phone || "",
    customerEmail: profile?.email || "",
    city: profile?.lastCity || "",
    address: profile?.lastAddress || "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    dispatch(fetchCart());
    dispatch(fetchOpenOrders());
    dispatch(clearLastPlacedOrder());
  }, [dispatch]);

  // Fill the form once the profile arrives, without overwriting what was typed.
  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      customerName: f.customerName || profile.name || "",
      customerPhone: f.customerPhone || profile.phone || "",
      customerEmail: f.customerEmail || profile.email || "",
      city: f.city || profile.lastCity || "",
      address: f.address || profile.lastAddress || "",
      notes: f.notes,
    }));
  }, [profile]);

  // Nothing is asked until we know whether an earlier order is still open.
  const checkingOpen = openStatus === "idle" || openStatus === "loading";
  const hasOpen = openOrders.length > 0;
  const mustChoose = hasOpen && choice === null;
  const merging = choice && choice !== "new";
  const target = merging ? openOrders.find((o) => o.$id === choice) : null;

  // If the earlier order ships while this page is open, fall back to a new order.
  useEffect(() => {
    if (merging && !target) setChoice("new");
  }, [merging, target]);

  const subtotal = lines.reduce(
    (sum, line) => sum + getProductCheckoutPrice(line.product, paymentType, sales) * (Number(line.quantity) || 0),
    0,
  );
  const originalSubtotal = lines.reduce((sum, line) => {
    const price = getProductCheckoutPrice(line.product, paymentType, sales);
    const originalPrice = Number(line.product.originalPrice) || 0;
    return sum + Math.max(price, originalPrice) * (Number(line.quantity) || 0);
  }, 0);
  const discountSavings = Math.max(0, originalSubtotal - subtotal);
  const delivery = deliveryCharge;
  const total = subtotal + delivery;

  useEffect(() => {
    if (!lines.length) {
      setDeliveryCharge(0);
      setDeliveryError(false);
      setDeliveryLoading(false);
      return undefined;
    }

    let active = true;
    setDeliveryLoading(true);
    setDeliveryError(false);
    getDeliveryChargesForLines(lines, subtotal)
      .then((charge) => {
        if (!active) return;
        if (charge === false || !Number.isFinite(Number(charge))) {
          setDeliveryError(true);
          return;
        }
        setDeliveryCharge(Number(charge) || 0);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        setDeliveryError(true);
      })
      .finally(() => {
        if (active) setDeliveryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lines, subtotal]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = validateDetails(form); // client-side only, nothing is sent until it passes
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError(null);
    if (mustChoose || checkingOpen) return;
    if (!merging && !validate()) return;

    setSubmitting(true);
    const result = merging
      ? await dispatch(addCartToOrder({ orderId: choice, toast: true }))
      : await dispatch(placeOrder({ form: { ...form, paymentType, deliveryType: "regular" }, toast: true }));
    setSubmitting(false);

    const ok = merging ? addCartToOrder.fulfilled.match(result) : placeOrder.fulfilled.match(result);
    if (ok) navigate(PATHS.user.orders(username), { replace: true });
    else if (result.payload && result.payload !== LOGIN_REQUIRED) setServerError(String(result.payload));
  };

  const loadingCart = cartStatus === "idle" || (cartStatus === "loading" && lines.length === 0);
  if (loadingCart) return <p className="text-neutral-600 dark:text-neutral-300" aria-busy="true">Loading your cart...</p>;

  if (lines.length === 0) {
    return (
      <Shell>
        <div className="border-y border-border px-6 py-14 text-center">
          <p className="text-lg font-medium text-text">Your cart is empty</p>
          <p className="mt-1 text-muted">Add products first, then come back to check out.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to={PATHS.products} className="rounded-md bg-accent px-5 py-2.5 font-semibold text-on-accent">
              Browse products
            </Link>
            <Link to={PATHS.user.orders(username)} className="rounded-md border border-border px-5 py-2.5 font-medium text-text">
              My orders
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} noValidate className="space-y-6">
        {hasOpen && (
          <fieldset className="space-y-3 border-y border-border py-3">
            <legend className="px-1 font-semibold text-text">Add to an existing order?</legend>
            <div className="space-y-2">
              {openOrders.map((o) => {
                const items = parseOrderItems(o);
                const units = items.reduce((n, i) => n + (Number(i.quantity) || 0), 0);
                return (
                  <Choice
                    key={o.$id}
                    name="target"
                    checked={choice === o.$id}
                    onChange={() => setChoice(o.$id)}
                    title={`Add to order ${o.orderNumber}`}
                    detail={`${units} ${units === 1 ? "item" : "items"} · ${money(o.total)} · ${o.status}`}
                  />
                );
              })}
              <Choice
                name="target"
                checked={choice === "new"}
                onChange={() => setChoice("new")}
                title="Place a new order"
                detail="Delivered separately, with its own delivery charge."
              />
            </div>
            {mustChoose && <p className="text-sm text-error">Choose an option to continue.</p>}
          </fieldset>
        )}

        {merging ? (
          <p className="text-sm text-muted">New items will be added to order {target?.orderNumber} using its saved details.</p>
        ) : !mustChoose && (
          <div className="space-y-6">
            <section className="space-y-4" aria-labelledby="checkout-address-heading">
              <h2 id="checkout-address-heading" className="text-lg font-semibold text-text">Delivery address</h2>
              <TextInput label="Address" required as="textarea" rows={2} inputClassName="resize-none" value={form.address} onChange={set("address")} error={errors.address} maxLength={500} autoComplete="street-address" />
              <TextInput label="City" required value={form.city} onChange={set("city")} error={errors.city} maxLength={100} autoComplete="address-level2" />
              <TextInput label="Order notes (optional)" as="textarea" rows={2} inputClassName="resize-none" value={form.notes} onChange={set("notes")} maxLength={1000} />
            </section>

            <section className="space-y-3" aria-labelledby="checkout-payment-heading">
              <h2 id="checkout-payment-heading" className="text-lg font-semibold text-text">Payment method</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map(({ value, label }) => (
                  <Choice
                    key={value}
                    name="paymentType"
                    checked={paymentType === value}
                    onChange={() => {
                      setPaymentType(value);
                      setDeliveryLoading(true);
                      setDeliveryError(false);
                    }}
                    title={label}
                    detail={money(lines.reduce(
                      (sum, line) => sum + getProductCheckoutPrice(line.product, value, sales) * (Number(line.quantity) || 0),
                      0,
                    ))}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="checkout-delivery-heading">
              <h2 id="checkout-delivery-heading" className="text-lg font-semibold text-text">Delivery</h2>
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
              {deliveryError && <p role="alert" className="text-sm text-error">Could not calculate delivery charges. Please try again.</p>}
            </section>

            <section className="space-y-3" aria-labelledby="checkout-customer-heading">
              <h2 id="checkout-customer-heading" className="text-lg font-semibold text-text">Your details</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="Full name" required value={form.customerName} onChange={set("customerName")} error={errors.customerName} maxLength={128} autoComplete="name" />
                <TextInput label="Email" type="email" value={form.customerEmail} onChange={set("customerEmail")} maxLength={320} autoComplete="email" />
                <TextInput label="Phone" required type="tel" value={form.customerPhone} onChange={set("customerPhone")} error={errors.customerPhone} maxLength={20} inputMode="tel" autoComplete="tel" />
              </div>
            </section>
          </div>
        )}

        <section aria-labelledby="checkout-summary-heading">
          <h2 id="checkout-summary-heading" className="mb-2 text-lg font-semibold text-text">
            {merging ? "New items" : "Order summary"}
          </h2>
          <dl className="divide-y divide-border border-y border-border text-sm">
            {lines.map((line) => {
              const quantity = Number(line.quantity) || 0;
              const price = getProductCheckoutPrice(line.product, paymentType, sales);
              return (
                <div key={`${line.productId}:${line.variant ?? ""}`} className="flex justify-between gap-4 py-2.5">
                  <dt className="min-w-0 text-muted">{line.product.name} × {quantity}</dt>
                  <dd className="shrink-0 tabular-nums text-text">{money(price * quantity)}</dd>
                </div>
              );
            })}
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
            <div className="flex justify-between gap-4 py-2.5 font-medium text-text">
              <dt>Final amount ({count})</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            {!merging && (
              <>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">Delivery</dt>
                  <dd className="tabular-nums text-text">{deliveryLoading ? "Calculating..." : delivery === 0 ? "Free" : money(delivery)}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5 font-semibold text-text">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{money(total)}</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {serverError && <p role="alert" className="border-y border-error py-2.5 text-sm text-error">{serverError}</p>}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={submitting || mustChoose || checkingOpen || (!merging && (deliveryLoading || deliveryError))}
            className="min-h-11 w-full rounded-md bg-accent px-5 py-2.5 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Please wait..."
              : checkingOpen
                ? "Checking your orders..."
                : mustChoose
                  ? "Choose an option above"
                  : merging
                    ? `Add to order ${target?.orderNumber ?? ""}`
                    : `Place order for ${money(total)}`}
          </button>
          <Link to={PATHS.user.cart(username)} className="block min-h-11 rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-text hover:border-accent">
            Back to cart
          </Link>
        </div>
      </form>
    </Shell>
  );
}

function Choice({ name, checked, onChange, title, detail }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
        checked ? "border-accent bg-surface-alt" : "border-border hover:border-accent"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-4 shrink-0 accent-accent" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-text">{title}</span>
        {detail && <span className="block text-sm text-muted">{detail}</span>}
      </span>
    </label>
  );
}

function Shell({ children }) {
  return (
    <section className="w-full space-y-5">
      <PageHeader art="orderForm" title="Checkout" subtitle="Review your items, delivery, and payment details." />
      {children}
    </section>
  );
}