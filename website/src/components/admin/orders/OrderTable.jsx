import { memo } from 'react';
import { Eye } from 'lucide-react';
import '../users/userScroll.css';

import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import { parseOrderItems } from '../../../store/slices/ordersSlice';
import { DeliveryChip, PaymentBadge, StatusBadge } from './OrderBadges';
import { fullDate, money, timeAgo } from './orderMeta';

const COLUMNS = [
  { label: 'Order' },
  { label: 'Customer' },
  { label: 'Items', right: true },
  { label: 'Total', right: true },
  { label: 'Payment' },
  { label: 'Status' },
  { label: 'Placed' },
  { label: 'Actions', right: true },
];

const stop = (e) => e.stopPropagation(); // controls inside a clickable row must not open it
const rise = (i) => ({ animationDelay: `${Math.min(i, 12) * 35}ms` });
const ICON_BTN =
  'grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent';

const countItems = (order) => parseOrderItems(order).reduce((s, i) => s + (Number(i.quantity) || 0), 0);

// Table on larger screens, cards below. Clicking a row opens the order drawer.
function Shell({ children, always = false }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-surface ${always ? '' : 'hidden lg:block'}`}>
      <div className="user-scroll overflow-x-auto">
        <table className="w-full min-w-[60rem] text-left">
          <thead className="bg-surface-alt/60 text-xs text-muted">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.label} className={`px-4 py-3 font-medium ${c.right ? 'text-right' : ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Placed({ value }) {
  return (
    <Tooltip label={fullDate(value)}>
      <time dateTime={value} className="whitespace-nowrap text-sm text-muted">{timeAgo(value)}</time>
    </Tooltip>
  );
}

function ViewButton({ order, onView }) {
  return (
    <Tooltip label="View order">
      <button type="button" onClick={(e) => { stop(e); onView?.(order); }} aria-label={`View order ${order.orderNumber}`} className={ICON_BTN}>
        <Eye size={18} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

const OrderRow = memo(function OrderRow({ order, index, onView }) {
  const dim = ['cancelled', 'returned'].includes(order.status) ? 'opacity-60' : '';
  return (
    <tr
      style={rise(index)}
      onClick={() => onView?.(order)}
      className="group/row animate-rise cursor-pointer transition-colors hover:bg-surface-alt/50"
    >
      <td className={`px-4 py-3 ${dim}`}>
        <p className="text-sm font-semibold tabular-nums text-text">{order.orderNumber}</p>
        <p className="mt-0.5"><DeliveryChip type={order.deliveryType} /></p>
      </td>
      <td className={`px-4 py-3 ${dim}`}>
        <p className="max-w-52 truncate text-sm font-medium text-text">{order.customerName}</p>
        <p className="mt-0.5 max-w-52 truncate text-xs text-muted">{order.customerPhone} · {order.city}</p>
      </td>
      <td className={`px-4 py-3 text-right text-sm tabular-nums text-text ${dim}`}>{countItems(order)}</td>
      <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums text-text ${dim}`}>{money(order.total)}</td>
      <td className="px-4 py-3"><PaymentBadge status={order.paymentStatus} /></td>
      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
      <td className={`px-4 py-3 ${dim}`}><Placed value={order.$createdAt} /></td>
      <td className="cursor-default px-4 py-3" onClick={stop}>
        <div className="flex justify-end"><ViewButton order={order} onView={onView} /></div>
      </td>
    </tr>
  );
});

const OrderCard = memo(function OrderCard({ order, index, onView }) {
  return (
    <li
      style={rise(index)}
      onClick={() => onView?.(order)}
      className="group/row animate-rise cursor-pointer rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tabular-nums text-text">{order.orderNumber}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{order.customerName} · {order.city}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <PaymentBadge status={order.paymentStatus} />
        <DeliveryChip type={order.deliveryType} />
        <span className="ml-auto text-sm font-medium tabular-nums text-text">{money(order.total)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{countItems(order)} {countItems(order) === 1 ? 'item' : 'items'} · <Placed value={order.$createdAt} /></span>
        <span onClick={stop}><ViewButton order={order} onView={onView} /></span>
      </div>
    </li>
  );
});

export default function OrderTable({ orders, onView }) {
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {orders.map((o, i) => <OrderCard key={o.$id} order={o} index={i} onView={onView} />)}
      </ul>
      <Shell>
        {orders.map((o, i) => <OrderRow key={o.$id} order={o} index={i} onView={onView} />)}
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