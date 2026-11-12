// src/pages/user/dashboard/Checkout.jsx   (route: /:username/checkout)
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchCart,
  selectCartLines,
  selectCartCount,
  selectCartSubtotal,
  selectCartDeliveryCharges,
  selectCartStatus,
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
import { getMainImageUrl } from "../../../store/slices/productsSlice";
import { PATHS } from "../../../router/path";
import { LOGIN_REQUIRED } from "../../../store/slices/utils";

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;
const FIELD =
  "mt-1 w-full rounded-md border border-neutral-300 bg-surface px-3 py-2.5 text-text focus:border-accent dark:border-neutral-700";

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { username } = useParams();

  const profile = useSelector((s) => s.auth.profile);
  const lines = useSelector(selectCartLines);
  const count = useSelector(selectCartCount);
  const subtotal = useSelector(selectCartSubtotal);
  const cartDelivery = useSelector(selectCartDeliveryCharges);
  const cartStatus = useSelector(selectCartStatus);
  const openOrders = useSelector(selectOpenOrders);
  const openStatus = useSelector(selectOpenOrdersStatus);

  // null = not chosen yet, "new" = new order, otherwise the id of the earlier order
  const [choice, setChoice] = useState(null);
  const [deliveryType, setDeliveryType] = useState("regular");
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

  const delivery = deliveryType === "pickup" ? 0 : cartDelivery;
  const total = subtotal + delivery;
  const originalSubtotal = lines.reduce((sum, line) => {
    const price = Number(line.product.price) || 0;
    const originalPrice = Number(line.product.originalPrice) || price;
    return sum + Math.max(price, originalPrice) * (Number(line.quantity) || 0);
  }, 0);
  const discountSavings = Math.max(0, originalSubtotal - subtotal);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.customerName.trim()) next.customerName = "Enter your name.";
    if (!form.customerPhone.trim()) next.customerPhone = "Enter a phone number we can reach.";
    if (!form.city.trim()) next.city = "Enter your city.";
    if (!form.address.trim()) next.address = "Enter your delivery address.";
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
      : await dispatch(placeOrder({ form: { ...form, deliveryType }, toast: true }));
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
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
          <p className="text-lg font-medium text-neutral-900 dark:text-white">Your cart is empty</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">Add products first, then come back to check out.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to={PATHS.products} className="rounded-md bg-neutral-900 px-5 py-2.5 font-semibold text-white dark:bg-white dark:text-neutral-900">
              Browse products
            </Link>
            <Link to={PATHS.user.orders(username)} className="rounded-md border border-neutral-300 px-5 py-2.5 font-medium text-neutral-900 dark:border-neutral-700 dark:text-white">
              My orders
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} noValidate className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {hasOpen && (
            <fieldset className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40 sm:p-5">
              <legend className="px-1 font-semibold text-neutral-900 dark:text-white">
                Add to an existing order?
              </legend>
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
              {mustChoose && (
                <p className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-300">Choose one to continue.</p>
              )}
            </fieldset>
          )}

          {merging ? (
            <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 sm:p-5">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Delivery details</h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                This will use the address on order {target?.orderNumber}.
              </p>
            </section>
          ) : (
            !mustChoose && (
              <section className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 sm:space-y-5 sm:p-5">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Delivery details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" error={errors.customerName}>
                    <input className={FIELD} value={form.customerName} onChange={set("customerName")} maxLength={128} autoComplete="name" required aria-invalid={Boolean(errors.customerName)} />
                  </Field>
                  <Field label="Phone" error={errors.customerPhone}>
                    <input className={FIELD} type="tel" value={form.customerPhone} onChange={set("customerPhone")} maxLength={20} inputMode="tel" autoComplete="tel" required aria-invalid={Boolean(errors.customerPhone)} />
                  </Field>
                </div>
                <Field label="Email (optional)">
                  <input className={FIELD} type="email" value={form.customerEmail} onChange={set("customerEmail")} autoComplete="email" />
                </Field>
                <Field label="City" error={errors.city}>
                  <input className={FIELD} value={form.city} onChange={set("city")} maxLength={100} autoComplete="address-level2" required aria-invalid={Boolean(errors.city)} />
                </Field>
                <Field label="Address" error={errors.address}>
                  <textarea className={`${FIELD} resize-none`} rows={3} value={form.address} onChange={set("address")} maxLength={500} autoComplete="street-address" required aria-invalid={Boolean(errors.address)} />
                </Field>
                <Field label="Notes for us (optional)">
                  <textarea className={`${FIELD} resize-none`} rows={2} value={form.notes} onChange={set("notes")} maxLength={1000} />
                </Field>

                <fieldset>
                  <legend className="text-sm font-medium text-neutral-900 dark:text-white">Delivery</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Choice
                      name="delivery"
                      checked={deliveryType === "regular"}
                      onChange={() => setDeliveryType("regular")}
                      title="Home delivery"
                      detail={cartDelivery === 0 ? "Free" : money(cartDelivery)}
                      equalHeight
                    />
                    <Choice
                      name="delivery"
                      checked={deliveryType === "pickup"}
                      onChange={() => setDeliveryType("pickup")}
                      title="Pick up"
                      detail="Free"
                      equalHeight
                    />
                  </div>
                </fieldset>

                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Payment</h3>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Cash on delivery</p>
                </div>
              </section>
            )
          )}
        </div>

        {/* ----- summary ----- */}
        <aside className="h-fit min-w-0 rounded-lg border border-neutral-200 bg-surface p-4 dark:border-neutral-800 sm:p-5 xl:sticky xl:top-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {merging ? "Adding to your order" : "Your order"}
          </h2>
          <ul className="mt-4 space-y-3">
            {lines.map((l) => {
              const img = getMainImageUrl(l.product);
              const quantity = Number(l.quantity) || 0;
              const price = Number(l.product.price) || 0;
              const originalPrice = Number(l.product.originalPrice) || price;
              const hasDiscount = originalPrice > price && price > 0;
              const discountPercent =
                Number(l.product.discountPercentage) > 0
                  ? Math.round(Number(l.product.discountPercentage))
                  : hasDiscount
                    ? Math.round((1 - price / originalPrice) * 100)
                    : 0;
              return (
                <li key={`${l.productId}:${l.variant ?? ""}`} className="flex min-w-0 items-center gap-3 text-sm">
                  {img && (
                    <span className="h-14 w-11 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-neutral-900 dark:text-white">{l.product.name}</span>
                    <span className="text-neutral-500 dark:text-neutral-400">Qty {quantity}</span>
                    {hasDiscount && (
                      <span className="mt-0.5 block truncate text-xs font-medium text-accent">
                        {l.product.discountName || "Discount"}{discountPercent > 0 ? ` · ${discountPercent}% off` : ""}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {hasDiscount && (
                      <span className="block text-xs text-neutral-500 line-through dark:text-neutral-400">
                        {money(originalPrice * quantity)}
                      </span>
                    )}
                    <span className={`block text-neutral-900 dark:text-white ${hasDiscount ? "text-base font-semibold" : ""}`}>
                      {money(price * quantity)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
            {merging ? (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600 dark:text-neutral-300">New items</dt>
                <dd className="tabular-nums text-neutral-900 dark:text-white">{money(subtotal)}</dd>
              </div>
            ) : (
              <>
                {discountSavings > 0 && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-neutral-600 dark:text-neutral-300">Original price</dt>
                      <dd className="tabular-nums text-neutral-500 line-through dark:text-neutral-400">{money(originalSubtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-accent">Discounts</dt>
                      <dd className="font-medium tabular-nums text-accent">−{money(discountSavings)}</dd>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-neutral-900 dark:text-white">Subtotal ({count})</dt>
                  <dd className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">{money(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-600 dark:text-neutral-300">Delivery</dt>
                  <dd className="tabular-nums text-neutral-900 dark:text-white">{delivery === 0 ? "Free" : money(delivery)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                  <dt className="font-semibold text-neutral-900 dark:text-white">Total</dt>
                  <dd className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">{money(total)}</dd>
                </div>
              </>
            )}
          </dl>

          {serverError && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || mustChoose || checkingOpen}
            className="mt-5 w-full rounded-md bg-neutral-900 px-5 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
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
          <Link to={PATHS.user.cart(username)} className="mt-3 block min-h-11 rounded-md border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-200">
            Back to cart
          </Link>
        </aside>
      </form>
    </Shell>
  );
}

function Choice({ name, checked, onChange, title, detail, equalHeight = false }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
        equalHeight ? "h-full min-h-20" : ""
      } ${
        checked
          ? "border-accent bg-accent-soft"
          : "border-neutral-300 bg-transparent dark:border-neutral-700"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-4 shrink-0 accent-accent" />
      <span>
        <span className="block font-medium text-neutral-900 dark:text-white">{title}</span>
        <span className="block text-sm text-neutral-600 dark:text-neutral-300">{detail}</span>
      </span>
    </label>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block text-sm font-medium text-neutral-900 dark:text-white">
      {label}
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-sm font-normal text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

function Shell({ children }) {
  return (
    <section className="w-full">
      <h1 className="mb-5 font-['Barlow_Condensed',sans-serif] text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">Checkout</h1>
      {children}
    </section>
  );
}