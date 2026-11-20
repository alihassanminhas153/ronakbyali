import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard } from 'lucide-react';

import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  deleteLatestOrderDetail,
  clearStaffWarning,
  clearTrackerError,
  fetchStaffCustomOrders,
  fetchTracker,
  orderItemKey,
  parseOrderItems,
  postOrderDetail,
  rejectOrderReturn,
  selectCustomOrderForOrder,
  selectStaffOrderById,
  selectStaffCustomOrdersUpdateError,
  selectStaffUpdateError,
  selectStaffWarning,
  selectTrackerByOrder,
  selectTrackerError,
  setOrderAdminNotes,
  setOrderTracking,
  setTrackerLink,
  updateOrderFields,
  updateOrderConfirmation,
  updateOrderPayment,
  updateOrderStatus,
  updateStaffCustomOrder,
} from '../../../store/slices/ordersSlice';
import { editableKeysFor } from '../../../lib/appwrite/order';
import customOrderService from '../../../lib/appwrite/customOrder';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import SelectInput from '../../../ui/custom/input/SelectInput';
import TextInput from '../../../ui/custom/input/TextInput';
import { buildWhatsAppUrl } from '../../../lib/phone';

import { DrawerShell, Field, ReadValue, Section, inputCls } from './FormParts';
import { DeliveryChip } from './OrderBadges';
import OrderTracker from './OrderTracker';
import { METHOD_LABEL, PAYMENT_META, STATUS_META, fullDate, money } from './orderMeta';

const STATUS_CHOICES = ORDER_STATUS.map((v) => ({ value: v, label: STATUS_META[v].label, tone: STATUS_META[v].tone }));
const CONFIRMATION_CHOICES = [
  { value: 'false', label: 'Not confirmed' },
  { value: 'true', label: 'Confirmed' },
];
const PAYMENT_CHOICES = PAYMENT_STATUS.map((v) => ({ value: v, label: PAYMENT_META[v].label, tone: PAYMENT_META[v].tone }));
const METHOD_CHOICES = PAYMENT_METHODS.map((v) => ({ value: v, label: METHOD_LABEL[v], tone: 1 }));
const CUSTOM_STATUS_CHOICES = [
  { value: 'requested', label: 'Requested' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'cancelled', label: 'Cancelled' },
];
const CONTACT_CHOICES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
];

const customerWhatsAppUrl = (phone) => buildWhatsAppUrl(phone);

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

const fromOrder = (o) => ({
  customerName: o?.customerName || '',
  customerPhone: o?.customerPhone || '',
  customerEmail: o?.customerEmail || '',
  city: o?.city || '',
  address: o?.address || '',
  paymentMethod: o?.paymentMethod || 'cod',
  deliveryTime: o?.deliveryTime || '',
  estimatedDelivery: toLocal(o?.estimatedDelivery),
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
  const confirmedBy = useSelector((state) => state.auth.profile?.$id);
  const order = useSelector(selectStaffOrderById(orderId));
  const customOrder = useSelector(selectCustomOrderForOrder(orderId));
  const tracker = useSelector(selectTrackerByOrder(orderId));
  const updateError = useSelector(selectStaffUpdateError);
  const customUpdateError = useSelector(selectStaffCustomOrdersUpdateError);
  const warning = useSelector(selectStaffWarning);
  const trackerError = useSelector(selectTrackerError);

  const [form, setForm] = useState(() => fromOrder(order));
  const base = useRef(fromOrder(order));
  const [nextStatus, setNextStatus] = useState(order?.status || 'placed');
  const [nextConfirmation, setNextConfirmation] = useState(order?.isConfirmed ? 'true' : 'false');
  const [nextPayment, setNextPayment] = useState(order?.paymentStatus || 'unpaid');
  const [trackingId, setTrackingId] = useState(order?.trackingId || '');
  const [link, setLink] = useState('');
  const [adminNotes, setAdminNotes] = useState(order?.adminNotes || '');
  const [detailDraft, setDetailDraft] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteDetailOpen, setDeleteDetailOpen] = useState(false);
  const [customStatus, setCustomStatus] = useState('requested');
  const [customContactMethod, setCustomContactMethod] = useState('');
  const [customQuotedTotal, setCustomQuotedTotal] = useState('');
  const [customAdminNotes, setCustomAdminNotes] = useState('');
  const [busy, setBusy] = useState(''); // which button is working
  const [flash, setFlash] = useState('');

  useEffect(() => {
    dispatch(clearStaffWarning());
    dispatch(clearTrackerError());
    if (orderId) {
      dispatch(fetchTracker({ orderId }));
      if (order?.isCustom) dispatch(fetchStaffCustomOrders({ orderId }));
    }
  }, [dispatch, orderId, order?.isCustom]);

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
    setNextStatus(order?.status || 'placed');
    setNextConfirmation(order?.isConfirmed ? 'true' : 'false');
    setNextPayment(order?.paymentStatus || 'unpaid');
  }, [order?.status, order?.isConfirmed, order?.paymentStatus]);
  useEffect(() => { setTrackingId(order?.trackingId || ''); }, [order?.trackingId]);
  useEffect(() => { setAdminNotes(order?.adminNotes || ''); }, [order?.adminNotes]);
  useEffect(() => { setLink(tracker?.link || ''); }, [tracker?.link]);
  useEffect(() => {
    if (!customOrder) return;
    setCustomStatus(customOrder.status || 'requested');
    setCustomContactMethod(customOrder.contactMethod || '');
    setCustomQuotedTotal(customOrder.quotedTotal == null ? '' : String(customOrder.quotedTotal));
    setCustomAdminNotes(customOrder.adminNotes || '');
  }, [customOrder]);

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
    const ok = await run('status', updateOrderStatus({
      orderId,
      status: nextStatus,
    }), 'Status updated');
    if (ok) setConfirmOpen(false);
  };
  const onStatusClick = () => {
    if (CONFIRM_STATUSES.includes(nextStatus)) setConfirmOpen(true);
    else saveStatus();
  };

  const saveCustomStatus = async () => {
    if (!customOrder) return;
    const mapped = { in_progress: 'processing', ready: 'shipped', cancelled: 'cancelled' }[customStatus];
    if (mapped && mapped !== order.status) {
      setNextStatus(mapped);
      if (mapped === 'cancelled') setConfirmOpen(true);
      else await run('custom-status', updateOrderStatus({ orderId, status: mapped }), 'Custom request status updated');
      return;
    }
    await run('custom-status', updateStaffCustomOrder({ rowId: customOrder.$id, patch: { status: customStatus } }), 'Custom request status updated');
  };

  const saveCustomDetails = async () => {
    if (!customOrder) return;
    await run('custom-details', updateStaffCustomOrder({
      rowId: customOrder.$id,
      patch: {
        contactMethod: customContactMethod || null,
        quotedTotal: customQuotedTotal,
        adminNotes: customAdminNotes,
      },
    }), 'Custom request details saved');
  };

  const markContacted = async () => {
    if (!customOrder) return;
    await run('contacted', updateStaffCustomOrder({
      rowId: customOrder.$id,
      patch: { status: 'contacted', contactedAt: new Date().toISOString() },
    }), 'Customer marked as contacted');
  };

  const savePayment = () => run('payment', updateOrderPayment({ orderId, paymentStatus: nextPayment }), 'Payment updated');
  const saveConfirmation = () => run('confirmation', updateOrderConfirmation({
    orderId,
    isConfirmed: nextConfirmation === 'true',
    confirmedBy,
  }), 'Confirmation updated');

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

  const postDetail = async () => {
    if (await run('detail', postOrderDetail({ orderId, detail: detailDraft }), 'Customer update posted')) {
      setDetailDraft('');
    }
  };
  const deleteDetail = async () => {
    if (await run('delete-detail', deleteLatestOrderDetail({ orderId }), 'Latest update deleted')) {
      setDeleteDetailOpen(false);
    }
  };

  // A field the order's status still allows is an input, otherwise plain text.
  const field = (key, label, { optional, area, type = 'text', className = '' } = {}) =>
    allowed.includes(key) ? (
      <Field key={key} label={label} optional={optional} className={className}>
        {area ? (
          <textarea value={form[key]} onChange={set(key)} rows={3} className={`${inputCls()} resize-none py-2`} />
        ) : (
          <input type={type} value={form[key]} onChange={set(key)} className={inputCls()} />
        )}
      </Field>
    ) : (
      <ReadValue key={key} label={label} className={className}>{order[key] || '—'}</ReadValue>
    );

  const problem = updateError || customUpdateError || trackerError;
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
        {order.isCustom && (
          <Section title="Custom request" subtitle="Manage customer contact and the quote" appIcon="single_box" tone={6}>
            {customOrder ? (
              <>
                <Field label="Request status" className="sm:col-span-2">
                  <SelectInput value={customStatus} onChange={setCustomStatus} options={CUSTOM_STATUS_CHOICES} size="md" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn primary busy={busy === 'custom-status' || busy === 'status'} onClick={saveCustomStatus}>Save status</Btn>
                    <Btn busy={busy === 'contacted'} onClick={markContacted}>Contacted</Btn>
                    {customerWhatsAppUrl(order.customerPhone) && (
                      <a
                        href={customerWhatsAppUrl(order.customerPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost min-h-10 px-4 py-2 text-sm"
                      >
                        Open WhatsApp
                      </a>
                    )}
                  </div>
                  {customOrder.contactedAt && <p className="mt-2 text-xs text-muted">Contacted {fullDate(customOrder.contactedAt)}</p>}
                </Field>
                <Field label="Contact method">
                  <SelectInput value={customContactMethod} onChange={setCustomContactMethod} options={CONTACT_CHOICES} placeholder="Choose a method" clearable size="md" />
                </Field>
                <TextInput label="Quoted total (Rs)" type="number" min="0" value={customQuotedTotal} onChange={(event) => setCustomQuotedTotal(event.target.value)} />
                <Field label="Admin notes" className="sm:col-span-2">
                  <textarea value={customAdminNotes} onChange={(event) => setCustomAdminNotes(event.target.value)} maxLength={2000} rows={3} className={`${inputCls()} resize-none py-2`} />
                </Field>
                <div className="sm:col-span-2">
                  <Btn primary busy={busy === 'custom-details'} onClick={saveCustomDetails}>Save custom request details</Btn>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted sm:col-span-2">Loading the custom request…</p>
            )}
          </Section>
        )}

        <Section title="Status and payment" subtitle="Delivery status and order confirmation are managed separately" appIcon="donut_chart" tone={1}>
          {order.returnRequestStatus === 'requested' && (
            <div className="space-y-2 rounded-md border border-warning/30 bg-warning/5 p-3 sm:col-span-2">
              <p className="text-sm font-medium text-text">Customer requested a return{order.returnRequestedAt ? ` · ${fullDate(order.returnRequestedAt)}` : ''}</p>
              {order.returnRequestNote && <p className="whitespace-pre-wrap text-sm text-muted">{order.returnRequestNote}</p>}
              <div className="flex flex-wrap gap-2">
                <Btn primary busy={busy === 'status'} onClick={() => { setNextStatus('returned'); setConfirmOpen(true); }}>Approve and mark returned</Btn>
                <Btn busy={busy === 'return-request'} onClick={() => run('return-request', rejectOrderReturn({ orderId }), 'Return request declined')}>Decline request</Btn>
              </div>
            </div>
          )}
          <Field label="Order status" className="sm:col-span-2">
            <SelectInput aria-label="Order status" value={nextStatus} onChange={setNextStatus} options={STATUS_CHOICES} size="md" />
            {statusDirty && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Btn primary busy={busy === 'status'} disabled={nextStatus === 'returned' && order.returnRequestStatus !== 'requested'} onClick={onStatusClick}>
                  Set as {STATUS_META[nextStatus]?.label}
                </Btn>
                <Btn onClick={() => setNextStatus(order.status)}>Undo</Btn>
              </div>
            )}
            <p className="mt-2 text-xs text-muted">
              Stock is deducted when shipped and restored after an approved return. A delivered cash on delivery order is marked paid.
            </p>
          </Field>
          <Field label="Order confirmation" className="sm:col-span-2">
            <SelectInput
              aria-label="Order confirmation"
              value={nextConfirmation}
              onChange={setNextConfirmation}
              options={CONFIRMATION_CHOICES}
              size="md"
            />
            {nextConfirmation !== (order.isConfirmed ? 'true' : 'false') && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Btn primary busy={busy === 'confirmation'} onClick={saveConfirmation}>
                  Set as {nextConfirmation === 'true' ? 'confirmed' : 'not confirmed'}
                </Btn>
                <Btn onClick={() => setNextConfirmation(order.isConfirmed ? 'true' : 'false')}>Undo</Btn>
              </div>
            )}
            {order.confirmedAt && <p className="mt-2 text-xs text-muted">Confirmed {fullDate(order.confirmedAt)}</p>}
          </Field>
          <Field label="Payment" className="sm:col-span-2">
            <SelectInput aria-label="Payment status" value={nextPayment} onChange={setNextPayment} options={PAYMENT_CHOICES} size="md" />
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
        <Section title="Tracking" subtitle="This is what the customer sees" appIcon="truck" tone={2} delay={60}>
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

          <div className="sm:col-span-2">
            <OrderTracker order={order} tracker={tracker} loading={!tracker && !trackerError} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <TextInput
              label="Customer-visible tracking update"
              value={detailDraft}
              onChange={(event) => setDetailDraft(event.target.value)}
              maxLength={300}
              showCount
              hint="This is appended to the tracking timeline and shown to the customer."
            />
            <Btn primary busy={busy === 'detail'} disabled={!detailDraft.trim()} onClick={postDetail}>Post customer update</Btn>
            {tracker?.updates?.[0]?.kind === 'detail' && (
              <button type="button" onClick={() => setDeleteDetailOpen(true)} className="ml-2 text-sm text-error underline">
                Delete latest update
              </button>
            )}
          </div>
        </Section>

        {/* 3. customer + delivery (what is open depends on the status) */}
        <Section
          title="Customer and delivery"
          subtitle={lock === 'Read only' ? 'This order is closed' : lock ? 'Shipped: only the address can change' : 'Open until the order ships'}
          appIcon="customers"
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
              <SelectInput
                aria-label="Payment method"
                value={form.paymentMethod}
                onChange={(paymentMethod) => setForm((f) => ({ ...f, paymentMethod }))}
                options={METHOD_CHOICES}
                size="md"
              />
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
        <Section title="Items and amounts" subtitle="Cannot be edited here" appIcon="single_box" tone={5} lockLabel="Read only" delay={180}>
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
          {order.isCustom && (
            <div className="space-y-3 rounded-md border border-accent-tone-6/30 bg-accent-tone-6/5 p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-tone-6">Custom order</p>
              <p className="whitespace-pre-line text-sm text-text">{order.customDetails || 'No customization details provided.'}</p>
              {customOrderService.parseSelections(order).length > 0 && (
                <ul className="space-y-1">
                  {customOrderService.parseSelections(order).map((selection) => (
                    <li key={selection.id} className="flex justify-between gap-3 text-sm text-muted"><span>{selection.label}</span><span>{money(selection.price)}</span></li>
                  ))}
                </ul>
              )}
              {customOrder?.referenceFileIds?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customOrderService.getReferenceUrls(customOrder.referenceFileIds).map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Customer reference" loading="lazy" className="size-24 rounded-md border border-border object-cover" /></a>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted">The team will contact the customer to confirm the details.</p>
            </div>
          )}
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
        <Section title="Admin notes" subtitle="Only staff can see these" appIcon="disclaimer" tone={8} delay={240}>
          <div className="space-y-3 sm:col-span-2">
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-label="Admin notes"
              placeholder="Anything the team should know about this order"
              className={`${inputCls()} resize-none py-2`}
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
            ? 'Only an unconfirmed processing order can be cancelled.'
            : nextStatus === 'returned'
              ? 'This completes the customer’s return request and restores the items to stock.'
              : 'Update the order status?'
        }
        confirmLabel={`Mark ${STATUS_META[nextStatus]?.label.toLowerCase()}`}
        onConfirm={() => saveStatus()}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={deleteDetailOpen}
        danger
        busy={busy === 'delete-detail'}
        title="Delete the latest customer update?"
        message="The customer will no longer see this update. The previous order detail will become current."
        confirmLabel="Delete update"
        onConfirm={deleteDetail}
        onCancel={() => setDeleteDetailOpen(false)}
      />
    </>
  );
}