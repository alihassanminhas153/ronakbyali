import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, CreditCard, ListChecks, ReceiptText, StickyNote, Truck, UserRound } from 'lucide-react';

import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  addTrackerUpdate,
  clearStaffWarning,
  clearTrackerError,
  fetchTracker,
  orderItemKey,
  parseOrderItems,
  selectStaffOrderById,
  selectStaffUpdateError,
  selectStaffWarning,
  selectTrackerByOrder,
  selectTrackerError,
  setOrderAdminNotes,
  setOrderTracking,
  setTrackerLink,
  updateOrderFields,
  updateOrderPayment,
  updateOrderStatus,
} from '../../../store/slices/ordersSlice';
import { editableKeysFor } from '../../../lib/appwrite/order';
import { UPDATE_PRESETS } from '../../../lib/appwrite/tracker';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import { tint } from '../../../ui/graphs/utils';

import { DrawerShell, Field, ReadValue, Section, inputCls } from './FormParts';
import { DeliveryChip } from './OrderBadges';
import OrderTracker from './OrderTracker';
import { METHOD_LABEL, PAYMENT_META, STATUS_META, fullDate, money, toneColor } from './orderMeta';

const STATUS_CHOICES = ORDER_STATUS.map((v) => ({ value: v, label: STATUS_META[v].label, tone: STATUS_META[v].tone }));
const PAYMENT_CHOICES = PAYMENT_STATUS.map((v) => ({ value: v, label: PAYMENT_META[v].label, tone: PAYMENT_META[v].tone }));
const METHOD_CHOICES = PAYMENT_METHODS.map((v) => ({ value: v, label: METHOD_LABEL[v], tone: 1 }));

// cancelled / returned change stock and the customer's totals, so they ask first
const CONFIRM_STATUSES = ['cancelled', 'returned'];

const FIELDS = ['customerName', 'customerPhone', 'customerEmail', 'city', 'address', 'paymentMethod', 'deliveryTime', 'estimatedDelivery'];

// ISO -> value of <input type="datetime-local">
const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fromOrder = (o = {}) => ({
  customerName: o.customerName || '',
  customerPhone: o.customerPhone || '',
  customerEmail: o.customerEmail || '',
  city: o.city || '',
  address: o.address || '',
  paymentMethod: o.paymentMethod || 'cod',
  deliveryTime: o.deliveryTime || '',
  estimatedDelivery: toLocal(o.estimatedDelivery),
});

// Plain buttons (global .btn classes), so nothing depends on another component's props.
function Btn({ children, onClick, disabled, busy, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`btn ${primary ? 'btn-primary' : 'btn-ghost'} min-h-10 px-4 py-2 text-sm disabled:opacity-50`}
    >
      {busy ? 'Saving…' : children}
    </button>
  );
}

// Tap-to-choose pills. Always visible, no dropdown, so there is nothing to see through.
function Choice({ options, value, current, onChange }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        const color = toneColor(o.tone);
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            style={on ? { background: tint(color, 16), borderColor: color, color } : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              on ? '' : 'border-border bg-surface text-muted hover:border-accent-tone-1/50 hover:text-text'
            }`}
          >
            {on && <Check size={13} aria-hidden="true" />}
            {o.label}
            {current && o.value === current && <span className="text-[11px] font-normal opacity-70">(now)</span>}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${strong ? 'font-semibold' : 'text-muted'}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums text-text">{value}</dd>
    </div>
  );
}

// Admin > Orders > one order (right-hand drawer)
//   orders table : status, payment status, customer details, tracking number, admin notes
//   tracker table: courier link + timeline steps
// Every section has its own button. The result of the last action (saved or the
// error) is always shown in the footer, so it is never hidden below the fold.
export default function OrderForm({ open, orderId, onClose }) {
  const dispatch = useDispatch();
  const order = useSelector(selectStaffOrderById(orderId));
  const tracker = useSelector(selectTrackerByOrder(orderId));
  const updateError = useSelector(selectStaffUpdateError);
  const warning = useSelector(selectStaffWarning);
  const trackerError = useSelector(selectTrackerError);

  const [form, setForm] = useState(() => fromOrder(order));
  const base = useRef(fromOrder(order));
  const [nextStatus, setNextStatus] = useState(order?.status || 'pending');
  const [nextPayment, setNextPayment] = useState(order?.paymentStatus || 'unpaid');
  const [trackingId, setTrackingId] = useState(order?.trackingId || '');
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [adminNotes, setAdminNotes] = useState(order?.adminNotes || '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(''); // which button is working
  const [flash, setFlash] = useState('');

  useEffect(() => {
    dispatch(clearStaffWarning());
    dispatch(clearTrackerError());
    if (orderId) dispatch(fetchTracker({ orderId }));
  }, [dispatch, orderId]);

  // After a save the row changes: take the new values, but keep what is still being typed.
  useEffect(() => {
    if (!order) return;
    const next = fromOrder(order);
    setForm((f) => {
      const out = { ...next };
      FIELDS.forEach((k) => {
        if (f[k] !== base.current[k]) out[k] = f[k];
      });
      return out;
    });
    base.current = next;
  }, [order?.$updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setNextStatus(order?.status || 'pending');
    setNextPayment(order?.paymentStatus || 'unpaid');
  }, [order?.status, order?.paymentStatus]);
  useEffect(() => { setTrackingId(order?.trackingId || ''); }, [order?.trackingId]);
  useEffect(() => { setAdminNotes(order?.adminNotes || ''); }, [order?.adminNotes]);
  useEffect(() => { setLink(tracker?.link || ''); }, [tracker?.link]);

  if (!order) return null;

  const allowed = editableKeysFor(order.status);
  const changed = FIELDS.filter((k) => allowed.includes(k) && form[k] !== base.current[k]);
  const lock = allowed.includes('customerName') ? '' : allowed.includes('address') ? 'Address only' : 'Read only';
  const items = parseOrderItems(order);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Runs one thunk. Failures land in the store and show in the footer.
  const run = async (key, action, done) => {
    setBusy(key);
    setFlash('');
    try {
      await dispatch(action).unwrap();
      setFlash(done);
      return true;
    } catch {
      return false;
    } finally {
      setBusy('');
    }
  };

  const saveStatus = async () => {
    const ok = await run('status', updateOrderStatus({ orderId, status: nextStatus }), 'Status updated');
    if (ok) setConfirmOpen(false);
  };
  const onStatusClick = () => (CONFIRM_STATUSES.includes(nextStatus) ? setConfirmOpen(true) : saveStatus());

  const savePayment = () => run('payment', updateOrderPayment({ orderId, paymentStatus: nextPayment }), 'Payment updated');

  const saveDetails = () => {
    const data = {};
    changed.forEach((k) => { data[k] = form[k]; });
    run('details', updateOrderFields({ orderId, data }), 'Details saved');
  };

  const trackingDirty = trackingId.trim() !== (order.trackingId || '');
  const linkDirty = link.trim() !== (tracker?.link || '');
  const saveTracking = async () => {
    if (trackingDirty && !(await run('tracking', setOrderTracking({ orderId, trackingId: trackingId.trim() }), 'Tracking saved'))) return;
    if (linkDirty) await run('tracking', setTrackerLink({ orderId, link }), 'Tracking saved');
  };

  const addUpdate = async () => {
    if (await run('step', addTrackerUpdate({ orderId, title, note }), 'Step added to the timeline')) {
      setTitle('');
      setNote('');
    }
  };

  // A field the order's status still allows is an input, otherwise plain text.
  const field = (key, label, { optional, area, type = 'text', className = '' } = {}) =>
    allowed.includes(key) ? (
      <Field key={key} label={label} optional={optional} className={className}>
        {area ? (
          <textarea value={form[key]} onChange={set(key)} rows={3} className={`${inputCls()} resize-y py-2`} />
        ) : (
          <input type={type} value={form[key]} onChange={set(key)} className={inputCls()} />
        )}
      </Field>
    ) : (
      <ReadValue key={key} label={label} className={className}>{order[key] || '—'}</ReadValue>
    );

  const problem = updateError || trackerError;
  const statusDirty = nextStatus !== order.status;
  const paymentDirty = nextPayment !== order.paymentStatus;

  return (
    <>
      <DrawerShell
        open={open}
        onClose={onClose}
        label="Order details"
        title={<span className="tabular-nums">{order.orderNumber}</span>}
        headerExtra={
          <span className="text-xs font-normal text-muted">{STATUS_META[order.status]?.label}</span>
        }
        subtitle={`${order.customerName} · placed ${fullDate(order.$createdAt)}`}
        footer={
          <>
            <p
              role={problem ? 'alert' : undefined}
              aria-live="polite"
              className={`min-w-0 flex-1 text-xs ${problem ? 'text-error' : warning ? 'text-warning' : flash ? 'text-success' : 'text-muted'}`}
            >
              {problem || warning || flash || 'Each section has its own save button.'}
            </p>
            <Btn onClick={onClose}>Close</Btn>
          </>
        }
      >
        {/* 1. status + payment (orders table) */}
        <Section title="Status and payment" subtitle="Pick one, then confirm" icon={ListChecks} tone={1}>
          <Field label="Order status" className="sm:col-span-2">
            <Choice options={STATUS_CHOICES} value={nextStatus} current={order.status} onChange={setNextStatus} />
            {statusDirty && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Btn primary busy={busy === 'status'} onClick={onStatusClick}>
                  Set as {STATUS_META[nextStatus]?.label}
                </Btn>
                <Btn onClick={() => setNextStatus(order.status)}>Undo</Btn>
              </div>
            )}
            <p className="mt-2 text-xs text-muted">
              Shipped and delivered take the items off stock. A delivered cash on delivery order is marked paid.
            </p>
          </Field>
          <Field label="Payment" className="sm:col-span-2">
            <Choice options={PAYMENT_CHOICES} value={nextPayment} current={order.paymentStatus} onChange={setNextPayment} />
            {paymentDirty && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Btn primary busy={busy === 'payment'} onClick={savePayment}>
                  Set as {PAYMENT_META[nextPayment]?.label}
                </Btn>
                <Btn onClick={() => setNextPayment(order.paymentStatus)}>Undo</Btn>
              </div>
            )}
          </Field>
        </Section>

        {/* 2. tracking (tracking number in orders table, link + timeline in tracker table) */}
        <Section title="Tracking" subtitle="This is what the customer sees" icon={Truck} tone={2} delay={60}>
          <Field label="Courier tracking number" optional>
            <input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} maxLength={100} placeholder="e.g. 3012345678" className={inputCls()} />
          </Field>
          <Field label="Courier link" optional hint="TCS, Leopards…">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the tracking link" className={inputCls()} />
          </Field>
          <div className="sm:col-span-2">
            <Btn primary busy={busy === 'tracking'} disabled={!trackingDirty && !linkDirty} onClick={saveTracking}>
              Save tracking
            </Btn>
          </div>

          <Field label="Add a step to the timeline" className="sm:col-span-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {UPDATE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTitle(p)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    title === p ? 'border-accent-tone-2 bg-accent-tone-2/10 text-text' : 'border-border bg-surface text-muted hover:border-accent-tone-2/60 hover:text-text'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Title" aria-label="Step title" className={inputCls()} />
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note (optional)" aria-label="Step note" className={inputCls()} />
            </div>
            <div className="mt-3">
              <Btn busy={busy === 'step'} disabled={!title.trim()} onClick={addUpdate}>Add step</Btn>
            </div>
          </Field>

          <div className="sm:col-span-2">
            <OrderTracker order={order} tracker={tracker} loading={!tracker && !trackerError} />
          </div>
        </Section>

        {/* 3. customer + delivery (what is open depends on the status) */}
        <Section
          title="Customer and delivery"
          subtitle={lock === 'Read only' ? 'This order is closed' : lock ? 'Shipped: only the address can change' : 'Open until the order ships'}
          icon={UserRound}
          tone={3}
          lockLabel={lock}
          delay={120}
        >
          {field('customerName', 'Name')}
          {field('customerPhone', 'Phone')}
          {field('customerEmail', 'Email', { optional: true, type: 'email' })}
          {field('city', 'City')}
          {field('address', 'Address', { area: true, className: 'sm:col-span-2' })}
          {field('deliveryTime', 'Delivery time', { optional: true })}
          {allowed.includes('estimatedDelivery') ? (
            <Field label="Estimated delivery" optional>
              <input type="datetime-local" value={form.estimatedDelivery} onChange={set('estimatedDelivery')} className={inputCls()} />
            </Field>
          ) : (
            <ReadValue label="Estimated delivery">{order.estimatedDelivery ? fullDate(order.estimatedDelivery) : '—'}</ReadValue>
          )}
          <Field label="Payment method" className="sm:col-span-2">
            {allowed.includes('paymentMethod') ? (
              <Choice options={METHOD_CHOICES} value={form.paymentMethod} onChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))} />
            ) : (
              <p className="text-sm text-text">{METHOD_LABEL[order.paymentMethod] || '—'}</p>
            )}
          </Field>
          {order.notes && <ReadValue label="Customer's note" className="sm:col-span-2">{order.notes}</ReadValue>}
          {lock !== 'Read only' && (
            <div className="sm:col-span-2">
              <Btn primary busy={busy === 'details'} disabled={!changed.length} onClick={saveDetails}>Save details</Btn>
            </div>
          )}
        </Section>

        {/* 4. items (read only) */}
        <Section title="Items and amounts" subtitle="Cannot be edited here" icon={ReceiptText} tone={5} lockLabel="Read only" delay={180}>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface sm:col-span-2">
            {items.map((i) => (
              <li key={orderItemKey(i)} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{i.name || 'Product'}</p>
                  <p className="text-xs text-muted">{i.quantity} × {money(i.price)}{i.variant ? ` · ${i.variant}` : ''}</p>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-text">{money((Number(i.price) || 0) * (Number(i.quantity) || 0))}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 sm:col-span-2">
            <Row label="Subtotal" value={money(order.subtotal)} />
            <Row label="Delivery" value={money(order.deliveryCharges)} />
            {Number(order.discount) > 0 && <Row label="Discount" value={`− ${money(order.discount)}`} />}
            <div className="border-t border-border pt-2"><Row label="Total" value={money(order.total)} strong /></div>
            {Number(order.advanceAmount) > 0 && <Row label="Paid in advance" value={money(order.advanceAmount)} />}
            <Row label="To collect on delivery" value={money(order.codAmount)} />
          </dl>
          <div className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
            <CreditCard size={15} aria-hidden="true" /> <DeliveryChip type={order.deliveryType} />
          </div>
        </Section>

        {/* 5. internal notes */}
        <Section title="Admin notes" subtitle="Only staff can see these" icon={StickyNote} tone={8} delay={240}>
          <div className="space-y-3 sm:col-span-2">
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-label="Admin notes"
              placeholder="Anything the team should know about this order"
              className={`${inputCls()} resize-y py-2`}
            />
            <Btn
              primary
              busy={busy === 'notes'}
              disabled={adminNotes.trim() === (order.adminNotes || '')}
              onClick={() => run('notes', setOrderAdminNotes({ orderId, adminNotes: adminNotes.trim() }), 'Notes saved')}
            >
              Save notes
            </Btn>
          </div>
        </Section>
      </DrawerShell>

      <ConfirmDialog
        open={confirmOpen}
        danger
        busy={busy === 'status'}
        title={`Mark order as ${STATUS_META[nextStatus]?.label.toLowerCase()}?`}
        message={
          nextStatus === 'cancelled'
            ? 'If this order had shipped, the items go back on stock and the customer’s order totals drop.'
            : 'The items go back on stock and the customer’s order totals drop.'
        }
        confirmLabel={`Mark ${STATUS_META[nextStatus]?.label.toLowerCase()}`}
        onConfirm={saveStatus}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}