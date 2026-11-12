// src/components/shop/ProductCard.jsx   (storefront grid card)
//
// USAGE (inside the grid <ul>; the card renders its own <li>)
//   <ProductCard
//     product={product}
//     index={i}                        // position in the list: staggers the entrance
//     inCart={cartIds.has(product.$id)}
//     inWishlist={wishIds.has(product.$id)}
//     cartBusy={false}
//     wishBusy={false}
//     onAddToCart={(p) => ...}
//     onToggleWishlist={(p) => ...}
//   />
//   <ProductCardSkeleton />           // loading placeholder, also an <li>
//
// The cart and heart buttons only appear when onAddToCart / onToggleWishlist are passed.
// costPrice is never shown here.
// Product columns used: name, slug, category, imageIds, price, originalPrice,
// discountPercentage, discountName, status, remaining, ratingAverage, reviewCount,
// $createdAt, $updatedAt.

import { memo, useState } from 'react';
import { Link } from 'react-router';
import { Check, Clock, Heart, ImageOff, MessageSquare, ShoppingCart, Star, Tag } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import { getMainImageUrl } from '../../store/slices/productsSlice';
import { PATHS } from '../../router/path';
import useEntered from '../../ui/custom/motion/useEntered';
import { PAGE_SIZE } from './shopFilters';

/* ---------- helpers ---------- */

const money = (v) => productService.formatPrice(v);

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'} ago`;

// "just now", "5 min ago", "3 hours ago", "4 days ago", "2 weeks ago", "5 months ago", "2 years ago"
function timeAgo(iso) {
  const time = new Date(iso).getTime();
  if (!iso || Number.isNaN(time)) return '';
  const seconds = Math.max(0, (Date.now() - time) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return plural(days, 'day');
  if (days < 30) return plural(Math.floor(days / 7), 'week');
  if (days < 365) return plural(Math.floor(days / 30), 'month');
  return plural(Math.floor(days / 365), 'year');
}

// New for a week, "Updated ..." when it was edited after being added, otherwise "Added ...".
function freshness(product) {
  const created = new Date(product.$createdAt).getTime();
  const updated = new Date(product.$updatedAt).getTime();
  if (Number.isNaN(created)) return '';
  const day = 24 * 60 * 60 * 1000;
  if (Date.now() - created < 7 * day) return `New · ${timeAgo(product.$createdAt)}`;
  if (!Number.isNaN(updated) && updated - created > day) return `Updated ${timeAgo(product.$updatedAt)}`;
  return `Added ${timeAgo(product.$createdAt)}`;
}

/* ---------- small pieces ---------- */

function Stars({ value, hasReviews }) {
  const pct = hasReviews ? Math.max(0, Math.min(100, (Number(value) / 5) * 100)) : 0;
  const row = (cls) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={14} className={`shrink-0 ${cls}`} />
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex" role="img" aria-label={`Rated ${Number(value).toFixed(1)} out of 5`}>
      {row('text-border')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row('fill-current text-warning')}
      </span>
    </span>
  );
}

function RoundAction({ label, active, busy, onClick, children, activeCls }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid size-10 shrink-0 place-items-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 ${
        active ? activeCls : 'border-border bg-surface text-muted hover:border-accent/60 hover:text-accent'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- the card ---------- */

function ProductCard({
  product,
  inCart = false,
  inWishlist = false,
  cartBusy = false,
  wishBusy = false,
  onAddToCart,
  onToggleWishlist,
  index = 0,
}) {
  const entered = useEntered((index % PAGE_SIZE) * 40);
  const [imgFailed, setImgFailed] = useState(false);
  if (!product) return null;

  const image = getMainImageUrl(product);
  const remaining = product.remaining == null ? null : Number(product.remaining);
  const hasRemaining = remaining !== null && Number.isFinite(remaining);
  const outOfStock = product.status === 'outOfStock' || (hasRemaining && remaining <= 0);
  // prices: `price` is the final price, `originalPrice` the one before the discount
  const finalPrice = Number(product.price) || 0;
  const originalPrice = Number(product.originalPrice) || 0;
  const hasDrop = originalPrice > finalPrice && finalPrice > 0;
  const percent =
    Number(product.discountPercentage) > 0
      ? Math.round(Number(product.discountPercentage))
      : hasDrop
        ? Math.round((1 - finalPrice / originalPrice) * 100)
        : 0;
  const onOffer = hasDrop || percent > 0;
  const saved = hasDrop ? originalPrice - finalPrice : 0;

  const reviews = Number(product.reviewCount) || 0;
  const rating = Number(product.ratingAverage) || 0;
  const hasReviews = reviews > 0;
  const fresh = freshness(product);
  const hasHoverMeta = Boolean(fresh || saved > 0);
  // The long URL carries the slug as :productId (Product.jsx looks it up by slug).
  const link = PATHS.product(product.category, product.group, product.slug || product.$id);

  return (
    <li
      className={`transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
    <article
      className="group/card relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg focus-within:border-accent/50"
    >
      {/* ---------- image ---------- */}
      <div className="relative">
        <Link to={link} aria-label={`View ${product.name}`} className="block overflow-hidden bg-surface-alt/60">
          <div className="grid h-[160px] place-items-center p-2 sm:h-[190px]">
            {image && !imgFailed ? (
              <img
                src={image}
                alt={product.name}
                loading="lazy"
                onError={() => setImgFailed(true)}
                className={`size-full object-contain transition-transform duration-500 ease-out group-hover/card:scale-110 group-hover/card:-rotate-1 ${
                  outOfStock ? 'opacity-60 grayscale' : ''
                }`}
              />
            ) : (
              <ImageOff size={36} className="text-muted/60" aria-hidden="true" />
            )}
          </div>
          {/* light sweep on hover */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-bg/30 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-[130%] group-hover/card:opacity-100"
          />
        </Link>

        {/* offer tag */}
        {onOffer && !outOfStock && (
          <span className="absolute left-2 top-2 inline-flex max-w-[44%] items-center gap-1 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-accent shadow-sm transition-transform duration-300 group-hover/card:scale-105 sm:left-3 sm:top-3 sm:px-2.5 sm:text-xs">
            <Tag size={12} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {product.discountName ? product.discountName : percent > 0 ? `${percent}% off` : 'Offer'}
            </span>
          </span>
        )}

        {(outOfStock || (hasRemaining && remaining > 0)) && (
          <span
            aria-label={outOfStock ? 'Out of stock' : `${remaining} left in stock`}
            className={`absolute right-2 top-2 inline-flex max-w-[54%] items-center justify-center truncate whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm sm:right-3 sm:top-3 sm:text-xs ${
              outOfStock ? 'bg-text text-bg' : 'bg-surface text-muted'
            }`}
          >
            {outOfStock ? 'Out of stock' : `${remaining > 9 ? '9+' : remaining} left`}
          </span>
        )}

      </div>

      {/* ---------- details ---------- */}
      <div className="flex flex-1 flex-col gap-1 p-2 sm:gap-2 sm:p-4">
      {product.category && (
        <p className="hidden truncate text-xs font-medium uppercase tracking-wide text-muted sm:block">{product.category}</p>
      )}

      <h3 className="break-words text-base font-semibold leading-tight text-text transition-colors group-hover/card:text-accent sm:text-lg [overflow-wrap:anywhere]">
        <Link to={link} className="focus:outline-none">{product.name}</Link>
      </h3>

      {/* Product metadata and pricing share a row to keep cards compact. */}
      <div className={`relative mt-1 min-w-0 ${hasHoverMeta ? 'sm:pb-5' : ''}`}>
        <div
          className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-1 transition-transform duration-300 ease-out motion-reduce:transition-none sm:gap-2 ${
            hasHoverMeta
              ? 'sm:translate-y-5 sm:group-hover/card:translate-y-0 sm:group-focus-within/card:translate-y-0'
              : ''
          }`}
        >
          <div className="hidden min-w-0 flex-col justify-end gap-1 text-xs text-muted sm:flex">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Stars value={rating} hasReviews={hasReviews} />
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={12} aria-hidden="true" />
                {reviews}
                <span className="sr-only"> {reviews === 1 ? 'review' : 'reviews'}</span>
              </span>
            </span>
          </div>

          <div className="min-w-0 text-right">
            {onOffer && (
              <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
                {hasDrop && <span className="text-xs text-muted line-through sm:text-sm">{money(originalPrice)}</span>}
                {percent > 0 && (
                  <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent sm:text-xs">
                    -{percent}%
                  </span>
                )}
              </div>
            )}
            <p className="break-words text-lg font-semibold leading-tight tabular-nums text-text sm:text-xl">
              {product.priceFormat || money(finalPrice)}
            </p>
          </div>
          </div>

          {hasHoverMeta && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-5 grid-cols-2 items-center gap-2 text-xs leading-4 opacity-0 transition-all duration-300 ease-out sm:grid sm:translate-y-1 sm:group-hover/card:translate-y-0 sm:group-hover/card:opacity-100 sm:group-focus-within/card:translate-y-0 sm:group-focus-within/card:opacity-100 motion-reduce:transition-none">
            {fresh ? (
              <span className="inline-flex min-w-0 items-center gap-1 truncate text-muted">
                <Clock size={12} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{fresh}</span>
              </span>
            ) : <span />}
            {saved > 0 && (
              <span className="truncate text-right font-medium text-success">You save {money(saved)}</span>
            )}
          </div>
          )}
        </div>

      <div className="mt-1.5 flex items-center gap-1.5 sm:mt-2">
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={outOfStock || cartBusy}
            aria-label={outOfStock ? 'Out of stock' : inCart ? 'In your cart. Add one more' : 'Add to cart'}
            title={outOfStock ? 'Out of stock' : inCart ? 'In your cart' : 'Add to cart'}
            className={`relative inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-xl px-1 text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:gap-2 sm:px-3 sm:text-sm ${
              remaining === 1 && !outOfStock
                ? 'bg-success text-white hover:brightness-90'
                : 'bg-brown text-on-brown hover:bg-brown-hover'
            }`}
          >
            {inCart && !outOfStock ? (
              <Check size={18} className="shrink-0 animate-rise" aria-hidden="true" />
            ) : (
              <ShoppingCart size={16} className="shrink-0 transition-transform duration-300 group-hover/card:-translate-y-0.5 sm:size-[18px]" aria-hidden="true" />
            )}
            <span className="sm:hidden">{outOfStock ? 'Sold out' : inCart ? 'Add one' : 'Add'}</span>
            <span className="hidden truncate sm:inline">{outOfStock ? 'Sold out' : inCart ? 'Add one more' : 'Add to cart'}</span>
          </button>
        )}
        {onToggleWishlist && (
          <RoundAction
            label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            active={inWishlist}
            busy={wishBusy}
            onClick={() => onToggleWishlist(product)}
            activeCls="border-accent bg-accent-soft text-accent"
          >
            <Heart size={18} className={inWishlist ? 'fill-current' : ''} aria-hidden="true" />
          </RoundAction>
        )}
      </div>
      </div>
    </article>
    </li>
  );
}

export default memo(ProductCard);

export function ProductCardSkeleton() {
  return (
    <li aria-hidden="true" className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="h-[160px] animate-pulse bg-surface-alt motion-reduce:animate-none sm:h-[190px]" />
      <div className="space-y-2 p-2 sm:p-4">
        <div className="hidden h-3 w-1/3 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none sm:block" />
        <div className="h-4 w-4/5 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
        <div className="h-5 w-1/3 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
      </div>
    </li>
  );
}