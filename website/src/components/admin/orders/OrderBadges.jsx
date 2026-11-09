import { tint } from '../../../ui/graphs/utils';
import { DELIVERY_LABEL, PAYMENT_META, STATUS_META, toneColor } from './orderMeta';

const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', tone: 8 };
  const color = toneColor(meta.tone);
  const Icon = meta.icon;
  return (
    <span className={base} style={{ background: tint(color, 14), color }}>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {meta.label}
    </span>
  );
}

export function PaymentBadge({ status }) {
  const meta = PAYMENT_META[status] || { label: status || '—', tone: 8 };
  const color = toneColor(meta.tone);
  return (
    <span className={base} style={{ background: tint(color, 14), color }}>
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: color }} />
      {meta.label}
    </span>
  );
}

export function DeliveryChip({ type }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted">
      {DELIVERY_LABEL[type] || type || '—'}
    </span>
  );
}