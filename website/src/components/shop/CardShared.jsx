// src/components/shop/cardShared.jsx
//
// Pieces shared by FeaturedCard and DiscountedProductCard, copied from ProductCard so all three cards
// behave and look the same: pricing maths, stock rules, round buttons, the cart / customize / wishlist
// row, the stock tag and the full-bleed image.
//
// Nothing in here is a route or a page; it only holds small building blocks.

import { useState } from 'react';
import { Check, Clock, Heart, ImageOff, MessageSquare, Palette, ShoppingCart, Star } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import { getEffectivePricing } from '../../lib/saleMath';
import { getMainImageUrl } from '../../store/slices/productsSlice';
import { PATHS } from '../../router/path';

export const money = (v) => productService.formatPrice(v);

/* ---------- helpers ---------- */

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

/* ---------- data ---------- */

// Everything a card needs to know about a product. Pure function: call it after your hooks.
// `sales` is selectSalesList from the store. costPrice is never read.
export function getCardData(product, sales) {
  if (!product) return null;

  const remaining = product.remaining == null ? null : Number(product.remaining);
  const hasRemaining = remaining !== null && Number.isFinite(remaining);
  const isCustom = product.isCustom === true;
  const outOfStock = !isCustom && (product.status === 'outOfStock' || (hasRemaining && remaining <= 0));

  // `price` is the final price, `originalPrice` the one before the discount
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

  const reviews = Number(product.reviewCount) || 0;

  return {
    image: getMainImageUrl(product),
    link: PATHS.product(product.category, product.group, product.slug || product.$id),
    remaining,
    hasRemaining,
    isCustom,
    outOfStock,
    lastOne: remaining === 1 && !outOfStock,
    pricing,
    finalPrice,
    originalPrice,
    hasDrop,
    percent,
    onOffer: hasDrop || percent > 0,
    saved: hasDrop ? originalPrice - finalPrice : 0,
    priceText: pricing.sale ? money(finalPrice) : product.priceFormat || money(finalPrice),
    offerName: pricing.sale?.name || pricing.discountName || (percent > 0 ? `${percent}% off` : 'Offer'),
    reviews,
    rating: Number(product.ratingAverage) || 0,
    hasReviews: reviews > 0,
    fresh: freshness(product),
  };
}

/* ---------- small pieces ---------- */

export function Stars({ value, hasReviews, size = 14, trackCls = 'text-border' }) {
  const pct = hasReviews ? Math.max(0, Math.min(100, (Number(value) / 5) * 100)) : 0;
  const row = (cls) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} className={`shrink-0 ${cls}`} />
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex" role="img" aria-label={`Rated ${Number(value).toFixed(1)} out of 5`}>
      {row(trackCls)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row('fill-current text-warning')}
      </span>
    </span>
  );
}

export function RoundAction({ label, active, busy, onClick, children, activeCls, idleCls, sizeCls = 'size-10' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid ${sizeCls} shrink-0 place-items-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 ${
        active ? activeCls : idleCls || 'border-border bg-surface text-muted hover:border-accent/60 hover:text-accent'
      }`}
    >
      {children}
    </button>
  );
}

// Top-right tag: "Out of stock" or "3 left". Renders nothing for custom products.
export function StockTag({ data }) {
  const { isCustom, outOfStock, hasRemaining, remaining } = data;
  if (isCustom || !(outOfStock || (hasRemaining && remaining > 0))) return null;
  return (
    <span
      aria-label={outOfStock ? 'Out of stock' : `${remaining} left in stock`}
      className={`pointer-events-none absolute right-2.5 top-2.5 z-[5] inline-flex max-w-[48%] items-center truncate whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm sm:right-3 sm:top-3 sm:text-xs ${
        outOfStock ? 'bg-text text-bg' : 'bg-surface/90 text-muted backdrop-blur-sm'
      }`}
    >
      {outOfStock ? 'Out of stock' : `${remaining > 9 ? '9+' : remaining} left`}
    </span>
  );
}

// The picture fills the whole card (object-cover). Falls back to an icon if the URL fails.
export function CardImage({ src, alt, dimmed }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 grid place-items-center bg-surface-alt">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`size-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105 group-focus-within/card:scale-105 motion-reduce:transition-none ${
            dimmed ? 'opacity-60 grayscale' : ''
          }`}
        />
      ) : (
        <ImageOff size={40} className="text-muted/60" aria-hidden="true" />
      )}
    </div>
  );
}

// Button colours for the two panel styles: 'light' (glass panel) and 'dark' (denim panel).
const TONES = {
  light: {
    cart: 'bg-brown text-on-brown hover:bg-brown-hover',
    custom: 'border border-border bg-surface text-text hover:border-accent hover:text-accent',
    roundIdle: undefined,
    roundActive: 'border-accent bg-accent-soft text-accent',
  },
  dark: {
    cart: 'bg-on-brown text-brown hover:bg-on-brown/90',
    custom: 'border border-white/30 bg-white/10 text-on-brown hover:bg-white/20',
    roundIdle: 'border-white/30 bg-white/10 text-on-brown hover:bg-white/20',
    roundActive: 'border-on-brown bg-on-brown text-brown',
  },
};

// Cart / customize / wishlist buttons.
//   compact = small round buttons (phones and touch screens, beside the price)
//   default = full-width "Add to cart" button with a round heart (inside the hover details)
//   tone    = 'light' | 'dark', matches the panel the buttons sit on
// Renders nothing when there is nothing to show. Wrapped in pointer-events-auto because the panel
// around it lets clicks fall through to the card link.
export function ActionRow({
  product,
  data,
  compact = false,
  tone = 'light',
  inCart,
  inWishlist,
  cartBusy,
  wishBusy,
  onAddToCart,
  onToggleWishlist,
  onCustomize,
}) {
  const { outOfStock, lastOne, isCustom } = data;
  const showCart = !isCustom && Boolean(onAddToCart);
  const showCustomize = isCustom && Boolean(onCustomize);
  if (!showCart && !showCustomize && !onToggleWishlist) return null;

  const t = TONES[tone] || TONES.light;
  const cartLabel = outOfStock ? 'Out of stock' : inCart ? 'In your cart. Add one more' : 'Add to cart';
  const cartTitle = outOfStock ? 'Out of stock' : inCart ? 'In your cart' : 'Add to cart';
  const iconSize = compact ? 16 : 18;
  const cartColor = lastOne ? 'bg-success text-white hover:brightness-90' : t.cart;

  const wish = onToggleWishlist ? (
    <RoundAction
      label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      active={inWishlist}
      busy={wishBusy}
      onClick={() => onToggleWishlist(product)}
      activeCls={t.roundActive}
      idleCls={t.roundIdle}
      sizeCls={compact ? 'size-9' : 'size-10'}
    >
      <Heart size={iconSize} className={inWishlist ? 'fill-current' : ''} aria-hidden="true" />
    </RoundAction>
  ) : null;

  const cartIcon =
    inCart && !outOfStock ? (
      <Check size={iconSize} className="shrink-0 animate-rise" aria-hidden="true" />
    ) : (
      <ShoppingCart size={iconSize} className="shrink-0" aria-hidden="true" />
    );

  if (compact) {
    return (
      <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
        {showCart && (
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={outOfStock || cartBusy}
            aria-label={cartLabel}
            title={cartTitle}
            className={`grid size-9 place-items-center rounded-full shadow-sm transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${cartColor}`}
          >
            {cartIcon}
          </button>
        )}
        {showCustomize && (
          <button
            type="button"
            onClick={() => onCustomize(product)}
            aria-label="Customize"
            title="Customize"
            className={`grid size-9 place-items-center rounded-full ${t.custom}`}
          >
            <Palette size={16} aria-hidden="true" />
          </button>
        )}
        {wish}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      {showCart && (
        <button
          type="button"
          onClick={() => onAddToCart(product)}
          disabled={outOfStock || cartBusy}
          aria-label={cartLabel}
          title={cartTitle}
          className={`inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl px-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${cartColor}`}
        >
          {cartIcon}
          <span className="truncate">{outOfStock ? 'Sold out' : inCart ? 'Add one more' : 'Add to cart'}</span>
        </button>
      )}
      {showCustomize && (
        <button
          type="button"
          onClick={() => onCustomize(product)}
          className={`inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${t.custom}`}
        >
          <Palette size={16} className="shrink-0" aria-hidden="true" />
          Customize
        </button>
      )}
      {wish}
    </div>
  );
}

// The buttons that sit beside the price on phones and touch screens (no hover there).
export function CompactActions({ actions, tone }) {
  return (
    <div className="hidden max-sm:flex [@media(hover:none)]:flex">
      <ActionRow {...actions} compact tone={tone} />
    </div>
  );
}

// The part of the panel that stays closed until the card is hovered or focused. It slides open
// (grid-rows 0fr -> 1fr) and the panel grows upward over the photo. Never shown on phones or touch
// screens. Shows everything: category, rating, reviews, freshness, savings and the buttons.
//   tone     = 'light' | 'dark'
//   children = extra content for the top of the details (the offer name, for example)
export function HoverDetails({ actions, tone = 'light', children }) {
  const { product, data } = actions;
  const dark = tone === 'dark';
  const muted = dark ? 'text-on-brown/70' : 'text-muted';
  const { rating, reviews, hasReviews, fresh, saved } = data;

  return (
    <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out group-hover/card:grid-rows-[1fr] group-hover/card:opacity-100 group-focus-within/card:grid-rows-[1fr] group-focus-within/card:opacity-100 motion-reduce:transition-none max-sm:hidden [@media(hover:none)]:hidden">
      <div className="min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2 pt-3">
          {children}

          {product.category && <p className={`truncate text-xs font-medium ${muted}`}>{product.category}</p>}

          <span className={`inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs ${muted}`}>
            <Stars value={rating} hasReviews={hasReviews} trackCls={dark ? 'text-on-brown/25' : 'text-border'} />
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={12} aria-hidden="true" />
              {reviews}
              <span className="sr-only"> {reviews === 1 ? 'review' : 'reviews'}</span>
            </span>
          </span>

          {(fresh || saved > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs leading-4">
              {fresh && (
                <span className={`inline-flex min-w-0 items-center gap-1 ${muted}`}>
                  <Clock size={12} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{fresh}</span>
                </span>
              )}
              {saved > 0 && (
                <span className={`font-semibold ${dark ? 'text-on-brown' : 'text-success'}`}>You save {money(saved)}</span>
              )}
            </div>
          )}

          <div className="pt-0.5">
            <ActionRow {...actions} tone={tone} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading placeholder shared by both skeletons (renders its own <li>).
export function CardSkeleton() {
  return (
    <li aria-hidden="true" className="min-w-0">
      <div className="relative aspect-[4/5] w-full animate-pulse overflow-hidden rounded-2xl border border-border bg-surface-alt motion-reduce:animate-none sm:aspect-[3/4]">
        <div className="absolute inset-x-2 bottom-2 space-y-2 rounded-xl border border-border/60 bg-surface/70 p-3 sm:inset-x-3 sm:bottom-3 sm:p-4">
          <div className="h-3 w-1/3 rounded-sm bg-surface-alt" />
          <div className="h-4 w-4/5 rounded-sm bg-surface-alt" />
          <div className="h-5 w-1/3 rounded-sm bg-surface-alt" />
        </div>
      </div>
    </li>
  );
}