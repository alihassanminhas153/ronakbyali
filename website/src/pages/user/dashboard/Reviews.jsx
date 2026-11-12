import PanelPageTitle from '../../../ui/custom/PanelPageTitle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Check,
  Clock,
  Loader2,
  MessageSquareReply,
  Pencil,
  RefreshCw,
  ShoppingBag,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { selectMe } from '../../../store/slices/userSlice';
import {
  clearMyReviewError,
  editMyReview,
  fetchMyReviews,
  removeMyReview,
  selectMyReviewActionError,
  selectMyReviewBusy,
  selectMyReviews,
  selectMyReviewsError,
  selectMyReviewsStatus,
} from '../../../store/slices/reviewSlice';
import reviewService, { REVIEW_STATUS } from '../../../lib/appwrite/review';
import ConfirmDialog from '../../../ui/custom/modal/ConfirmDialog';
import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import CountUp from '../../../ui/custom/motion/CountUp';
import useEntered from '../../../ui/custom/motion/useEntered';
import SearchInput from '../../../ui/custom/input/SearchInput';
import SelectInput from '../../../ui/custom/input/SelectInput';
import Segmented from '../../../ui/custom/input/Segmented';
import HeatmapCalendar from '../../../ui/graphs/HeatmapCalendar';
import { formatDate, formatDateTime } from '../../../components/user/profile/profileMeta';

// Where "Browse products" and a product's name lead to. Change these two to match router/path.js.
const SHOP_PATH = '/products';
const productPath = (review) => (review.productSlug ? `/products/${review.productSlug}` : SHOP_PATH);

const PAGE_SIZE = 6;
const MAX_MESSAGE = 2000;
const MAX_TITLE = 150;

const STATUS = {
  [REVIEW_STATUS.PENDING]: { label: 'Waiting for approval', short: 'Pending', icon: Clock, color: 'var(--warning)', tone: 3 },
  [REVIEW_STATUS.APPROVED]: { label: 'Published', short: 'Approved', icon: CheckCircle2, color: 'var(--success)', tone: 7 },
  [REVIEW_STATUS.REJECTED]: { label: 'Not published', short: 'Rejected', icon: XCircle, color: 'var(--error)', tone: 4 },
};
const statusOf = (review) => STATUS[review?.status] || STATUS[REVIEW_STATUS.PENDING];

const STATUS_FILTERS = [
  { value: 'all', label: 'All', tone: 1 },
  ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.short, icon: s.icon, tone: s.tone })),
];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest rating' },
  { value: 'lowest', label: 'Lowest rating' },
];

// "just now", "25s ago", "4m ago" ... re-rendered every 10 seconds
function useTimeAgo(date) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  if (!date) return '';
  const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

// ---------- Small pieces ----------

// Slides down + fades in on mount; the page removes it after a few seconds.
function Notice({ type, text, onDismiss }) {
  const entered = useEntered();
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : Check;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-300 motion-reduce:transition-none ${
        isError ? 'border-error/40 bg-error/10 text-error' : 'border-success/40 bg-success/10 text-success'
      } ${entered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
    >
      <Icon size={16} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-full p-1 transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function StatTile({ icon: Icon, label, color, children }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--tile)]" style={{ '--tile': color }}>
      <span
        className="grid size-11 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="truncate font-display text-xl font-semibold text-text">{children}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-surface-alt text-muted">
        <Icon size={26} aria-hidden="true" />
      </span>
      <p className="mt-4 font-medium text-text">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

// Read-only stars.
function Stars({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden="true"
          className={n <= Math.round(value) ? 'fill-accent-tone-3 text-accent-tone-3' : 'text-border'}
        />
      ))}
    </span>
  );
}

// Clickable stars (used while editing).
function StarPicker({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label="Rating" className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition-transform duration-150 hover:scale-125 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Star size={26} aria-hidden="true" className={n <= shown ? 'fill-accent-tone-3 text-accent-tone-3' : 'text-border'} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, busy, onSave, onDelete }) {
  const s = statusOf(review);
  const StatusIcon = s.icon;
  const images = useMemo(() => reviewService.getImageUrls(review), [review]);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(Number(review.rating) || 0);
  const [title, setTitle] = useState(review.title || '');
  const [message, setMessage] = useState(review.message || '');
  const [error, setError] = useState('');

  const startEdit = () => {
    setRating(Number(review.rating) || 0);
    setTitle(review.title || '');
    setMessage(review.message || '');
    setError('');
    setEditing(true);
  };

  const submit = async () => {
    if (!rating) return setError('Please choose a rating from 1 to 5 stars.');
    if (message.trim().length < 5) return setError('Please write a few words about the product.');
    setError('');
    const ok = await onSave(review, { rating, title, message });
    if (ok) setEditing(false);
  };

  const changed =
    rating !== Number(review.rating) || title.trim() !== (review.title || '') || message.trim() !== (review.message || '');

  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-[color:var(--tile)] sm:p-5"
      style={{ '--tile': s.color }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: s.color }} />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={productPath(review)} className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-accent hover:underline">
            <ShoppingBag size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{review.productName || 'Product'}</span>
          </Link>
          <p className="mt-0.5 text-xs text-muted">Written {formatDate(review.$createdAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {review.isVerifiedPurchase && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
              <BadgeCheck size={12} aria-hidden="true" />
              Verified purchase
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}
          >
            <StatusIcon size={12} aria-hidden="true" />
            {s.label}
          </span>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <StarPicker value={rating} onChange={setRating} disabled={busy} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MAX_TITLE}
            placeholder="Title (optional)"
            aria-label="Review title"
            disabled={busy}
          />
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE}
              rows={5}
              placeholder="Share what you liked or didn’t like"
              aria-label="Review message"
              disabled={busy}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-muted">
              {message.length}/{MAX_MESSAGE}
            </p>
          </div>

          {review.status === REVIEW_STATUS.APPROVED && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <Clock size={14} className="mt-px shrink-0" aria-hidden="true" />
              After you save, this review is hidden until the store approves it again.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={submit} disabled={busy || !changed} className="btn btn-primary !min-h-10 gap-2 !px-4 !py-2 !text-sm disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={busy} className="btn btn-ghost !min-h-10 !px-4 !py-2 !text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={review.rating} />
            {review.title && <h3 className="heading-sm break-words text-text">{review.title}</h3>}
          </div>
          <p className="mt-2 whitespace-pre-line break-words text-sm text-text/90">{review.message}</p>

          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border transition-transform duration-200 hover:scale-105">
                  <img src={url} alt={`Review photo ${i + 1}`} loading="lazy" className="size-20 object-cover" />
                </a>
              ))}
            </div>
          )}

          {review.adminReply && (
            <div className="mt-4 rounded-lg border border-border bg-surface-alt p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                <MessageSquareReply size={14} aria-hidden="true" />
                Reply from the store
                {review.repliedAt && <span className="font-normal text-muted">· {formatDateTime(review.repliedAt)}</span>}
              </p>
              <p className="mt-1.5 whitespace-pre-line break-words text-sm text-text">{review.adminReply}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={startEdit} disabled={busy} className="btn btn-ghost !min-h-10 gap-1.5 !px-4 !py-2 !text-sm">
              <Pencil size={15} aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(review)}
              disabled={busy}
              className="btn btn-ghost !min-h-10 gap-1.5 !px-4 !py-2 !text-sm !text-error hover:!border-error"
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}

// ---------- Page ----------

function ReviewsView({ me }) {
  const dispatch = useAppDispatch();
  const entered = useEntered();
  const noticeTimer = useRef(null);

  const reviews = useAppSelector(selectMyReviews);
  const status = useAppSelector(selectMyReviewsStatus);
  const loadError = useAppSelector(selectMyReviewsError);
  const busyMap = useAppSelector(selectMyReviewBusy);
  const actionError = useAppSelector(selectMyReviewActionError);

  const [tab, setTab] = useState('reviews');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [notice, setNotice] = useState(null); // { type, text, id }
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [removing, setRemoving] = useState(null); // review waiting for delete confirmation
  const [removeError, setRemoveError] = useState('');
  const ago = useTimeAgo(updatedAt);

  const notify = (type, text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ type, text, id: Date.now() });
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  useEffect(() => () => dispatch(clearMyReviewError()), [dispatch]);

  const load = useCallback(async () => {
    const result = await dispatch(fetchMyReviews(me.$id));
    const ok = fetchMyReviews.fulfilled.match(result);
    if (ok) setUpdatedAt(new Date());
    return ok;
  }, [dispatch, me.$id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    const ok = await load();
    if (!ok) notify('error', 'Could not refresh your reviews. Try again in a moment.');
    setRefreshing(false);
  };

  // Save an edit. Returns true so the card can close its form.
  const onSave = async (review, { rating, title, message }) => {
    const result = await dispatch(editMyReview({ review, rating, title, message }));
    if (editMyReview.fulfilled.match(result)) {
      setUpdatedAt(new Date());
      notify('ok', 'Review saved. It will show in the shop after the store approves it.');
      return true;
    }
    notify('error', result.payload || 'Could not save your review.');
    return false;
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemoveError('');
    const result = await dispatch(removeMyReview(removing));
    if (removeMyReview.fulfilled.match(result)) {
      setRemoving(null);
      setUpdatedAt(new Date());
      notify('ok', 'Review deleted.');
    } else {
      setRemoveError(result.payload || 'Could not delete your review.');
    }
  };

  // Numbers
  const counts = useMemo(() => {
    const c = { total: reviews.length, pending: 0, approved: 0, rejected: 0, stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, sum: 0 };
    reviews.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status] += 1;
      const n = Math.round(Number(r.rating)) || 0;
      if (c.stars[n] !== undefined) c.stars[n] += 1;
      c.sum += n;
    });
    c.average = c.total ? Math.round((c.sum / c.total) * 10) / 10 : 0;
    return c;
  }, [reviews]);

  const heatData = useMemo(() => reviews.map((r) => ({ date: new Date(r.$createdAt), value: 1 })), [reviews]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reviews.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (q && !`${r.productName || ''} ${r.title || ''} ${r.message || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const time = (r) => new Date(r.$createdAt).getTime() || 0;
    if (sort === 'oldest') list.sort((a, b) => time(a) - time(b));
    else if (sort === 'highest') list.sort((a, b) => b.rating - a.rating || time(b) - time(a));
    else if (sort === 'lowest') list.sort((a, b) => a.rating - b.rating || time(b) - time(a));
    else list.sort((a, b) => time(b) - time(a));
    return list;
  }, [reviews, filter, query, sort]);

  // any filter change goes back to the first page
  useEffect(() => setLimit(PAGE_SIZE), [filter, query, sort]);

  const filtersOn = query.trim() !== '' || filter !== 'all' || sort !== 'newest';
  const resetFilters = () => {
    setQuery('');
    setFilter('all');
    setSort('newest');
  };

  const loading = status === 'loading' && reviews.length === 0;
  const busy = refreshing || status === 'loading';
  const maxStar = Math.max(1, ...Object.values(counts.stars));

  const tabs = [
    { id: 'reviews', label: 'My reviews', icon: Star, color: 'var(--accent-tone-3)' },
    { id: 'insights', label: 'Insights', icon: CheckCircle2, color: 'var(--accent-tone-2)' },
  ];

  return (
    <div
      className={`space-y-5 transition-all duration-500 motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <PanelPageTitle icon="reviews" className="font-display text-3xl font-bold tracking-wide text-text sm:text-4xl">Reviews</PanelPageTitle>
          <p className="mt-1 hidden text-sm text-muted lg:block">Everything you’ve written about the products you’ve tried.</p>
        </div>

        <div className="flex items-center gap-3">
          {ago && (
            <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${busy ? 'animate-pulse bg-accent-tone-3' : 'bg-accent-tone-7'}`} />
              {busy ? 'Syncing…' : `Updated ${ago}`}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            title="Fetch your latest reviews from the database"
            className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-3.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-accent-tone-1 hover:bg-surface-alt hover:text-accent-tone-1 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {notice && <Notice key={notice.id} type={notice.type} text={notice.text} onDismiss={() => setNotice(null)} />}
      {actionError && !notice && <Notice type="error" text={actionError} onDismiss={() => dispatch(clearMyReviewError())} />}

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-2xl p-5 text-center text-white sm:flex-row sm:gap-7 sm:p-7 sm:text-left"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 hidden h-32 w-32 animate-float rounded-full bg-white/[0.07] sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-white/60 transition-transform duration-500 group-hover:scale-x-100" />

        <div className="relative shrink-0">
          <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full border-2 border-white/70" />
          <div className="relative grid size-24 place-items-center rounded-full border-2 border-white/40 bg-white/15 text-white sm:size-28">
            <div className="text-center leading-none">
              <span className="font-display text-4xl font-bold">{counts.total ? counts.average.toFixed(1) : '–'}</span>
              <Star size={16} className="mx-auto mt-1 fill-white" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Your reviews</span>
          <span className="heading mt-1 block text-2xl sm:text-3xl">
            {counts.total === 0 ? 'No reviews yet' : counts.total === 1 ? '1 review written' : `${counts.total} reviews written`}
          </span>
          <p className="mt-2 text-sm text-white/80">
            {counts.total === 0
              ? 'Tell other shoppers what you think. Open a product to write your first review.'
              : `Your average rating is ${counts.average.toFixed(1)} out of 5.`}
          </p>
        </div>

        <Link
          to={SHOP_PATH}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold !text-[color:var(--brown)] transition-transform duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ShoppingBag size={16} aria-hidden="true" />
          Browse products
        </Link>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Star} label="Reviews written" color="var(--accent-tone-1)">
          <CountUp value={counts.total} />
        </StatTile>
        <StatTile icon={CheckCircle2} label="Published" color="var(--accent-tone-7)">
          <CountUp value={counts.approved} />
        </StatTile>
        <StatTile icon={Clock} label="Waiting for approval" color="var(--accent-tone-3)">
          <CountUp value={counts.pending} />
        </StatTile>
        <StatTile icon={XCircle} label="Not published" color="var(--accent-tone-4)">
          <CountUp value={counts.rejected} />
        </StatTile>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'reviews' && (
        <TabPanel key="reviews" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <SearchInput value={query} onSearch={setQuery} placeholder="Search by product or words" label="Search your reviews" size="sm" />
            <SelectInput size="sm" value={sort} onChange={setSort} options={SORTS} aria-label="Sort reviews" />
          </div>
          <Segmented options={STATUS_FILTERS} value={filter} onChange={setFilter} aria-label="Filter by status" />

          {loading ? (
            <div role="status" className="flex items-center gap-2 py-8 text-muted">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Loading your reviews…
            </div>
          ) : status === 'error' && reviews.length === 0 ? (
            <EmptyState icon={AlertCircle} title="Could not load your reviews" text={loadError || 'Please check your connection and press Refresh.'} />
          ) : visible.length === 0 ? (
            reviews.length === 0 ? (
              <EmptyState icon={Star} title="You haven’t reviewed anything yet" text="After you try a product, open it in the shop and share your thoughts.">
                <Link to={SHOP_PATH} className="btn btn-primary mt-4 gap-2">
                  <ShoppingBag size={16} aria-hidden="true" />
                  Browse products
                </Link>
              </EmptyState>
            ) : (
              <EmptyState icon={Star} title="No reviews match" text="Try a different status or clear your search.">
                <button type="button" onClick={resetFilters} className="btn btn-ghost mt-4">
                  Clear filters
                </button>
              </EmptyState>
            )
          ) : (
            <div className="space-y-3">
              {visible.slice(0, limit).map((review) => (
                <ReviewCard
                  key={review.$id}
                  review={review}
                  busy={Boolean(busyMap[review.$id])}
                  onSave={onSave}
                  onDelete={(r) => {
                    setRemoveError('');
                    setRemoving(r);
                  }}
                />
              ))}
              {visible.length > limit && (
                <div className="flex justify-center pt-1">
                  <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)} className="btn btn-ghost">
                    Show more ({visible.length - limit} left)
                  </button>
                </div>
              )}
            </div>
          )}
        </TabPanel>
      )}

      {tab === 'insights' && (
        <TabPanel key="insights" className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="heading-sm text-text">Review activity</h2>
              <span className="text-xs text-muted">The days you wrote reviews</span>
            </div>
            <HeatmapCalendar data={heatData} label="reviews" />
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="heading-sm text-text">Your ratings</h2>
            <div className="mt-4 space-y-2.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <span className="flex w-8 shrink-0 items-center gap-1 text-muted">
                    {n}
                    <Star size={13} className="fill-accent-tone-3 text-accent-tone-3" aria-hidden="true" />
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className="h-full rounded-full bg-accent-tone-3 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                      style={{ width: entered ? `${(counts.stars[n] / maxStar) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right tabular-nums text-muted">{counts.stars[n]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="heading-sm text-text">Where your reviews stand</h2>
            <div className="mt-4 space-y-2.5">
              {Object.entries(STATUS).map(([key, s]) => {
                const count = counts[key] || 0;
                return (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="flex w-36 shrink-0 items-center gap-1.5 text-muted">
                      <s.icon size={14} style={{ color: s.color }} aria-hidden="true" />
                      {s.short}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className="h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                        style={{ width: entered && counts.total ? `${(count / counts.total) * 100}%` : '0%', background: s.color }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right tabular-nums text-muted">{count}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted">
              New and edited reviews wait for the store to approve them before other shoppers can see them.
            </p>
          </section>
        </TabPanel>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        danger
        busy={removing ? Boolean(busyMap[removing.$id]) : false}
        error={removeError}
        title="Delete this review?"
        message="Your review and its photos will be removed for good. This can’t be undone."
        confirmLabel="Delete"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

// User > Reviews
// Lists the signed-in customer's own reviews (state.reviews.mine in reviewSlice).
export default function Reviews() {
  const me = useAppSelector(selectMe);

  if (!me) {
    return (
      <div role="status" className="flex items-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        Loading your reviews…
      </div>
    );
  }

  // key: start with fresh state if the account ever changes.
  return <ReviewsView key={me.$id} me={me} />;
}