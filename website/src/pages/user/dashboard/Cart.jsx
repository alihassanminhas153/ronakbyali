// src/pages/user/dashboard/Cart.jsx   (route: /:username/cart)
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchCart,
  setCartQuantity,
  removeFromCart,
  clearCart,
  selectCartLines,
  selectCartCount,
  selectCartSubtotal,
  selectCartDeliveryCharges,
  selectCartTotal,
  selectCartStatus,
  selectCartUpdating,
  selectCartError,
} from "../../../store/slices/cartSlice";
import { getMainImageUrl } from "../../../store/slices/productsSlice";
import { PATHS } from "../../../router/path";

// Set this to your checkout / place-order route once the orders flow exists.
// While it is null the checkout button stays disabled.
const CHECKOUT_PATH = null;

const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;

// Stock state of one cart line.
function stockOf(line) {
  const p = line.product;
  const remaining = p.remaining == null ? null : Number(p.remaining);
  const out = p.status === "outOfStock" || (remaining != null && remaining <= 0);
  const over = !out && remaining != null && Number(line.quantity) > remaining;
  return { remaining, out, over };
}

export default function Cart() {
  const dispatch = useDispatch();
  const lines = useSelector(selectCartLines);
  const count = useSelector(selectCartCount);
  const subtotal = useSelector(selectCartSubtotal);
  const delivery = useSelector(selectCartDeliveryCharges);
  const total = useSelector(selectCartTotal);
  const status = useSelector(selectCartStatus);
  const updating = useSelector(selectCartUpdating);
  const error = useSelector(selectCartError);

  const [confirmClear, setConfirmClear] = useState(false);

  // Refresh prices and stock whenever the page opens.
  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const setQty = (line, quantity) =>
    dispatch(
      setCartQuantity({
        productId: line.productId,
        quantity,
        variant: line.variant ?? undefined,
      })
    );
  const remove = (line) =>
    dispatch(removeFromCart({ productId: line.productId, variant: line.variant ?? undefined }));

  const loadingFirst = status === "idle" || (status === "loading" && lines.length === 0);
  if (loadingFirst) return <Skeleton />;

  if (status === "failed" && lines.length === 0) {
    return (
      <Shell>
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error || "Could not load your cart."}
        </p>
        <button
          type="button"
          onClick={() => dispatch(fetchCart())}
          className="mt-4 rounded-md bg-neutral-900 px-5 py-2.5 font-semibold text-white dark:bg-white dark:text-neutral-900"
        >
          Try again
        </button>
      </Shell>
    );
  }

  if (lines.length === 0) {
    return (
      <Shell>
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-lg font-medium text-neutral-900 dark:text-white">Your cart is empty</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Add something you like and it will wait for you here.
          </p>
          <Link
            to={PATHS.products}
            className="mt-6 inline-block rounded-md bg-neutral-900 px-6 py-3 font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Browse products
          </Link>
        </div>
      </Shell>
    );
  }

  const hasProblem = lines.some((l) => {
    const s = stockOf(l);
    return s.out || s.over;
  });
  const canCheckout = Boolean(CHECKOUT_PATH) && !hasProblem && !updating;

  return (
    <Shell
      action={
        confirmClear ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-neutral-600 dark:text-neutral-300">Remove everything?</span>
            <button
              type="button"
              onClick={() => {
                dispatch(clearCart());
                setConfirmClear(false);
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white"
            >
              Yes, clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:text-white"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={updating}
            className="text-sm text-neutral-600 underline-offset-2 hover:underline disabled:opacity-40 dark:text-neutral-300"
          >
            Clear cart
          </button>
        )
      }
      subtitle={`${count} ${count === 1 ? "item" : "items"}`}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul
          className={`divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800 ${
            updating ? "opacity-70" : ""
          }`}
          aria-busy={updating}
        >
          {lines.map((line) => (
            <CartLine
              key={`${line.productId}:${line.variant ?? ""}`}
              line={line}
              busy={updating}
              onQty={(q) => setQty(line, q)}
              onRemove={() => remove(line)}
            />
          ))}
        </ul>

        <aside className="h-fit rounded-lg border border-neutral-200 p-5 dark:border-neutral-800 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label={`Subtotal (${count})`} value={money(subtotal)} />
            <Row label="Delivery" value={delivery === 0 ? "Free" : money(delivery)} />
            <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <Row label="Total" value={money(total)} strong />
            </div>
          </dl>

          {hasProblem && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
              Some items are unavailable or exceed stock. Fix the highlighted items to continue.
            </p>
          )}

          {canCheckout ? (
            <Link
              to={CHECKOUT_PATH}
              className="mt-5 block rounded-md bg-neutral-900 px-5 py-3 text-center font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Checkout
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-md bg-neutral-900 px-5 py-3 font-semibold text-white opacity-40 dark:bg-white dark:text-neutral-900"
            >
              {CHECKOUT_PATH ? "Checkout" : "Checkout not available yet"}
            </button>
          )}
          <Link
            to={PATHS.products}
            className="mt-3 block text-center text-sm text-neutral-600 hover:underline dark:text-neutral-300"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function CartLine({ line, busy, onQty, onRemove }) {
  const p = line.product;
  const qty = Number(line.quantity) || 0;
  const { remaining, out, over } = stockOf(line);
  const max = remaining != null ? Math.max(1, remaining) : 99;
  const img = getMainImageUrl(p);
  const href = PATHS.product(p.category, p.group, p.slug);

  return (
    <li className="flex gap-4 py-5">
      <Link to={href} className="h-28 w-24 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
        {img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link to={href} className="block truncate font-medium text-neutral-900 hover:underline dark:text-white">
              {p.name}
            </Link>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {[p.category, line.variant && `Option: ${line.variant}`].filter(Boolean).join(" | ")}
            </p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">
            {money((Number(p.price) || 0) * qty)}
          </p>
        </div>

        <p className="mt-1 text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
          {money(p.price)} each
        </p>

        {out && <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">Out of stock. Remove it to continue.</p>}
        {over && (
          <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-400">
            Only {remaining} available. Lower the quantity.
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-md border border-neutral-300 dark:border-neutral-700" role="group" aria-label={`Quantity of ${p.name}`}>
            <button
              type="button"
              onClick={() => onQty(qty - 1)}
              disabled={busy || qty <= 1}
              aria-label="Decrease quantity"
              className="h-9 w-9 text-lg text-neutral-900 disabled:opacity-40 dark:text-white"
            >
              −
            </button>
            <span className="w-8 text-center tabular-nums text-neutral-900 dark:text-white">{qty}</span>
            <button
              type="button"
              onClick={() => onQty(qty + 1)}
              disabled={busy || out || qty >= max}
              aria-label="Increase quantity"
              className="h-9 w-9 text-lg text-neutral-900 disabled:opacity-40 dark:text-white"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="text-sm text-neutral-600 underline-offset-2 hover:underline disabled:opacity-40 dark:text-neutral-300"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between">
      <dt className={strong ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-300"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-lg font-semibold text-neutral-900 dark:text-white" : "text-neutral-900 dark:text-white"}`}>{value}</dd>
    </div>
  );
}

function Shell({ children, action, subtitle }) {
  return (
    <section className="w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-['Barlow_Condensed',sans-serif] text-4xl font-bold text-neutral-900 dark:text-white">Your cart</h1>
          {subtitle && <p className="text-neutral-600 dark:text-neutral-300">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Skeleton() {
  const b = "animate-pulse rounded bg-neutral-200 dark:bg-neutral-800";
  return (
    <section aria-busy="true" aria-label="Loading cart" className="space-y-4">
      <div className={`h-10 w-48 ${b}`} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-28 w-full ${b}`} />
      ))}
    </section>
  );
}