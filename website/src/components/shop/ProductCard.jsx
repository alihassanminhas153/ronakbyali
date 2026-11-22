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
//
// DESIGN: the image fills the whole card; only the name and price sit on a glass panel at the bottom.
// On hover / keyboard focus the panel grows upward and reveals category, rating, freshness, savings
// and the cart / wishlist buttons. Touch screens (no hover) keep the panel compact and show small
// round cart / heart buttons next to the price instead.
// Product columns used: name, slug, category, imageIds, price, originalPrice,
// discountPercentage, discountName, status, remaining, ratingAverage, reviewCount,
// $createdAt, $updatedAt.

import { memo, useState } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Check, Clock, Heart, ImageOff, MessageSquare, ShoppingCart, Star, Tag } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import { getEffectivePricing } from '../../lib/saleMath';
import { selectSalesList } from '../../store/slices/saleSlice';
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

function RoundAction({ label, active, busy, onClick, children, activeCls, sizeCls = 'size-10' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid ${sizeCls} shrink-0 place-items-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 ${
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
  onCustomize,
  index = 0,
  isDuplicate = false,
}) {
  const entered = useEntered((index % PAGE_SIZE) * 40);
  const [imgFailed, setImgFailed] = useState(false);
  const sales = useSelector(selectSalesList);
  if (!product) return null;

  const image = getMainImageUrl(product);
  const remaining = product.remaining == null ? null : Number(product.remaining);
  const hasRemaining = remaining !== null && Number.isFinite(remaining);
  const outOfStock = product.isCustom !== true && (product.status === 'outOfStock' || (hasRemaining && remaining <= 0));
  // prices: `price` is the final price, `originalPrice` the one before the discount
  const pricing = getEffectivePricing(product, sales);
  const finalPrice = pricing.price;
  const originalPrice = pricing.originalPrice;
  const hasDrop = originalPrice > finalPrice && finalPrice > 0;
  const percent =
    pricing.discountPercentage > 0
      ? Math.round(pricing.discountPercentage)
      : hasDrop
        ? Math.round((1 - finalPrice / originalPrice) * 100)
        : 0;
  const onOffer = hasDrop || percent > 0;
  const saved = hasDrop ? originalPrice - finalPrice : 0;

  const reviews = Number(product.reviewCount) || 0;
  const rating = Number(product.ratingAverage) || 0;
  const hasReviews = reviews > 0;
  const fresh = freshness(product);
  // The long URL carries the slug as :productId (Product.jsx looks it up by slug).
  const link = PATHS.product(product.category, product.group, product.slug || product.$id);

  const showCart = product.isCustom !== true && Boolean(onAddToCart);
  const showCustomize = product.isCustom === true && Boolean(onCustomize);
  const lastOne = remaining === 1 && !outOfStock;
  const cartLabel = outOfStock ? 'Out of stock' : inCart ? 'In your cart. Add one more' : 'Add to cart';
  const cartTitle = outOfStock ? 'Out of stock' : inCart ? 'In your cart' : 'Add to cart';

  const wishButton = (sizeCls) =>
    onToggleWishlist ? (
      <RoundAction
        label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        active={inWishlist}
        busy={wishBusy}
        onClick={() => onToggleWishlist(product)}
        activeCls="border-accent bg-accent-soft text-accent"
        sizeCls={sizeCls}
      >
        <Heart size={18} className={inWishlist ? 'fill-current' : ''} aria-hidden="true" />
      </RoundAction>
    ) : null;

  return (
    <li
      className={`min-w-0 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <article className="group/card relative block aspect-[3/4] w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-surface-alt/60 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg focus-within:border-accent/50">
        {/* whole card is a link; the buttons sit above it (z-20) */}
        <Link
          to={link}
          tabIndex={isDuplicate ? -1 : undefined}
          aria-label={`View ${product.name}`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-3px]"
        >
          <span className="sr-only">View {product.name}</span>
        </Link>

        {/* ---------- image: fills the whole card ---------- */}
        <div className="absolute inset-0 grid place-items-center p-3 pb-20 sm:pb-24">
          {image && !imgFailed ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className={`size-full object-contain transition-transform duration-500 ease-out group-hover/card:scale-105 group-focus-within/card:scale-105 ${
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

        {/* offer tag */}
        {onOffer && !outOfStock && (
          <span className="pointer-events-none absolute left-2 top-2 z-[5] inline-flex max-w-[44%] items-center gap-1 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-accent shadow-sm transition-transform duration-300 group-hover/card:scale-105 sm:left-3 sm:top-3 sm:px-2.5 sm:text-xs">
            <Tag size={12} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {pricing.sale?.name || pricing.discountName || (percent > 0 ? `${percent}% off` : 'Offer')}
            </span>
          </span>
        )}

        {/* stock tag */}
        {product.isCustom !== true && (outOfStock || (hasRemaining && remaining > 0)) && (
          <span
            aria-label={outOfStock ? 'Out of stock' : `${remaining} left in stock`}
            className={`pointer-events-none absolute right-2 top-2 z-[5] inline-flex max-w-[54%] items-center justify-center truncate whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm sm:right-3 sm:top-3 sm:text-xs ${
              outOfStock ? 'bg-text text-bg' : 'bg-surface text-muted'
            }`}
          >
            {outOfStock ? 'Out of stock' : `${remaining > 9 ? '9+' : remaining} left`}
          </span>
        )}

        {/* ---------- bottom panel: name + price, grows on hover ---------- */}
        {/* pointer-events-none lets clicks on the text fall through to the card link; buttons opt back in */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-border/60 bg-surface/85 px-2.5 pb-2.5 pt-2 backdrop-blur-md sm:px-4 sm:pb-3 sm:pt-3">
          <h3 className="line-clamp-1 break-words text-sm font-semibold leading-tight text-text transition-colors group-hover/card:line-clamp-2 group-hover/card:text-accent group-focus-within/card:line-clamp-2 sm:text-base [overflow-wrap:anywhere]">
            {product.name}
          </h3>

          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {onOffer && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {hasDrop && <span className="text-xs text-muted line-through">{money(originalPrice)}</span>}
                  {percent > 0 && (
                    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent sm:text-xs">
                      -{percent}%
                    </span>
                  )}
                </div>
              )}
              <p className="break-words text-base font-semibold leading-tight tabular-nums text-text sm:text-lg">
                {pricing.sale ? money(finalPrice) : product.priceFormat || money(finalPrice)}
              </p>
            </div>

            {/* touch screens (no hover): compact round buttons next to the price */}
            <div className="pointer-events-auto hidden shrink-0 items-center gap-1.5 [@media(hover:none)]:flex">
              {showCart && (
                <button
                  type="button"
                  onClick={() => onAddToCart(product)}
                  disabled={outOfStock || cartBusy}
                  aria-label={cartLabel}
                  title={cartTitle}
                  className={`grid size-9 place-items-center rounded-full shadow-sm transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                    lastOne ? 'bg-success text-white' : 'bg-brown text-on-brown'
                  }`}
                >
                  {inCart && !outOfStock ? (
                    <Check size={16} className="animate-rise" aria-hidden="true" />
                  ) : (
                    <ShoppingCart size={16} aria-hidden="true" />
                  )}
                </button>
              )}
              {showCustomize && (
                <button
                  type="button"
                  onClick={() => onCustomize(product)}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-text"
                >
                  Customize
                </button>
              )}
              {wishButton('size-9')}
            </div>
          </div>

          {/* hover / focus details: slides open (grid-rows 0fr -> 1fr); never shown on touch screens */}
          <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out group-hover/card:grid-rows-[1fr] group-hover/card:opacity-100 group-focus-within/card:grid-rows-[1fr] group-focus-within/card:opacity-100 motion-reduce:transition-none [@media(hover:none)]:hidden">
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-2 pt-2 sm:pt-3">
                {product.category && (
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{product.category}</p>
                )}

                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <Stars value={rating} hasReviews={hasReviews} />
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={12} aria-hidden="true" />
                    {reviews}
                    <span className="sr-only"> {reviews === 1 ? 'review' : 'reviews'}</span>
                  </span>
                </span>

                {(fresh || saved > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs leading-4">
                    {fresh && (
                      <span className="inline-flex min-w-0 items-center gap-1 text-muted">
                        <Clock size={12} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{fresh}</span>
                      </span>
                    )}
                    {saved > 0 && <span className="font-medium text-success">You save {money(saved)}</span>}
                  </div>
                )}

                {(showCart || showCustomize || onToggleWishlist) && (
                  <div className="pointer-events-auto flex items-center gap-1.5 pt-0.5">
                    {showCart && (
                      <button
                        type="button"
                        onClick={() => onAddToCart(product)}
                        disabled={outOfStock || cartBusy}
                        aria-label={cartLabel}
                        title={cartTitle}
                        className={`relative inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl px-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                          lastOne ? 'bg-success text-white hover:brightness-90' : 'bg-brown text-on-brown hover:bg-brown-hover'
                        }`}
                      >
                        {inCart && !outOfStock ? (
                          <Check size={18} className="shrink-0 animate-rise" aria-hidden="true" />
                        ) : (
                          <ShoppingCart size={18} className="shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">{outOfStock ? 'Sold out' : inCart ? 'Add one more' : 'Add to cart'}</span>
                      </button>
                    )}
                    {showCustomize && (
                      <button
                        type="button"
                        onClick={() => onCustomize(product)}
                        className="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-accent"
                      >
                        Customize
                      </button>
                    )}
                    {wishButton('size-10')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export default memo(ProductCard);

export function ProductCardSkeleton() {
  return (
    <li aria-hidden="true" className="min-w-0">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-surface-alt animate-pulse motion-reduce:animate-none">
        <div className="absolute inset-x-0 bottom-0 space-y-2 border-t border-border/60 bg-surface/70 p-2.5 sm:p-4">
          <div className="h-4 w-4/5 rounded-sm bg-surface-alt" />
          <div className="h-5 w-1/3 rounded-sm bg-surface-alt" />
        </div>
      </div>
    </li>
  );
}