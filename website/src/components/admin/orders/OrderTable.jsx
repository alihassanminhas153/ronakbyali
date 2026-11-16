import { memo } from 'react';
import { Eye } from 'lucide-react';
import '../users/userScroll.css';

import AppIcon from '../../../ui/custom/AppIcon';
import Tooltip from '../../../ui/custom/tooltip/Tooltip';
import { DeliveryChip, PaymentBadge, StatusBadge } from './OrderBadges';
import { money, STATUS_META } from './orderMeta';

const COLUMNS = [
  { label: 'Order ID' },
  { label: 'Customer' },
  { label: 'Payment' },
  { label: 'Status' },
  { label: 'Actions', right: true },
];

const stop = (e) => e.stopPropagation(); // controls inside a clickable row must not open it
const rise = (i) => ({ animationDelay: `${Math.min(i, 12) * 35}ms` });
const ICON_BTN =
  'grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent';

// Table on larger screens, cards below. Clicking a row opens the order drawer.
function Shell({ children, always = false }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-surface shadow-soft ${always ? '' : 'hidden lg:block'}`}>
      <div className="user-scroll overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left">
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

function ViewButton({ order, onView }) {
  return (
    <Tooltip label="View order">
      <button type="button" onClick={(e) => { stop(e); onView?.(order); }} aria-label={`View order ${order.orderNumber}`} className={ICON_BTN}>
        <Eye size={18} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

const OrderRow = memo(function OrderRow({ order, index, onView, detail }) {
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
        <p className="max-w-64 truncate text-sm font-medium text-text">{order.customerName}</p>
        <p className="mt-0.5 max-w-64 truncate text-xs text-muted">{order.customerPhone} · {order.city}</p>
        {detail && <Tooltip label={detail}><p className="mt-1 max-w-64 truncate text-xs text-muted">{detail}</p></Tooltip>}
      </td>
      <td className={`whitespace-nowrap px-4 py-3 ${dim}`}>
        <PaymentBadge status={order.paymentStatus} />
        <p className="mt-1 text-xs tabular-nums text-muted">{money(order.total)}</p>
      </td>
      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
      <td className="cursor-default px-4 py-3" onClick={stop}>
        <div className="flex justify-end"><ViewButton order={order} onView={onView} /></div>
      </td>
    </tr>
  );
});

const OrderCard = memo(function OrderCard({ order, index, onView, detail }) {
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
      <div className="mt-3 min-w-0">
        <p className="truncate text-sm font-medium text-text">{order.customerName}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{order.customerPhone} · {order.city}</p>
        {detail && <Tooltip label={detail}><p className="mt-1 truncate text-xs text-muted">{detail}</p></Tooltip>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <PaymentBadge status={order.paymentStatus} />
          <p className="mt-1 text-xs tabular-nums text-muted">{money(order.total)}</p>
        </div>
        <StatusBadge status={order.status} />
        <ViewButton order={order} onView={onView} />
      </div>
    </li>
  );
});

export default function OrderTable({ orders, onView, trackerDetails = {} }) {
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {orders.map((o, i) => <OrderCard key={o.$id} order={o} index={i} onView={onView} detail={trackerDetails[o.$id]} />)}
      </ul>
      <Shell>
        {orders.map((o, i) => <OrderRow key={o.$id} order={o} index={i} onView={onView} detail={trackerDetails[o.$id]} />)}
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