import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, X } from 'lucide-react';

import reviewService, { MAX_REVIEW_IMAGES } from '../../../lib/appwrite/review';
import useScrollLock from '../../../ui/custom/motion/useScrollLock';
import { StarPicker } from './ReviewStars';

// "Write a review" dialog.
//
// USAGE
//   <ReviewFormModal open={open} product={product} profile={profile}
//                    onClose={() => setOpen(false)} onSubmitted={(review) => ...} />
//
// profile = the signed-in customer's profile row (createReview reads $id, username, name,
// avatarFileId, isBlocked). The service decides the status: "approved" for a trusted customer,
// "pending" otherwise. This dialog only tells the customer which one happened.

const MAX_MESSAGE = 2000;
const MAX_TITLE = 150;
const MAX_FILE_MB = 8;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const FIELD =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60';

export default function ReviewFormModal({ open, product, profile, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const dialogRef = useRef(null);
  const fileInput = useRef(null);

  useScrollLock(open);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  // fresh form every time it opens
  useEffect(() => {
    if (!open) return;
    setRating(0);
    setTitle('');
    setMessage('');
    setFiles([]);
    setBusy(false);
    setError('');
    setDone(null);
  }, [open]);

  // lock page scroll, Esc closes, Tab stays inside the dialog
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    window.requestAnimationFrame(() => dialogRef.current?.focus());

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const pickFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;
    const images = picked.filter((f) => f.type.startsWith('image/'));
    const compressible = images.filter((f) => ACCEPTED_IMAGE_TYPES.has(f.type));
    const small = compressible.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    if (images.length < picked.length) setError('Only image files can be added.');
    else if (compressible.length < images.length) setError('Use JPEG, PNG, or WebP photos.');
    else if (small.length < compressible.length) setError(`Each photo must be under ${MAX_FILE_MB} MB.`);
    else setError('');
    setFiles((current) => [...current, ...small].slice(0, MAX_REVIEW_IMAGES));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!rating) return setError('Please choose a star rating.');
    if (message.trim().length < 5) return setError('Please write a few words about the product.');

    setBusy(true);
    setError('');
    const review = await reviewService.createReview({ profile, product, rating, title, message, files });
    setBusy(false);
    if (!review) return setError(reviewService.lastError || 'Could not send your review. Please try again.');
    setDone(review);
    onSubmitted?.(review);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => !busy && onClose()} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-form-title"
        tabIndex={-1}
        className="animate-rise relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-bg shadow-soft outline-none sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="review-form-title" className="font-heading text-xl font-bold text-text">
              {done ? 'Thank you' : 'Write a review'}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">{product?.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:border-accent/60 hover:text-accent disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 overflow-y-auto px-6 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-success/15 text-success">
              <Check size={28} aria-hidden="true" />
            </span>
            <p className="font-heading text-lg font-semibold text-text">
              {done.status === 'approved' ? 'Your review is now live' : 'Your review is on its way'}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              {done.status === 'approved'
                ? 'It is already visible to other shoppers on this page.'
                : 'The store will check it first. It will appear on this page as soon as it is approved.'}
            </p>
            <button type="button" onClick={onClose} className="mt-3 rounded-xl bg-brown px-6 py-2.5 text-sm font-semibold text-on-brown transition hover:bg-brown-hover">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div>
                <p className="mb-2 text-sm font-medium text-text">Your rating</p>
                <StarPicker value={rating} onChange={setRating} disabled={busy} />
              </div>

              <div>
                <label htmlFor="review-title" className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-text">
                  Title <span className="text-xs font-normal text-muted">optional</span>
                </label>
                <input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                  disabled={busy}
                  placeholder="Sum it up in a few words"
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="review-message" className="mb-1.5 block text-sm font-medium text-text">
                  Your review
                </label>
                <textarea
                  id="review-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                  disabled={busy}
                  rows={5}
                  placeholder="How are the fabric, stitching and fit? Would you buy it again?"
                  className={`${FIELD} resize-none leading-relaxed`}
                />
                <p className="mt-1 text-right text-xs tabular-nums text-muted">
                  {message.length}/{MAX_MESSAGE}
                </p>
              </div>

              <div>
                <p className="mb-2 flex items-baseline justify-between text-sm font-medium text-text">
                  Photos <span className="text-xs font-normal text-muted">up to {MAX_REVIEW_IMAGES}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {previews.map((src, i) => (
                    <div key={src} className="relative size-20 overflow-hidden rounded-xl border border-border">
                      <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFiles((current) => current.filter((_, idx) => idx !== i))}
                        disabled={busy}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-text text-bg transition hover:scale-110"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_REVIEW_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      disabled={busy}
                      className="grid size-20 place-items-center rounded-xl border border-dashed border-thread bg-surface text-muted transition hover:border-accent hover:text-accent"
                    >
                      <span className="flex flex-col items-center gap-1 text-xs font-medium">
                        <ImagePlus size={20} aria-hidden="true" />
                        Add
                      </span>
                    </button>
                  )}
                </div>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={pickFiles} />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-error/30 bg-error/5 px-3.5 py-2.5 text-sm text-error">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-surface px-5 py-3.5 sm:px-6">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent/60 hover:text-accent disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-xl bg-brown px-5 py-2.5 text-sm font-semibold text-on-brown transition hover:bg-brown-hover disabled:cursor-wait disabled:opacity-70">
                {busy ? 'Sending…' : 'Submit review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}