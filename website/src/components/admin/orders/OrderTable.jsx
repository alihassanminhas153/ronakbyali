import { memo, useState } from 'react';
import { useDispatch } from 'react-redux';
import '../users/userScroll.css';

import AppIcon from '../../../ui/custom/AppIcon';
import { postOrderDetail } from '../../../store/slices/ordersSlice';
import { ConfirmationBadge, DeliveryChip, PaymentBadge, StatusBadge } from './OrderBadges';
import { money, STATUS_META } from './orderMeta';

const COLUMNS = [
  { label: 'Order ID' },
  { label: 'Payment / status' },
  { label: 'Customer update' },
  { label: 'Confirmation / message', right: true },
];

const stop = (e) => e.stopPropagation(); // controls inside a clickable row must not open it
const rise = (i) => ({ animationDelay: `${Math.min(i, 12) * 35}ms` });
// Confirmation state + the "Send message" button (opens the message box on the page).
function MessageActions({ order, onMessage }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <ConfirmationBadge confirmed={order.isConfirmed} />
      <button
        type="button"
        onClick={(e) => { stop(e); onMessage?.(order); }}
        aria-label={`Send a message about order ${order.orderNumber}`}
        className="btn btn-primary inline-flex min-h-9 items-center justify-center px-3 py-1.5 text-xs"
      >
        Send message
      </button>
    </div>
  );
}

// Table on larger screens, cards below. Clicking a row opens the order drawer.
function Shell({ children, always = false }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-surface shadow-soft ${always ? '' : 'hidden lg:block'}`}>
      <div className="user-scroll overflow-x-auto">
        <table className="w-full min-w-[60rem] text-left">
          <thead className="sticky top-0 z-10 border-b border-border bg-surface-alt/90 text-[11px] uppercase tracking-wide text-muted backdrop-blur">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.label} className={`px-4 py-3 font-semibold ${column.right ? 'text-right' : ''}`}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function QuickUpdate({ orderId, orderNumber }) {
  const dispatch = useDispatch();
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const text = detail.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      await dispatch(postOrderDetail({ orderId, detail: text })).unwrap();
      setDetail('');
      setMessage('Update shared with customer.');
    } catch (error) {
      setMessage(typeof error === 'string' ? error : 'Could not post the update.');
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} onClick={stop} className="min-w-0 space-y-1">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <input
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={300}
          aria-label={`Customer-visible update for order ${orderNumber}`}
          placeholder="Add a customer update"
          className="min-w-[10rem] flex-1 rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!detail.trim() || busy}
          aria-label={`Post update for order ${orderNumber}`}
          className="btn btn-ghost min-h-9 px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
      {message && <p role={failed ? 'alert' : 'status'} className={`text-xs ${failed ? 'text-error' : 'text-success'}`}>{message}</p>}
    </form>
  );
}

const OrderRow = memo(function OrderRow({ order, index, onView, onMessage }) {
  const dim = ['cancelled', 'returned'].includes(order.status) ? 'opacity-60' : '';
  const iconTone = STATUS_META[order.status]?.tone || 1;
  return (
    <tr
      style={rise(index)}
      onClick={() => onView?.(order)}
      className="group/row animate-rise cursor-pointer transition-colors hover:bg-surface-alt/50"
    >
      <td className={`px-4 py-3 ${dim}`}>
        <p className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold tabular-nums text-text">
          <AppIcon name="single_box" tone={iconTone} className="size-5 shrink-0 object-contain" />
          {order.orderNumber}
        </p>
        {order.isCustom && <span className="mt-1 inline-flex rounded-full bg-accent-tone-6/10 px-2 py-0.5 text-[11px] font-medium text-accent-tone-6">Custom</span>}
        <div className="mt-1"><DeliveryChip type={order.deliveryType} /></div>
      </td>
      <td className={`px-4 py-3 ${dim}`}>
        <div className="flex flex-col items-start gap-1">
          <PaymentBadge status={order.paymentStatus} />
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-xs tabular-nums text-muted">{money(order.total)}</p>
      </td>
      <td className="px-4 py-3" onClick={stop}><QuickUpdate orderId={order.$id} orderNumber={order.orderNumber} /></td>
      <td className="cursor-default px-4 py-3" onClick={stop}>
        <div className="flex justify-end"><MessageActions order={order} onMessage={onMessage} /></div>
      </td>
    </tr>
  );
});

const OrderCard = memo(function OrderCard({ order, index, onView, onMessage }) {
  const iconTone = STATUS_META[order.status]?.tone || 1;
  return (
    <li
      style={rise(index)}
      onClick={() => onView?.(order)}
      className="group/row animate-rise cursor-pointer rounded-xl border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-alt/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold tabular-nums text-text">
            <AppIcon name="single_box" tone={iconTone} className="size-5 shrink-0 object-contain" />
            {order.orderNumber}
          </p>
          <div className="mt-1"><DeliveryChip type={order.deliveryType} /></div>
          {order.isCustom && <span className="mt-1 inline-flex rounded-full bg-accent-tone-6/10 px-2 py-0.5 text-[11px] font-medium text-accent-tone-6">Custom</span>}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <PaymentBadge status={order.paymentStatus} />
          <StatusBadge status={order.status} />
          <p className="mt-1 text-xs tabular-nums text-muted">{money(order.total)}</p>
        </div>
        <div onClick={stop}><MessageActions order={order} onMessage={onMessage} /></div>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <QuickUpdate orderId={order.$id} orderNumber={order.orderNumber} />
      </div>
    </li>
  );
});

export default function OrderTable({ orders, onView, onMessage }) {
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {orders.map((o, i) => <OrderCard key={o.$id} order={o} index={i} onView={onView} onMessage={onMessage} />)}
      </ul>
      <Shell>
        {orders.map((o, i) => <OrderRow key={o.$id} order={o} index={i} onView={onView} onMessage={onMessage} />)}
      </Shell>
    </>
  );
}

export function OrderTableSkeleton({ rows = 6 }) {
  return (
    <Shell always>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {COLUMNS.map((c, i) => (
            <td key={c.label} className="px-4 py-4">
              <div className={`h-4 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none ${i === 0 ? 'w-28' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </Shell>
  );
}