import { useMemo, useState } from 'react';
import { BadgeCheck, Check, Reply, Trash2, X } from 'lucide-react';

import reviewService from '../../../lib/appwrite/review';
import { Stars, StatusBadge } from './parts';
import { STATUS_META, prettyDate } from './helpers';

const ACTION =
  'group inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text transition-all duration-200 hover:-translate-y-px hover:border-[var(--op)] hover:text-[var(--op)] active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-50';
const MAX_REPLY = 1000;

// One review with its moderation actions.
// onApprove(review) / onReject(review) / onDelete(review) are fire-and-forget.
// onReply(review, text) must return a promise that resolves true when saved ('' removes the reply).
export default function ReviewCard({ review, busy, index = 0, onApprove, onReject, onReply, onDelete }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(review.adminReply || '');
  const [saving, setSaving] = useState(false);

  const images = useMemo(() => reviewService.getImageUrls(review), [review]);
  const avatar = useMemo(() => reviewService.getImageUrl(review.reviewerAvatarId), [review.reviewerAvatarId]);
  const name = review.reviewerName || review.username || 'Customer';
  const tone = STATUS_META[review.status]?.tone ?? 3;

  const openReply = () => {
    setText(review.adminReply || '');
    setReplying(true);
  };

  const saveReply = async (value) => {
    setSaving(true);
    const ok = await onReply(review, value.trim());
    setSaving(false);
    if (ok) setReplying(false);
  };

  return (
    <article
      style={{ borderLeftColor: `var(--graph-${tone})`, animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="animate-rise rounded-2xl border border-l-4 border-border bg-surface p-4 shadow-soft sm:p-5"
    >
      {/* who + status */}
      <div className="flex items-start gap-3">
        {avatar ? (
          <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full border border-border object-cover" />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-alt text-sm font-semibold uppercase text-muted">{name.charAt(0)}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold text-text">{name}</p>
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-graph-7" title="Bought this product">
                <BadgeCheck size={14} /> Verified
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted">
            {review.username ? `@${review.username} · ` : ''}
            {prettyDate(review.$createdAt)}
          </p>
        </div>
        <StatusBadge status={review.status} />
      </div>

      {/* rating + text */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} />
        {review.title && <p className="font-semibold text-text">{review.title}</p>}
      </div>
      <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-text">{review.message}</p>

      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border transition-transform duration-200 hover:scale-105">
              <img src={src} alt="Review photo" loading="lazy" className="h-16 w-16 object-cover" />
            </a>
          ))}
        </div>
      )}

      {review.productName && (
        <p className="mt-3 text-xs text-muted">
          On{' '}
          {review.productSlug ? (
            <a href={`/${review.productSlug}`} target="_blank" rel="noreferrer" className="font-medium text-text underline-offset-2 hover:text-graph-1 hover:underline">
              {review.productName}
            </a>
          ) : (
            <span className="font-medium text-text">{review.productName}</span>
          )}
        </p>
      )}

      {/* current reply */}
      {review.adminReply && !replying && (
        <div className="mt-3 rounded-xl border border-border bg-surface-alt p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Your reply{review.repliedAt ? ` · ${prettyDate(review.repliedAt)}` : ''}
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-text">{review.adminReply}</p>
        </div>
      )}

      {/* reply editor */}
      {replying && (
        <div className="mt-3 animate-rise space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_REPLY))}
            rows={3}
            autoFocus
            placeholder="Write a public reply to this customer…"
            aria-label="Reply to review"
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted transition-colors duration-200 focus:border-graph-1 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-muted">
              {text.length}/{MAX_REPLY}
            </span>
            <div className="flex flex-wrap gap-2">
              {review.adminReply && (
                <button type="button" onClick={() => saveReply('')} disabled={saving} style={{ '--op': 'var(--graph-4)' }} className={ACTION}>
                  Remove reply
                </button>
              )}
              <button type="button" onClick={() => setReplying(false)} disabled={saving} style={{ '--op': 'var(--graph-2)' }} className={ACTION}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveReply(text)}
                disabled={saving || !text.trim()}
                style={{ '--op': 'var(--graph-1)' }}
                className={ACTION}
              >
                {saving ? 'Saving…' : 'Save reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {review.status !== 'approved' && (
          <button
            type="button"
            onClick={() => onApprove(review)}
            disabled={busy}
            title="Make it public and update the product's rating"
            style={{ '--op': 'var(--graph-7)' }}
            className={ACTION}
          >
            <Check size={16} className="transition-transform duration-300 group-hover:scale-110" /> Approve
          </button>
        )}
        {review.status !== 'rejected' && (
          <button type="button" onClick={() => onReject(review)} disabled={busy} title="Hide it from the shop" style={{ '--op': 'var(--graph-4)' }} className={ACTION}>
            <X size={16} className="transition-transform duration-300 group-hover:rotate-90" /> Reject
          </button>
        )}
        {!replying && (
          <button type="button" onClick={openReply} disabled={busy} style={{ '--op': 'var(--graph-1)' }} className={ACTION}>
            <Reply size={16} className="transition-transform duration-300 group-hover:-rotate-6" />
            {review.adminReply ? 'Edit reply' : 'Reply'}
          </button>
        )}
        <button type="button" onClick={() => onDelete(review)} disabled={busy} style={{ '--op': 'var(--graph-4)' }} className={`${ACTION} ml-auto`}>
          <Trash2 size={16} className="transition-transform duration-300 group-hover:-rotate-6" /> Delete
        </button>
      </div>
    </article>
  );
}