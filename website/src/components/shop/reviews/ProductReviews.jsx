import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Clock, Info, PenLine, X } from 'lucide-react';

import reviewService from '../../../lib/appwrite/review';
import userService from '../../../lib/appwrite/user';
import { Stars } from './ReviewStars';
import ReviewFormModal from './ReviewFormModal';

// Reviews section of the product page.
//
// USAGE (Product.jsx)
//   <ProductReviews
//     key={product.$id}
//     product={product}
//     profile={account || authProfile}      // signed-in customer's profile row, or null for guests
//     onRequireLogin={() => navigate('/welcome-back')}
//     onSummary={(s) => ...}                // optional: { productId, average, total, counts }
//   />
//
// Only APPROVED reviews are listed (the service filters them). The numbers on the left are counted
// live from approved reviews, so they stay right even before an admin re-syncs the product row.

const PAGE = 8;
const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'highest', label: 'Highest rated' },
  { id: 'lowest', label: 'Lowest rated' },
];

const prettyDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const plural = (n) => `${n} ${n === 1 ? 'review' : 'reviews'}`;

function uniq(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    if (!r?.$id || seen.has(r.$id)) return false;
    seen.add(r.$id);
    return true;
  });
}

/* ---------- small pieces ---------- */

function ReviewAvatar({ review, name }) {
  const [avatar, setAvatar] = useState(() =>
    review.reviewerAvatarId ? userService.getAvatarUrl({ fileId: review.reviewerAvatarId }) : null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!avatar && review.userId) {
      userService.getProfile({ userId: review.userId }).then((profile) => {
        if (!active || !profile?.avatarFileId) return;
        setAvatar(userService.getAvatarUrl({ fileId: profile.avatarFileId }));
      });
    }
    return () => {
      active = false;
    };
  }, [avatar, review.userId]);

  if (avatar && !failed) {
    return <img src={avatar} alt="" loading="lazy" onError={() => setFailed(true)} className="size-11 shrink-0 rounded-full border border-border object-cover" />;
  }
  return (
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-accent-soft text-sm font-semibold uppercase text-accent">
      {name.charAt(0)}
    </span>
  );
}

function Lightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Review photo" onClick={onClose} className="fixed inset-0 z-[60] grid place-items-center bg-overlay p-4 backdrop-blur-sm">
      <button type="button" onClick={onClose} aria-label="Close photo" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-border bg-surface text-text transition hover:border-accent hover:text-accent">
        <X size={18} aria-hidden="true" />
      </button>
      <img src={src} alt="Review photo" onClick={(e) => e.stopPropagation()} className="animate-rise max-h-[88dvh] max-w-full rounded-2xl object-contain shadow-soft" />
    </div>
  );
}

function ReviewItem({ review, onZoom }) {
  const name = review.reviewerName || review.username || 'Customer';
  const images = useMemo(() => reviewService.getImageUrls(review), [review]);

  return (
    <article className="h-full rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <ReviewAvatar review={review} name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="truncate font-semibold text-text">{name}</p>
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                <BadgeCheck size={14} aria-hidden="true" /> Verified purchase
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {review.username ? `@${review.username}` : ''}
            {review.username && review.$createdAt ? ' · ' : ''}
            {prettyDate(review.$createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={Number(review.rating) || 0} size={16} />
        {review.title && <h3 className="font-semibold text-text">{review.title}</h3>}
      </div>

      {review.message && <p className="mt-2 max-w-prose whitespace-pre-line break-words text-sm leading-relaxed text-muted">{review.message}</p>}

      {images.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button key={src} type="button" onClick={() => onZoom(src)} aria-label={`View photo ${i + 1} of ${name}'s review`} className="overflow-hidden rounded-xl border border-border transition-transform duration-200 hover:scale-105">
              <img src={src} alt="" loading="lazy" className="size-16 object-cover sm:size-20" />
            </button>
          ))}
        </div>
      )}

      {review.adminReply && (
        <div className="mt-4 rounded-r-xl border-l-2 border-thread bg-surface-alt/60 py-2.5 pl-3.5 pr-3">
          <p className="text-xs font-semibold text-accent">Reply from Ronak By Ali</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-text">{review.adminReply}</p>
        </div>
      )}
    </article>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse space-y-3 rounded-2xl border border-border bg-surface p-5 motion-reduce:animate-none">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-surface-alt" />
            <div className="space-y-2">
              <div className="h-3.5 w-32 rounded bg-surface-alt" />
              <div className="h-3 w-20 rounded bg-surface-alt" />
            </div>
          </div>
          <div className="h-3.5 w-28 rounded bg-surface-alt" />
          <div className="h-3 w-full rounded bg-surface-alt" />
          <div className="h-3 w-4/5 rounded bg-surface-alt" />
        </div>
      ))}
    </div>
  );
}

/* ---------- the section ---------- */

export default function ProductReviews({ product, profile, onRequireLogin, onSummary }) {
  const productId = product.$id;
  const userId = profile?.$id || null;

  const [sort, setSort] = useState('newest');
  const [rating, setRating] = useState(0); // 0 = all stars
  const [version, setVersion] = useState(0); // bump to reload everything
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState({ rows: [], total: 0, loading: true, loadingMore: false, error: '', moreError: '' });
  const [elig, setElig] = useState(null); // result of canReview, null while checking
  const [formOpen, setFormOpen] = useState(false);
  const [zoom, setZoom] = useState(null);
  const requestId = useRef(0);
  const track = useRef(null); // the horizontal scroller (small screens)
  const [slide, setSlide] = useState(0); // which review is in view on small screens
  const summaryCallback = useRef(onSummary);
  useEffect(() => {
    summaryCallback.current = onSummary;
  });

  // live rating numbers
  useEffect(() => {
    let active = true;
    reviewService.getRatingSummary(productId).then((s) => {
      if (!active) return;
      setSummary(s);
      summaryCallback.current?.({ productId, ...s });
    });
    return () => {
      active = false;
    };
  }, [productId, version]);

  // the list
  useEffect(() => {
    const id = ++requestId.current;
    setList((l) => ({ ...l, loading: true, error: '', moreError: '' }));
    reviewService
      .getProductReviews({ productId, sortBy: sort, rating: rating || undefined, limit: PAGE, offset: 0 })
      .then((res) => {
        if (id !== requestId.current) return;
        setList({ rows: uniq(res.rows), total: res.total, loading: false, loadingMore: false, error: res.error || '', moreError: '' });
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setList((l) => ({ ...l, loading: false, error: e.message || 'Reviews could not be loaded.' }));
      });
  }, [productId, sort, rating, version]);

  // new sort / filter: back to the first review
  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
    setSlide(0);
  }, [sort, rating]);

  const onTrackScroll = (e) => {
    const el = e.currentTarget;
    const first = el.firstElementChild;
    if (!first) return;
    setSlide(Math.round(el.scrollLeft / (first.offsetWidth + 12))); // 12 = gap-3
  };

  // can this customer review (and have they already)?
  useEffect(() => {
    let active = true;
    setElig(null);
    if (!userId) return undefined;
    reviewService.canReview({ userId, productId }).then((r) => active && setElig(r));
    return () => {
      active = false;
    };
  }, [userId, productId, version]);

  const loadMore = async () => {
    const id = requestId.current;
    setList((l) => ({ ...l, loadingMore: true, moreError: '' }));
    const res = await reviewService.getProductReviews({ productId, sortBy: sort, rating: rating || undefined, limit: PAGE, offset: list.rows.length });
    if (id !== requestId.current) return;
    setList((l) =>
      res.error
        ? { ...l, loadingMore: false, moreError: res.error }
        : { ...l, rows: uniq([...l.rows, ...res.rows]), total: res.total, loadingMore: false }
    );
  };

  const closeZoom = useCallback(() => setZoom(null), []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  /* ---------- the write button ---------- */
  const mine = elig?.existing || null;
  let cta = { label: 'Write a review', disabled: false, hint: '', onClick: () => setFormOpen(true) };
  if (!userId) cta = { label: 'Sign in to write a review', disabled: false, hint: '', onClick: () => onRequireLogin?.() };
  else if (!elig) cta = { ...cta, disabled: true };
  else if (elig.reason === 'already_reviewed') cta = { ...cta, label: 'You reviewed this', disabled: true };
  else if (elig.reason === 'purchase_required') cta = { ...cta, disabled: true, hint: 'Only customers who bought this can review it.' };

  const total = summary?.total ?? 0;
  const average = summary?.average ?? 0;
  const counts = summary?.counts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const noReviewsAtAll = summary && total === 0 && !mine;
  const busyList = list.loading && list.rows.length > 0;

  return (
    <section id="reviews" className="mt-16 scroll-mt-24" aria-labelledby="product-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div>
          <h2 id="product-reviews-heading" className="font-display text-3xl font-bold text-text">
            Reviews
          </h2>
          {summary && <p className="mt-1 text-sm text-muted">{total ? `${plural(total)} from customers who tried it` : 'Nobody has reviewed this yet'}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={cta.onClick}
            disabled={cta.disabled}
            className="group inline-flex h-11 items-center gap-2 rounded-xl bg-brown px-5 text-sm font-semibold text-on-brown shadow-soft transition-all duration-200 hover:bg-brown-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <PenLine size={17} className="transition-transform duration-300 group-hover:-rotate-12" aria-hidden="true" />
            {cta.label}
          </button>
          {cta.hint && <p className="max-w-[16rem] text-right text-xs text-muted">{cta.hint}</p>}
        </div>
      </div>

      {/* the customer's own review while it is not public */}
      {mine && mine.status !== 'approved' && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-surface-alt/60 p-4">
          {mine.status === 'pending' ? <Clock size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" /> : <Info size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />}
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-text">{mine.status === 'pending' ? 'Your review is waiting for approval' : 'Your review was not approved'}</p>
            <p className="mt-0.5 text-muted">
              {mine.status === 'pending' ? 'Only you can see it for now. It appears here once the store approves it.' : 'It is not shown to other shoppers.'}
            </p>
          </div>
        </div>
      )}

      {list.error && (
        <p role="alert" className="mt-5 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          {list.error}{' '}
          <button type="button" onClick={() => setVersion((v) => v + 1)} className="font-medium underline">
            Try again
          </button>
        </p>
      )}

      {noReviewsAtAll && !list.error ? (
        <div className="mt-6 rounded-2xl border border-dashed border-thread bg-surface p-8 text-center">
          <p className="font-heading text-lg font-semibold text-text">Be the first to review this</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Tell others how the fabric, stitching and fit turned out.</p>
        </div>
      ) : (
        !list.error && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10">
            {/* rating summary: stitched label */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-dashed border-thread/80 p-1.5">
                <div className="rounded-xl bg-surface p-5">
                  <div className="flex items-end gap-2">
                    <p className="font-heading text-5xl font-bold leading-none tabular-nums text-text">{summary ? average.toFixed(1) : '–'}</p>
                    <p className="pb-1 text-sm text-muted">out of 5</p>
                  </div>
                  <Stars value={average} size={19} className="mt-3" />
                  <p className="mt-1.5 text-sm text-muted">{summary ? `Based on ${plural(total)}` : 'Counting…'}</p>

                  <ul className="mt-5 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const c = counts[n] || 0;
                      const pct = total ? (c / total) * 100 : 0;
                      const active = rating === n;
                      return (
                        <li key={n}>
                          <button
                            type="button"
                            disabled={!c && !active}
                            aria-pressed={active}
                            onClick={() => setRating(active ? 0 : n)}
                            aria-label={`${n} star reviews: ${c}. ${active ? 'Showing only these. Click to show all.' : 'Click to show only these.'}`}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition-colors duration-200 disabled:cursor-default disabled:opacity-50 ${active ? 'bg-accent-soft' : 'enabled:hover:bg-surface-alt'}`}
                          >
                            <span className="w-3 text-right font-medium tabular-nums text-text">{n}</span>
                            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-alt">
                              <span className="block h-full rounded-full bg-warning transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="w-7 text-right text-xs tabular-nums text-muted">{c}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </aside>

            {/* list */}
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={sort === s.id}
                    onClick={() => setSort(s.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
                      sort === s.id ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-text hover:border-accent/60'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
                {rating > 0 && (
                  <button type="button" onClick={() => setRating(0)} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
                    {rating}-star only <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              {list.loading && list.rows.length === 0 ? (
                <ListSkeleton />
              ) : list.rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
                  <p className="font-semibold text-text">{rating ? `No ${rating}-star reviews yet` : 'No reviews to show'}</p>
                  {rating > 0 && (
                    <button type="button" onClick={() => setRating(0)} className="mt-2 text-sm font-medium text-accent underline">
                      Show all reviews
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* small screens: one review per swipe. md and up: normal vertical list */}
                  <ul
                    ref={track}
                    onScroll={onTrackScroll}
                    aria-busy={busyList}
                    className={`no-scrollbar flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 transition-opacity duration-200 motion-reduce:scroll-auto md:block md:space-y-4 md:overflow-visible md:pb-0 ${busyList ? 'opacity-60' : ''}`}
                  >
                    {list.rows.map((review) => (
                      <li key={review.$id} className={`shrink-0 snap-start md:w-auto ${list.rows.length > 1 ? 'w-[90%]' : 'w-full'}`}>
                        <ReviewItem review={review} onZoom={setZoom} />
                      </li>
                    ))}
                  </ul>
                  {list.rows.length > 1 && (
                    <p className="mt-3 text-center text-xs tabular-nums text-muted md:hidden" aria-hidden="true">
                      {Math.min(slide + 1, list.rows.length)} of {list.rows.length}
                      {list.rows.length < list.total ? ` · ${list.total} in total` : ''} · swipe for more
                    </p>
                  )}
                </>
              )}

              {list.moreError && (
                <p role="alert" className="mt-4 text-sm text-error">
                  {list.moreError}
                </p>
              )}
              {list.rows.length > 0 && list.rows.length < list.total && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={list.loadingMore}
                  className="mt-5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent/60 hover:text-accent disabled:cursor-wait disabled:opacity-60"
                >
                  {list.loadingMore ? 'Loading…' : `Show more (${list.total - list.rows.length} left)`}
                </button>
              )}
            </div>
          </div>
        )
      )}

      <ReviewFormModal open={formOpen} product={product} profile={profile} onClose={closeForm} onSubmitted={() => setVersion((v) => v + 1)} />
      <Lightbox src={zoom} onClose={closeZoom} />
    </section>
  );
}