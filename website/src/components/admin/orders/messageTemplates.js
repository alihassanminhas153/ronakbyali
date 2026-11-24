import orderService, { normalizeStatus } from '../../../lib/appwrite/order';
import { PATHS } from '../../../router/path';
import { METHOD_LABEL, STATUS_META, fullDate, money } from './orderMeta';

// Message templates for Admin > Orders > "Send message".
// To add a template, add one object to TEMPLATES: { id, label, hint, build(ctx) }.
//   ctx = { order, tracker, link }   (link = the customer's confirmation link or null)

const STORE = 'Ronak by Ali';

// Page the customer opens to see (and confirm) their order.
export function confirmationUrl(order) {
  if (!order?.username || typeof window === 'undefined') return null;
  const path = PATHS.user.confirmOrder(order.username);
  return `${window.location.origin}${path}?orderId=${encodeURIComponent(order.$id)}`;
}

const hello = (order) => `Assalamualaikum ${order.customerName || 'Customer'},`;
const ref = (order) => order.orderNumber || order.$id;
const sign = `Thank you,\n${STORE}`;

const itemsLine = (order) => {
  const items = orderService
    .parseItems(order)
    .map((item) => `${item.name || 'Product'}${item.variant ? ` (${item.variant})` : ''} x${Number(item.quantity) || 0}`)
    .join(', ');
  return items ? `Items: ${items}.` : null;
};

const trackingLines = (order, tracker) => [
  order.trackingId ? `Tracking no.: ${order.trackingId}` : null,
  tracker?.link ? `Track your parcel: ${tracker.link}` : null,
];

const join = (lines) => lines.filter((line) => line !== null && line !== undefined && line !== false).join('\n');

export const TEMPLATES = [
  {
    id: 'confirmation',
    label: 'Order confirmation',
    hint: 'Asks the customer to open their order and confirm it.',
    build: ({ order, link }) =>
      join([
        hello(order),
        `Please confirm your order ${ref(order)}.`,
        `Total: ${money(order.total)}.`,
        itemsLine(order),
        link ? `Open this link to see your order and confirm it:\n${link}` : 'Please reply to this message to confirm your order.',
        '',
        sign,
      ]),
  },
  {
    id: 'latest_update',
    label: 'Latest order update',
    hint: 'The newest step of the tracking timeline.',
    build: ({ order, tracker }) => {
      const latest = tracker?.updates?.[0];
      const status = STATUS_META[normalizeStatus(order.status)]?.label || order.status;
      return join([
        hello(order),
        `Here is the latest update on your order ${ref(order)}.`,
        `Status: ${status}.`,
        latest?.title ? `Update: ${latest.title}${latest.note ? ` - ${latest.note}` : ''}.` : null,
        latest?.at ? `As of ${fullDate(latest.at)}.` : null,
        ...trackingLines(order, tracker),
        '',
        sign,
      ]);
    },
  },
  {
    id: 'received',
    label: 'Order received',
    hint: 'We have received the order.',
    build: ({ order }) =>
      join([
        hello(order),
        `We have received your order ${ref(order)}.`,
        itemsLine(order),
        `Total: ${money(order.total)}.`,
        'We will keep you updated as it moves forward.',
        '',
        sign,
      ]),
  },
  {
    id: 'packed',
    label: 'Order packed',
    hint: 'Packed and waiting to be dispatched.',
    build: ({ order }) =>
      join([
        hello(order),
        `Your order ${ref(order)} is packed and will be dispatched shortly.`,
        order.estimatedDelivery ? `Estimated delivery: ${fullDate(order.estimatedDelivery)}.` : null,
        '',
        sign,
      ]),
  },
  {
    id: 'dispatched',
    label: 'Order dispatched',
    hint: 'Handed to the courier, with the tracking details.',
    build: ({ order, tracker }) =>
      join([
        hello(order),
        `Your order ${ref(order)} has been dispatched.`,
        ...trackingLines(order, tracker),
        order.estimatedDelivery ? `Estimated delivery: ${fullDate(order.estimatedDelivery)}.` : null,
        Number(order.codAmount) > 0 ? `Please keep ${money(order.codAmount)} ready for the courier.` : null,
        '',
        sign,
      ]),
  },
  {
    id: 'delivered',
    label: 'Delivered, thank you',
    hint: 'After delivery.',
    build: ({ order }) =>
      join([
        hello(order),
        `Your order ${ref(order)} has been delivered. We hope you enjoy it.`,
        'If anything is not right, just reply here and we will help.',
        '',
        sign,
      ]),
  },
  {
    id: 'payment_reminder',
    label: 'Payment reminder',
    hint: 'Amount still to be paid.',
    build: ({ order }) => {
      const due = order.paymentMethod === 'cod' ? Number(order.codAmount) || 0 : Math.max(0, (Number(order.total) || 0) - (Number(order.advanceAmount) || 0));
      return join([
        hello(order),
        `A small reminder about the payment for order ${ref(order)}.`,
        `Amount due: ${money(due)}${order.paymentMethod ? ` (${METHOD_LABEL[order.paymentMethod] || order.paymentMethod})` : ''}.`,
        '',
        sign,
      ]);
    },
  },
  {
    id: 'cancelled',
    label: 'Order cancelled',
    hint: 'Tell the customer the order is cancelled.',
    build: ({ order }) =>
      join([hello(order), `Your order ${ref(order)} has been cancelled.`, 'You are welcome to place a new order any time.', '', sign]),
  },
  {
    id: 'custom',
    label: 'Write my own',
    hint: 'Start from a blank message.',
    build: ({ order }) => `${hello(order)}\n\n\n${sign}`,
  },
];

export const templateById = (id) => TEMPLATES.find((template) => template.id === id) || TEMPLATES[0];

// The template that fits the order best right now.
export function suggestTemplate(order) {
  if (!order?.isConfirmed && !['cancelled', 'returned'].includes(normalizeStatus(order?.status))) return 'confirmation';
  return (
    {
      pending: 'received',
      processing: 'latest_update',
      packed: 'packed',
      dispatched: 'dispatched',
      delivered: 'delivered',
      cancelled: 'cancelled',
      returned: 'latest_update',
    }[normalizeStatus(order?.status)] || 'latest_update'
  );
}