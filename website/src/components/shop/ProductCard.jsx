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
//     onCustomize={(p) => ...}         // custom products only
//   />
//   <ProductCardSkeleton />           // loading placeholder, also an <li>
//
// The cart and heart buttons only appear when onAddToCart / onToggleWishlist are passed.
// costPrice is never shown here.
//
// LAYOUT
//   Badges   top-left: offer tag, then stock tag (stacked, so they never overlap the heart).
//   Heart    top-right, a glass round button. On hover-capable screens it fades in on hover / keyboard
//            focus (and stays visible once the product is in the wishlist). On touch it is always there.
//
//   Image    sits on a rounded stage inset from the card edge, with rounded corners of its own; it fades in
//            once loaded.
//
//   Phones (below sm, 640px): stacked card. Image on top (4:5), then a content box of FIXED height:
//            name (2 lines), price + round cart / customize button, one info line ("You save ..." or rating).
//   sm and up with a mouse: the image fills the card and a floating glass panel sits at the bottom with the
//            name and price. On hover / focus the panel grows upward and reveals category, rating, freshness,
//            "You save ..." and a full-width cart / customize button.
//   sm and up on touch (tablets): same floating panel, but compact, with a round cart button by the price.
//
// Product columns used: name, slug, category, group, imageIds, price, originalPrice,
// discountPercentage, discountName, status, remaining, ratingAverage, reviewCount, isCustom,
// $createdAt, $updatedAt.

import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Check, Clock, Heart, ImageOff, MessageSquare, Palette, ShoppingCart, Star, Tag } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import { getEffectivePricing } from '../../lib/saleMath';
import { isProductOutOfStock } from '../../lib/productStock';
import { selectSalesList } from '../../store/slices/saleSlice';
import { getMainImageUrl } from '../../store/slices/productsSlice';
import { PATHS } from '../../router/path';
import useEntered from '../../ui/custom/motion/useEntered';
import { PAGE_SIZE } from './shopFilters';
import { useDesignAddToCart } from './DesignChooser';

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

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

// Details that slide in when the card is hovered or keyboard-focused. Each row rises and fades in a little
// after the one before it; on leaving there is no delay, so the card closes quickly.
// (Only keyboard focus opens the card, so a mouse click on a button does not leave it stuck open.)
const REVEAL =
  'translate-y-2 opacity-0 transition-[opacity,transform] duration-300 ease-out motion-reduce:translate-y-0 motion-reduce:transition-none group-hover/card:translate-y-0 group-hover/card:opacity-100 group-has-[:focus-visible]/card:translate-y-0 group-has-[:focus-visible]/card:opacity-100';
const REVEAL_1 = `${REVEAL} group-hover/card:delay-75`;
const REVEAL_2 = `${REVEAL} group-hover/card:delay-150`;
const REVEAL_3 = `${REVEAL} group-hover/card:delay-200`;

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

// Round glass button (the wishlist heart).
function RoundAction({ label, active, busy, onClick, children, activeCls, sizeCls = 'size-10' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid ${sizeCls} shrink-0 touch-manipulation place-items-center rounded-full border shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:scale-100 ${FOCUS} ${
        active ? activeCls : 'border-border/70 bg-surface/90 text-muted hover:border-accent/60 hover:text-accent'
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
  const [imgLoaded, setImgLoaded] = useState(false);
  // an image that is already cached has finished loading before React can listen for it
  const imgRef = useCallback((el) => {
    if (el && el.complete && el.naturalWidth > 0) setImgLoaded(true);
  }, []);
  const sales = useSelector(selectSalesList);
  const design = useDesignAddToCart(product, onAddToCart);
  onAddToCart = design.onAddToCart;
  if (!product) return null;

  const image = getMainImageUrl(product);
  const remaining = product.remaining == null ? null : Number(product.remaining);
  const hasRemaining = remaining !== null && Number.isFinite(remaining);
  const outOfStock = isProductOutOfStock(product);
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
  const showStockTag = outOfStock || (product.isCustom !== true && hasRemaining && remaining > 0);
  const lastOne = remaining === 1 && !outOfStock;
  const cartLabel = outOfStock ? 'Out of stock' : inCart ? 'In your cart. Add one more' : 'Add to cart';
  const cartTitle = outOfStock ? 'Out of stock' : inCart ? 'In your cart' : 'Add to cart';
  const customizeLabel = outOfStock ? `${product.name} is out of stock` : `Customize ${product.name}`;

  return (
    <li
      className={`min-w-0 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <article className="group/card relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface-alt/60 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg focus-within:border-accent/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:block sm:aspect-[3/4]">
        {/* whole card is a link; the buttons sit above it (z-20) */}
        <Link
          to={link}
          tabIndex={isDuplicate ? -1 : undefined}
          aria-label={`View ${product.name}`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        >
          <span className="sr-only">View {product.name}</span>
        </Link>

        {/* ---------- image ---------- */}
        {/* The picture sits on a rounded "stage" inset from the card edge, so it never touches the border.
            phones: a 4:5 block at the top. sm and up: the stage fills the card behind the floating panel. */}
        <div className="relative aspect-[4/5] w-full shrink-0 p-2 sm:absolute sm:inset-0 sm:aspect-auto">
          <div className="relative size-full overflow-hidden rounded-xl bg-gradient-to-b from-surface to-surface-alt ring-1 ring-inset ring-border/50">
            {/* soft placeholder until the picture has loaded */}
            {image && !imgFailed && !imgLoaded && (
              <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-surface-alt/70 motion-reduce:animate-none" />
            )}
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5 sm:pb-[7.5rem]">
              {image && !imgFailed ? (
                <img
                  ref={imgRef}
                  src={image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgFailed(true)}
                  className={`max-h-full max-w-full rounded-lg object-contain transition duration-500 ease-out group-hover/card:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  } ${outOfStock ? '!opacity-60 grayscale' : ''}`}
                />
              ) : (
                <ImageOff size={36} className="text-muted/60" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        {/* light sweep on hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/2 hidden w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-bg/30 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-[130%] group-hover/card:opacity-100 motion-reduce:hidden sm:block"
        />

        {/* badges: offer first, stock under it */}
        {((onOffer && !outOfStock) || showStockTag) && (
          <div className="pointer-events-none absolute left-3.5 top-3.5 z-[5] flex max-w-[calc(100%-4.5rem)] flex-col items-start gap-1 sm:left-4 sm:top-4 sm:max-w-[calc(100%-5.5rem)]">
            {onOffer && !outOfStock && (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-accent shadow-sm sm:px-2.5 sm:text-xs">
                <Tag size={12} className="shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {pricing.sale?.name || pricing.discountName || (percent > 0 ? `${percent}% off` : 'Offer')}
                </span>
              </span>
            )}
            {showStockTag && (
              <span
                aria-label={outOfStock ? 'Out of stock' : `${remaining} left in stock`}
                className={`inline-flex max-w-full items-center truncate whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm sm:px-2.5 sm:text-xs ${
                  outOfStock ? 'bg-text text-bg' : 'border border-border/70 bg-surface/90 text-muted backdrop-blur-sm'
                }`}
              >
                {outOfStock ? 'Out of stock' : `${remaining > 9 ? '9+' : remaining} left`}
              </span>
            )}
          </div>
        )}

        {/* wishlist heart: always visible on touch; fades in on hover / keyboard focus with a mouse (stays if saved) */}
        {onToggleWishlist && (
          <div
            className={`absolute right-3.5 top-3.5 z-20 transition-opacity duration-200 motion-reduce:transition-none sm:right-4 sm:top-4 ${
              inWishlist
                ? ''
                : 'sm:[@media(hover:hover)]:opacity-0 sm:[@media(hover:hover)]:group-hover/card:opacity-100 sm:[@media(hover:hover)]:group-has-[:focus-visible]/card:opacity-100'
            }`}
          >
            <RoundAction
              label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              active={inWishlist}
              busy={wishBusy}
              onClick={() => onToggleWishlist(product)}
              activeCls="border-accent bg-accent-soft text-accent"
              sizeCls="size-9 sm:size-10"
            >
              <Heart size={18} className={inWishlist ? 'fill-current' : ''} aria-hidden="true" />
            </RoundAction>
          </div>
        )}

        {/* ---------- bottom panel ---------- */}
        {/* phones: fixed-height box under the image. sm and up: floating glass panel inside the image stage that
            opens upward on hover. pointer-events-none lets clicks on the text fall through to the card link;
            buttons opt back in. */}
        <div className="pointer-events-none relative z-20 h-[7.5rem] shrink-0 overflow-hidden border-t border-border/60 bg-surface/90 px-3 pb-2.5 pt-2.5 backdrop-blur-md sm:absolute sm:inset-x-3.5 sm:bottom-3.5 sm:h-auto sm:max-h-[86%] sm:rounded-xl sm:border sm:border-border/60 sm:bg-surface/80 sm:px-4 sm:pb-3.5 sm:pt-3.5 sm:shadow-soft sm:backdrop-blur-xl sm:transition-[background-color,border-color,box-shadow] sm:duration-300 sm:group-hover/card:border-accent/30 sm:group-hover/card:bg-surface/90 sm:group-hover/card:shadow-lg sm:group-has-[:focus-visible]/card:border-accent/30 sm:group-has-[:focus-visible]/card:bg-surface/90 motion-reduce:transition-none">
          {/* accent line that draws in on hover */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 hidden h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-500 ease-out group-hover/card:scale-x-100 group-has-[:focus-visible]/card:scale-x-100 motion-reduce:transition-none sm:block"
          />

          {/* same two-line clamp open or closed, so the name never jumps when the panel opens */}
          <h3 className="line-clamp-2 min-h-[2.2rem] break-words text-sm font-semibold leading-tight text-text transition-colors [overflow-wrap:anywhere] sm:min-h-0 sm:text-base sm:group-hover/card:text-accent">
            {product.name}
          </h3>

          <div className="mt-1.5 flex min-h-9 items-center justify-between gap-2 sm:min-h-0 sm:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="break-words text-[15px] font-semibold leading-tight tabular-nums text-text sm:text-lg">
                  {pricing.sale ? money(finalPrice) : product.priceFormat || money(finalPrice)}
                </p>
                {hasDrop && <span className="hidden text-xs tabular-nums text-muted line-through sm:inline">{money(originalPrice)}</span>}
                {percent > 0 && (
                  <span className="hidden rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent sm:inline sm:text-xs">
                    -{percent}%
                  </span>
                )}
              </div>
            </div>

            {/* phones and touch screens: one compact round action next to the price */}
            <div className="pointer-events-auto hidden shrink-0 items-center max-sm:flex [@media(hover:none)]:flex">
              {showCart && (
                <button
                  type="button"
                  onClick={() => onAddToCart(product)}
                  disabled={outOfStock || cartBusy}
                  aria-label={cartLabel}
                  title={cartTitle}
                  className={`grid size-9 touch-manipulation place-items-center rounded-full shadow-sm transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${FOCUS} ${
                    lastOne ? 'bg-success text-white' : 'bg-brown text-on-brown'
                  }`}
                >
                  {inCart && !outOfStock ? (
                    <Check size={17} className="animate-rise" aria-hidden="true" />
                  ) : (
                    <ShoppingCart size={17} aria-hidden="true" />
                  )}
                </button>
              )}
              {showCustomize && (
                <button
                  type="button"
                  onClick={() => onCustomize(product)}
                  disabled={outOfStock}
                  aria-label={customizeLabel}
                  title={outOfStock ? 'Out of stock' : 'Customize'}
                  className={`inline-flex size-9 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-border bg-surface text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 sm:size-auto sm:h-9 sm:px-3.5 ${FOCUS}`}
                >
                  <Palette size={16} className="shrink-0" aria-hidden="true" />
                  <span className="max-sm:sr-only">Customize</span>
                </button>
              )}
            </div>
          </div>

          {/* info line: phones and touch screens only. With a mouse the details below take its place. */}
          <div className="hidden max-sm:block [@media(hover:none)]:block">
            {saved > 0 ? (
              <p className="mt-1 flex h-4 items-center truncate text-xs font-medium leading-4 text-success">You save {money(saved)}</p>
            ) : (
              <p className="mt-1 flex h-4 items-center gap-1 truncate text-xs leading-4 text-muted">
                {hasReviews ? (
                  <>
                    <Star size={12} className="shrink-0 fill-current text-warning" aria-hidden="true" />
                    <span className="tabular-nums">
                      {rating.toFixed(1)} ({reviews})
                    </span>
                  </>
                ) : (
                  <span className="truncate">{product.category || ''}</span>
                )}
              </p>
            )}
          </div>

          {/* hover / focus details: the panel opens upward (grid-rows 0fr -> 1fr on a smooth ease-out curve) while
              each row rises into place one after the other. Not rendered on phones or touch screens. */}
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:grid-rows-[1fr] group-has-[:focus-visible]/card:grid-rows-[1fr] motion-reduce:transition-none max-sm:hidden [@media(hover:none)]:hidden">
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-2.5 border-t border-border/50 pt-3 mt-3">
                <div className={`flex items-center justify-between gap-2 ${REVEAL_1}`}>
                  {product.category ? (
                    <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{product.category}</p>
                  ) : (
                    <span />
                  )}
                  {fresh && (
                    <span className="hidden min-w-0 shrink-0 items-center gap-1 text-[11px] text-muted lg:inline-flex">
                      <Clock size={12} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">{fresh}</span>
                    </span>
                  )}
                </div>

                <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted ${REVEAL_2}`}>
                  {hasReviews ? (
                    <>
                      <Stars value={rating} hasReviews={hasReviews} />
                      <span className="font-semibold tabular-nums text-text">{rating.toFixed(1)}</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare size={12} aria-hidden="true" />
                        {reviews}
                        <span className="sr-only"> {reviews === 1 ? 'review' : 'reviews'}</span>
                      </span>
                    </>
                  ) : (
                    <span>No reviews yet</span>
                  )}
                  {saved > 0 && <span className="ml-auto font-medium text-success">You save {money(saved)}</span>}
                </div>

                {(showCart || showCustomize) && (
                  <div className={`pointer-events-auto ${REVEAL_3}`}>
                    {showCart && (
                      <button
                        type="button"
                        onClick={() => onAddToCart(product)}
                        disabled={outOfStock || cartBusy}
                        aria-label={cartLabel}
                        title={cartTitle}
                        className={`inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${FOCUS} ${
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
                        disabled={outOfStock}
                        aria-label={customizeLabel}
                        className={`inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
                      >
                        <Palette size={17} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{outOfStock ? 'Out of stock' : 'Customize'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
      {design.element}
    </li>
  );
}

export default memo(ProductCard);

export function ProductCardSkeleton() {
  return (
    <li aria-hidden="true" className="min-w-0">
      <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-alt animate-pulse motion-reduce:animate-none sm:block sm:aspect-[3/4]">
        <div className="aspect-[4/5] p-2 sm:hidden">
          <div className="size-full rounded-xl bg-surface/60" />
        </div>
        <div className="h-[7.5rem] space-y-2 border-t border-border/60 bg-surface/70 p-3 sm:absolute sm:inset-x-3.5 sm:bottom-3.5 sm:h-auto sm:rounded-xl sm:border sm:p-4">
          <div className="h-4 w-4/5 rounded-sm bg-surface-alt" />
          <div className="h-5 w-1/3 rounded-sm bg-surface-alt" />
        </div>
      </div>
    </li>
  );
}