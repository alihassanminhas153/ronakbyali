// src/pages/user/dashboard/Orders.jsx   (route: /:username/orders)
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchMyOrders,
  updateOrderItemQuantity,
  updateOrderDetails,
  cancelMyOrder,
  clearLastPlacedOrder,
  clearOrderUpdateError,
  canEditOrder,
  parseOrderItems,
  orderItemKey,
  selectMyOrders,
  selectMyOrdersTotal,
  selectMyOrdersStatus,
  selectMyOrdersError,
  selectOrderUpdating,
  selectOrderUpdateError,
  selectLastPlacedOrder,
  selectLastPlacedKind,
} from "../../../store/slices/ordersSlice";
import { getProductImageUrl } from "../../../store/slices/productsSlice";
import { PATHS } from "../../../router/path";

const PAGE = 10;
const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-PK")}`;
const dateOf = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

// What each real status means to a customer.
const STATUS = {
  pending: { label: "Received", note: "We have your order and will confirm it soon.", tone: "amber" },
  confirmed: { label: "Confirmed", note: "Your order is confirmed.", tone: "blue" },
  processing: { label: "Being prepared", note: "We are getting your order ready.", tone: "blue" },
  shipped: { label: "Shipped", note: "Your order is on its way. It can no longer be changed.", tone: "violet" },
  delivered: { label: "Delivered", note: "Your order was delivered.", tone: "green" },
  cancelled: { label: "Cancelled", note: "This order was cancelled.", tone: "neutral" },
  returned: { label: "Returned", note: "This order was returned.", tone: "neutral" },
};
const TONES = {
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  blue: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
  violet: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
  green: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  neutral: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
};

const FIELD =
  "mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:text-white";

export default function Orders() {
  const dispatch = useDispatch();
  const { username } = useParams();
  const orders = useSelector(selectMyOrders);
  const total = useSelector(selectMyOrdersTotal);
  const status = useSelector(selectMyOrdersStatus);
  const error = useSelector(selectMyOrdersError);
  const updating = useSelector(selectOrderUpdating);
  const updateError = useSelector(selectOrderUpdateError);
  const placed = useSelector(selectLastPlacedOrder);
  const placedKind = useSelector(selectLastPlacedKind);

  useEffect(() => {
    dispatch(fetchMyOrders({ limit: PAGE, offset: 0 }));
    return () => {
      dispatch(clearOrderUpdateError());
    };
  }, [dispatch]);

  const loadingFirst = status === "idle" || (status === "loading" && orders.length === 0);

  if (loadingFirst) {
    return (
      <Shell>
        <p className="text-neutral-600 dark:text-neutral-300" aria-busy="true">Loading your orders...</p>
      </Shell>
    );
  }

  if (status === "failed" && orders.length === 0) {
    return (
      <Shell>
        <p role="alert" className="text-red-600 dark:text-red-400">{error || "Could not load your orders."}</p>
        <button
          type="button"
          onClick={() => dispatch(fetchMyOrders({ limit: PAGE, offset: 0 }))}
          className="mt-4 rounded-md bg-neutral-900 px-5 py-2.5 font-semibold text-white dark:bg-white dark:text-neutral-900"
        >
          Try again
        </button>
      </Shell>
    );
  }

  return (
    <Shell subtitle={orders.length ? `${total} ${total === 1 ? "order" : "orders"}` : null}>
      {placed && (
        <div role="status" className="mb-6 flex items-start justify-between gap-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <p>
            {placedKind === "added"
              ? `Your items were added to order ${placed.orderNumber}. The new total is ${money(placed.total)}.`
              : `Thank you. Order ${placed.orderNumber} is placed. You can change it until it ships.`}
          </p>
          <button type="button" onClick={() => dispatch(clearLastPlacedOrder())} className="shrink-0 text-sm underline">
            Dismiss
          </button>
        </div>
      )}

      {updateError && (
        <p role="alert" className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {updateError}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-lg font-medium text-neutral-900 dark:text-white">No orders yet</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">When you place an order it will show up here.</p>
          <Link to={PATHS.products} className="mt-6 inline-block rounded-md bg-neutral-900 px-6 py-3 font-semibold text-white dark:bg-white dark:text-neutral-900">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="space-y-6">
          {orders.map((o) => (
            <OrderCard key={o.$id} order={o} busy={updating} username={username} />
          ))}
        </ul>
      )}

      {orders.length < total && (
        <button
          type="button"
          onClick={() => dispatch(fetchMyOrders({ limit: PAGE, offset: orders.length }))}
          disabled={status === "loading"}
          className="mt-6 rounded-md border border-neutral-300 px-5 py-2.5 font-medium text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:text-white"
        >
          {status === "loading" ? "Loading..." : `Show more (${total - orders.length} left)`}
        </button>
      )}
    </Shell>
  );
}

function OrderCard({ order, busy, username }) {
  const dispatch = useDispatch();
  const items = parseOrderItems(order);
  const editable = canEditOrder(order);
  const meta = STATUS[order.status] || { label: order.status, note: "", tone: "neutral" };

  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [draft, setDraft] = useState(null);

  const startEdit = () => {
    setDraft({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerEmail: order.customerEmail || "",
      city: order.city || "",
      address: order.address || "",
      notes: order.notes || "",
    });
    setEditing(true);
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    const res = await dispatch(updateOrderDetails({ orderId: order.$id, data: draft, toast: true }));
    if (updateOrderDetails.fulfilled.match(res)) setEditing(false);
  };

  const setQty = (item, quantity) =>
    dispatch(updateOrderItemQuantity({ orderId: order.$id, itemKey: orderItemKey(item), quantity }));

  return (
    <li className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-white">Order {order.orderNumber}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{dateOf(order.$createdAt)}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${TONES[meta.tone]}`}>{meta.label}</span>
          <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">{money(order.total)}</p>
        </div>
      </header>

      <div className="space-y-5 p-4">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{meta.note}</p>
        {order.trackingId && (
          <p className="text-sm text-neutral-900 dark:text-white">
            Tracking number: <span className="font-medium">{order.trackingId}</span>
          </p>
        )}

        {/* items */}
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((item) => {
            const img = getProductImageUrl(item.fileId);
            return (
              <li key={orderItemKey(item)} className="flex items-center gap-3 py-3">
                <span className="h-16 w-12 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                  {img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-900 dark:text-white">{item.name}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {money(item.price)} each{item.variant ? ` | ${item.variant}` : ""}
                  </span>
                </span>

                {editable ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center rounded-md border border-neutral-300 dark:border-neutral-700" role="group" aria-label={`Quantity of ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => setQty(item, item.quantity - 1)}
                        disabled={busy || item.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="h-8 w-8 text-neutral-900 disabled:opacity-40 dark:text-white"
                      >
                        −
                      </button>
                      <span className="w-7 text-center tabular-nums text-neutral-900 dark:text-white">{item.quantity}</span>
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQty(item, 0)}
                        disabled={busy}
                        className="text-sm text-neutral-600 underline-offset-2 hover:underline disabled:opacity-40 dark:text-neutral-300"
                      >
                        Remove
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="shrink-0 text-sm tabular-nums text-neutral-700 dark:text-neutral-300">x {item.quantity}</span>
                )}

                <span className="w-24 shrink-0 text-right tabular-nums text-neutral-900 dark:text-white">
                  {money(item.price * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>

        {/* money */}
        <dl className="ml-auto max-w-xs space-y-1 text-sm">
          <Line label="Subtotal" value={money(order.subtotal)} />
          <Line label="Delivery" value={Number(order.deliveryCharges) ? money(order.deliveryCharges) : "Free"} />
          {Number(order.discount) > 0 && <Line label="Discount" value={`− ${money(order.discount)}`} />}
          <Line label="Total" value={money(order.total)} strong />
          <Line label="To pay on delivery" value={money(order.codAmount)} />
        </dl>

        {/* delivery details */}
        {editing ? (
          <form onSubmit={saveDetails} className="space-y-3 rounded-md bg-neutral-50 p-4 dark:bg-neutral-900">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-neutral-900 dark:text-white">
                Name
                <input className={FIELD} value={draft.customerName} maxLength={128} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} />
              </label>
              <label className="text-sm font-medium text-neutral-900 dark:text-white">
                Phone
                <input className={FIELD} value={draft.customerPhone} maxLength={20} onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })} />
              </label>
              <label className="text-sm font-medium text-neutral-900 dark:text-white">
                Email
                <input className={FIELD} type="email" value={draft.customerEmail} onChange={(e) => setDraft({ ...draft, customerEmail: e.target.value })} />
              </label>
              <label className="text-sm font-medium text-neutral-900 dark:text-white">
                City
                <input className={FIELD} value={draft.city} maxLength={100} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              </label>
            </div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white">
              Address
              <textarea className={FIELD} rows={2} value={draft.address} maxLength={500} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </label>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white">
              Notes
              <textarea className={FIELD} rows={2} value={draft.notes} maxLength={1000} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
                {busy ? "Saving..." : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            <p className="font-medium text-neutral-900 dark:text-white">{order.customerName}</p>
            <p>{order.customerPhone}{order.customerEmail ? ` | ${order.customerEmail}` : ""}</p>
            <p>{order.address}, {order.city}</p>
            {order.notes && <p className="mt-1 italic">Note: {order.notes}</p>}
          </div>
        )}

        {/* actions: only while the order has not shipped */}
        {editable && !editing && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
            <button type="button" onClick={startEdit} disabled={busy} className="font-medium text-neutral-900 underline-offset-2 hover:underline disabled:opacity-40 dark:text-white">
              Change delivery details
            </button>
            <Link to={PATHS.products} className="text-neutral-700 underline-offset-2 hover:underline dark:text-neutral-300">
              Add more products
            </Link>
            {confirmCancel ? (
              <span className="flex items-center gap-2">
                <span className="text-neutral-700 dark:text-neutral-300">Cancel this order?</span>
                <button
                  type="button"
                  onClick={() => dispatch(cancelMyOrder({ orderId: order.$id, toast: true }))}
                  disabled={busy}
                  className="rounded-md bg-red-600 px-3 py-1 font-medium text-white disabled:opacity-50"
                >
                  Yes, cancel
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className="rounded-md border border-neutral-300 px-3 py-1 text-neutral-900 dark:border-neutral-700 dark:text-white">
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)} disabled={busy} className="text-red-700 underline-offset-2 hover:underline disabled:opacity-40 dark:text-red-400">
                Cancel order
              </button>
            )}
            <span className="w-full text-neutral-500 dark:text-neutral-400">
              You can change this order until it ships. To add products, put them in your cart and choose "Add to order" at{" "}
              <Link to={PATHS.user.checkout(username)} className="underline">checkout</Link>.
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

function Line({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className={strong ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-300"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-900 dark:text-white"}`}>{value}</dd>
    </div>
  );
}

function Shell({ children, subtitle }) {
  return (
    <section className="w-full">
      <header className="mb-6">
        <h1 className="font-['Barlow_Condensed',sans-serif] text-4xl font-bold text-neutral-900 dark:text-white">Your orders</h1>
        {subtitle && <p className="text-neutral-600 dark:text-neutral-300">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}