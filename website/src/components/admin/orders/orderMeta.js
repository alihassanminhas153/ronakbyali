import { CheckCircle2, Clock, Cog, PackageCheck, Truck, Undo2, XCircle } from 'lucide-react';
import { entityColorStep, toneColor } from '../../../lib/entityColors';

// tone = the theme accent shade used by the badge, tab, and timeline dot
export const STATUS_META = {
  pending: { label: 'Pending', tone: entityColorStep('orderStatus', 'pending'), icon: Clock },
  confirmed: { label: 'Confirmed', tone: entityColorStep('orderStatus', 'confirmed'), icon: CheckCircle2 },
  processing: { label: 'Processing', tone: entityColorStep('orderStatus', 'processing'), icon: Cog },
  shipped: { label: 'Shipped', tone: entityColorStep('orderStatus', 'shipped'), icon: Truck },
  delivered: { label: 'Delivered', tone: entityColorStep('orderStatus', 'delivered'), icon: PackageCheck },
  cancelled: { label: 'Cancelled', tone: entityColorStep('orderStatus', 'cancelled'), icon: XCircle },
  returned: { label: 'Returned', tone: entityColorStep('orderStatus', 'returned'), icon: Undo2 },
};

export const PAYMENT_META = {
  unpaid: { label: 'Unpaid', tone: entityColorStep('paymentStatus', 'unpaid') },
  partial: { label: 'Partial', tone: entityColorStep('paymentStatus', 'partial') },
  paid: { label: 'Paid', tone: entityColorStep('paymentStatus', 'paid') },
  refunded: { label: 'Refunded', tone: entityColorStep('paymentStatus', 'refunded') },
};

export const METHOD_LABEL = {
  cod: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
};

export const DELIVERY_LABEL = { fast: 'Fast', regular: 'Regular', pickup: 'Pickup' };

// ['pending', ...] + labels -> [{ value, label }] for SelectInput
export const toOptions = (values, labels) =>
  values.map((value) => {
    const l = labels[value];
    return { value, label: typeof l === 'string' ? l : l?.label ?? value };
  });

export const money = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`;

export const fullDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

export const timeAgo = (iso) => {
  if (!iso) return '';
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

export { toneColor };