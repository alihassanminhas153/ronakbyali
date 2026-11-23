import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Copy, Mail, MessageCircle, RotateCcw, X } from 'lucide-react';

import { fetchTracker, selectTrackerByOrder } from '../../../store/slices/ordersSlice';
import { buildWhatsAppUrl } from '../../../lib/phone';
import { inputCls } from './FormParts';
import { ConfirmationBadge } from './OrderBadges';
import { TEMPLATES, confirmationUrl, suggestTemplate, templateById } from './messageTemplates';

// Admin > Orders > "Send message": a box in the middle of the screen. Staff pick a
// template, can edit the text, then send it on WhatsApp (or email), or copy it.
//   open    : boolean
//   order   : the order row
//   onClose : () => void
export default function SendMessageModal({ open, order, onClose }) {
  const dispatch = useDispatch();
  const orderId = order?.$id;
  const tracker = useSelector((state) => (orderId ? selectTrackerByOrder(orderId)(state) : null));

  const [templateId, setTemplateId] = useState(() => suggestTemplate(order));
  const [text, setText] = useState('');
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  // Latest timeline step + tracking link come from the tracker table.
  useEffect(() => {
    if (open && orderId) dispatch(fetchTracker({ orderId }));
  }, [dispatch, open, orderId]);

  // Pick the best template each time the box is opened.
  useEffect(() => {
    if (!open) return;
    setTemplateId(suggestTemplate(order));
    setEdited(false);
    setCopied(false);
  }, [open, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = useMemo(() => confirmationUrl(order), [order]);
  const template = templateById(templateId);

  // Rebuild the text when the template or the data changes, unless staff already typed their own edits.
  useEffect(() => {
    if (!open || !order || edited) return;
    setText(template.build({ order, tracker, link }));
  }, [open, order, tracker, link, template, edited]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !order) return null;

  const pick = (id) => {
    setTemplateId(id);
    setEdited(false);
    setCopied(false);
  };
  const whatsappUrl = text.trim() ? buildWhatsAppUrl(order.customerPhone, text) : null;
  const mailUrl =
    order.customerEmail && text.trim()
      ? `mailto:${order.customerEmail}?subject=${encodeURIComponent(`Your order ${order.orderNumber || ''}`.trim())}&body=${encodeURIComponent(text)}`
      : null;
  const missingLink = templateId === 'confirmation' && !link;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  const actionCls = 'btn min-h-10 gap-2 px-4 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6">
      <div onClick={() => onClose?.()} className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send a message to the customer"
        className="relative flex max-h-full w-full max-w-4xl animate-rise flex-col overflow-hidden rounded-xl border border-border bg-bg shadow-soft"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading flex flex-wrap items-center gap-3 text-text">
              Send message <ConfirmationBadge confirmed={order.isConfirmed} />
            </h2>
            <p className="truncate text-xs text-muted">
              {order.orderNumber} · {order.customerName} · {order.customerPhone}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-6 md:grid-cols-[16rem_1fr]">
          <div>
            <p className="mb-2 text-xs font-medium text-text">Which message?</p>
            <ul className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-1">
              {TEMPLATES.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pick(item.id)}
                    aria-pressed={item.id === templateId}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      item.id === templateId ? 'border-accent-tone-1 bg-accent-tone-1/10' : 'border-border bg-surface hover:border-accent-tone-1/50'
                    }`}
                  >
                    <span className="block text-sm font-medium text-text">{item.label}</span>
                    <span className="block text-xs text-muted">{item.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="message-text" className="text-xs font-medium text-text">Message (you can edit it)</label>
              {edited && (
                <button type="button" onClick={() => setEdited(false)} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
                  <RotateCcw size={12} aria-hidden="true" /> Reset to template
                </button>
              )}
            </div>
            <textarea
              id="message-text"
              value={text}
              onChange={(e) => { setText(e.target.value); setEdited(true); }}
              rows={12}
              className={`${inputCls()} min-h-[14rem] flex-1 resize-y py-2 leading-relaxed`}
            />
            {missingLink && (
              <p role="alert" className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                This customer has no username on the order, so a confirmation link cannot be made. The message asks them to reply instead.
              </p>
            )}
            {templateId === 'confirmation' && order.isConfirmed && (
              <p className="text-xs text-muted">This order is already confirmed. You can still resend the link.</p>
            )}
            {!whatsappUrl && order.customerPhone && text.trim() && (
              <p role="alert" className="text-xs text-error">The phone number is not valid for WhatsApp. You can still copy the message.</p>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-bg px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} className={`${actionCls} btn-ghost`}>Close</button>
          <button type="button" onClick={copy} disabled={!text.trim()} className={`${actionCls} btn-ghost disabled:opacity-50`}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {mailUrl && (
            <a href={mailUrl} className={`${actionCls} btn-ghost`}>
              <Mail size={15} aria-hidden="true" /> Email
            </a>
          )}
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${actionCls} btn-primary`}>
              <MessageCircle size={15} aria-hidden="true" /> Send on WhatsApp
            </a>
          ) : (
            <button type="button" disabled className={`${actionCls} btn-primary opacity-50`}>
              <MessageCircle size={15} aria-hidden="true" /> Send on WhatsApp
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}