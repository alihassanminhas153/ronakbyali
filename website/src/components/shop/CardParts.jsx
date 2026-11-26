// src/components/shop/CardParts.jsx   (pieces shared by FeaturedCard and DiscountedProductCard)
//
//   <WishlistButton />   heart button. variant "square" (white cards) or "glass" (over a photo); compact = smaller
//   <CartButton />       shopping-cart button. variant "square" (icon only) or "pill" (icon + label); compact = smaller.
//                        Custom products get a "Customize" button instead (calls onCustomize).
//   <CardBottom />       price block + heart + cart, used by the white cards
//   <SavingsRow />       "You save Rs 500" line
//   <ProductCardSkeleton /> loading placeholder shaped like the white card (an <li>)
//
// Everything clickable uses z-20 so it sits above the card's stretched link (z-10).

import { BadgePercent, Check, Heart, Loader2, Palette, ShoppingCart } from 'lucide-react';

import { money } from './CardShared';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface';
const FOCUS_PHOTO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';
const BASE =
  'pointer-events-auto relative z-20 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed motion-reduce:transition-none';

/* ---------------- wishlist ---------------- */

export function WishlistButton({ product, active = false, busy = false, onToggle, variant = 'square', compact = false }) {
  const look =
    variant === 'glass'
      ? `grid size-9 shrink-0 place-items-center rounded-full border border-white/30 backdrop-blur-md sm:size-10 ${
          active ? 'bg-white text-accent' : 'bg-white/20 text-white hover:bg-white/30'
        } ${FOCUS_PHOTO}`
      : `grid place-items-center border ${
          compact ? 'size-8 shrink-0 rounded-lg sm:size-9' : 'h-10 flex-1 rounded-xl sm:size-11 sm:flex-none'
        } ${
          active
            ? 'border-accent/40 bg-accent-soft text-accent'
            : 'border-border bg-surface text-text hover:border-accent/60 hover:text-accent'
        } ${FOCUS}`;

  return (
    <button
      type="button"
      onClick={() => onToggle?.(product)}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      title={active ? 'In your wishlist' : 'Add to wishlist'}
      className={`${BASE} disabled:cursor-wait disabled:opacity-70 ${look}`}
    >
      {busy ? (
        <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Heart size={18} className={active ? 'fill-current' : ''} aria-hidden="true" />
      )}
    </button>
  );
}

/* ---------------- cart / customize ---------------- */

export function CartButton({ product, data, inCart = false, busy = false, onAddToCart, onCustomize, variant = 'square', compact = false }) {
  const isCustom = product.isCustom === true;
  const soldOut = data.outOfStock && !isCustom;
  const pill = variant === 'pill';

  // ----- custom products: "Customize" -----
  if (isCustom) {
    return (
      <button
        type="button"
        onClick={() => onCustomize?.(product)}
        className={`${BASE} inline-flex items-center justify-center gap-2 font-semibold ${
          pill
            ? `h-9 flex-1 rounded-full bg-white px-3 text-xs text-neutral-900 hover:bg-white/90 sm:h-10 sm:text-sm ${FOCUS_PHOTO}`
            : `border border-accent/40 bg-accent-soft text-accent hover:bg-accent hover:text-on-accent ${
                compact
                  ? 'h-8 flex-1 gap-1.5 rounded-lg px-2.5 text-xs sm:h-9 sm:text-sm'
                  : 'h-10 flex-[2] rounded-xl px-3 text-sm sm:h-11 sm:min-w-[7.5rem] sm:flex-none'
              } ${FOCUS}`
        }`}
      >
        <Palette size={pill ? 16 : 18} aria-hidden="true" />
        Customize
      </button>
    );
  }

  const label = soldOut ? 'Sold out' : inCart ? 'In cart' : 'Add to cart';
  const spinner = <Loader2 size={pill ? 16 : 20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />;

  // ----- pill: icon + label (over a photo) -----
  if (pill) {
    return (
      <button
        type="button"
        onClick={() => onAddToCart?.(product)}
        disabled={soldOut || busy}
        className={`${BASE} inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold sm:h-10 sm:text-sm ${
          soldOut
            ? 'bg-white/25 text-white/70'
            : inCart
              ? 'bg-accent text-on-accent hover:brightness-110'
              : 'bg-white text-neutral-900 hover:bg-white/90'
        } ${FOCUS_PHOTO}`}
      >
        {busy ? spinner : <ShoppingCart size={16} aria-hidden="true" />}
        <span className="truncate">{label}</span>
        {inCart && !busy && !soldOut && <Check size={14} strokeWidth={3} aria-hidden="true" />}
      </button>
    );
  }

  // ----- square: icon only (white cards) -----
  return (
    <button
      type="button"
      onClick={() => onAddToCart?.(product)}
      disabled={soldOut || busy}
      aria-label={soldOut ? `${product.name} is sold out` : inCart ? `${product.name} is in your cart` : `Add ${product.name} to cart`}
      title={label}
      className={`${BASE} grid place-items-center border ${
        compact ? 'size-8 shrink-0 rounded-lg sm:size-9' : 'h-10 flex-1 rounded-xl sm:size-11 sm:flex-none'
      } ${
        soldOut
          ? 'border-border bg-surface-alt text-muted'
          : inCart
            ? 'border-accent/40 bg-accent-soft text-accent hover:border-accent'
            : 'border-accent bg-accent text-on-accent shadow-sm hover:brightness-110'
      } ${FOCUS}`}
    >
      {busy ? spinner : <ShoppingCart size={compact ? 17 : 20} aria-hidden="true" />}
      {inCart && !busy && !soldOut && (
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-on-accent ring-2 ring-surface">
          <Check size={10} strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

/* ---------------- savings ---------------- */

export function SavingsRow({ saved = 0 }) {
  return (
    <div className="mt-1.5 flex min-h-[1.25rem] items-center">
      {saved > 0 && (
        <span className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-success">
          <BadgePercent size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate">You save {money(saved)}</span>
        </span>
      )}
    </div>
  );
}

/* ---------------- price + actions (white cards) ---------------- */

export function CardBottom({
  product,
  data,
  accent = false,
  inCart = false,
  inWishlist = false,
  cartBusy = false,
  wishBusy = false,
  onAddToCart,
  onToggleWishlist,
  onCustomize,
}) {
  return (
    // phones: price on top, heart + cart side by side under it. From sm up: price left, buttons right.
    <div className="mt-auto flex flex-col gap-2.5 pt-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-h-[1.25rem] flex-wrap items-center gap-1.5">
          {data.hasDrop && (
            <>
              <span className="text-xs tabular-nums text-muted line-through sm:text-sm">{money(data.originalPrice)}</span>
              {data.percent > 0 && (
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums text-accent">
                  -{data.percent}%
                </span>
              )}
            </>
          )}
        </div>
        <p
          className={`break-words font-heading text-lg font-bold leading-tight tabular-nums sm:text-xl ${
            accent ? 'text-accent' : 'text-text'
          }`}
        >
          {data.priceText}
        </p>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <WishlistButton product={product} active={inWishlist} busy={wishBusy} onToggle={onToggleWishlist} />
        <CartButton
          product={product}
          data={data}
          inCart={inCart}
          busy={cartBusy}
          onAddToCart={onAddToCart}
          onCustomize={onCustomize}
        />
      </div>
    </div>
  );
}

/* ---------------- skeleton ---------------- */

export function ProductCardSkeleton() {
  return (
    <li className="min-w-0" aria-hidden="true">
      <div className="flex h-full animate-pulse flex-col rounded-2xl border border-border bg-surface p-1.5 shadow-soft motion-reduce:animate-none sm:p-2">
        <div className="aspect-[5/4] w-full rounded-xl bg-surface-alt" />
        <div className="px-1 pb-0.5 pt-2 sm:px-1.5">
          <div className="h-4 w-4/5 rounded bg-surface-alt" />
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-2.5 w-10 rounded bg-surface-alt" />
              <div className="h-4 w-16 rounded bg-surface-alt" />
            </div>
            <div className="flex gap-1.5">
              <div className="size-8 rounded-lg bg-surface-alt sm:size-9" />
              <div className="size-8 rounded-lg bg-surface-alt sm:size-9" />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}