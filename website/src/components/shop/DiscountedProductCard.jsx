// src/components/shop/DiscountedProductCard.jsx   (storefront card for products on offer)
//
// USAGE (inside a grid or carousel <ul>; the card renders its own <li>)
//   <DiscountedProductCard
//     product={product}
//     index={i}                        // staggers the entrance
//     inCart={cartIds.has(product.$id)}
//     inWishlist={wishIds.has(product.$id)}
//     cartBusy={false}
//     wishBusy={false}
//     onAddToCart={(p) => ...}
//     onToggleWishlist={(p) => ...}
//     onCustomize={(p) => ...}         // only used for custom products
//   />
//   <DiscountedProductCardSkeleton /> // loading placeholder, also an <li>
//
// DESIGN: compact, no empty space. A 5:4 photo carries everything about the offer: the "-25%" badge
// (top left) and a "Save Rs 500" chip (bottom left). Under it there is only the name (one line), the
// struck-through old price over the sale price, and small heart + shopping-cart buttons on the same
// row. For custom products the Customize button takes its own full-width row under the price.
// Sizes step up from phones to desktop, so the card holds together down to ~130px wide.
// The badge and the saving only show while the product really is discounted. costPrice is never shown.

import { memo } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';

import { selectSalesList } from '../../store/slices/saleSlice';
import useEntered from '../../ui/custom/motion/useEntered';
import { getEffectivePricing } from '../../lib/saleMath';
import { PAGE_SIZE } from './shopFilters';
import { useDesignAddToCart } from './DesignChooser';
import { CardImage, StockTag, getCardData, money } from './CardShared';
import { CartButton, ProductCardSkeleton, WishlistButton } from './CardParts';

function DiscountedProductCard({
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
  const sales = useSelector(selectSalesList);
  const design = useDesignAddToCart(product, onAddToCart);
  onAddToCart = design.onAddToCart;
  const d = getCardData(product, sales);
  if (!d) return null;

  const showOffer = d.onOffer && !d.outOfStock;
  const isCustom = product.isCustom === true;
  // the offer name is only worth showing when it says more than "25% off"
  const offerLabel = d.offerName && d.offerName !== `${d.percent}% off` && d.offerName !== 'Offer' ? d.offerName : '';

  // how much the customer saves: old price minus the price they pay now
  const pricing = getEffectivePricing(product, sales);
  const saved =
    !d.outOfStock && pricing.price > 0 && pricing.originalPrice > pricing.price
      ? pricing.originalPrice - pricing.price
      : 0;

  return (
    <li
      className={`min-w-0 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <article
        className={`group/card relative isolate flex h-full w-full min-w-0 flex-col rounded-2xl border bg-surface p-1.5 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg focus-within:border-accent/60 motion-reduce:transition-none sm:p-2 ${
          showOffer ? 'border-accent/30' : 'border-border'
        }`}
      >
        {/* whole card is a link; the buttons sit above it */}
        <Link
          to={d.link}
          tabIndex={isDuplicate ? -1 : undefined}
          aria-label={`View ${product.name}`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-3px]"
        >
          <span className="sr-only">View {product.name}</span>
        </Link>

        {/* photo: badge top left, saving bottom left */}
        <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden rounded-xl bg-surface-alt group-hover/card:[&_img]:scale-105 [&_img]:transition-transform [&_img]:duration-500 motion-reduce:[&_img]:transition-none">
          <CardImage src={d.image} alt={product.name} dimmed={d.outOfStock} />

          {/* soft shade so the chips stay readable on any photo */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent"
          />

          {showOffer && (
            <span
              title={offerLabel || undefined}
              className="pointer-events-none absolute left-1.5 top-1.5 z-[5] rounded-full bg-accent px-2 py-0.5 font-heading text-[11px] font-bold leading-5 tabular-nums text-on-accent shadow-sm sm:left-2 sm:top-2 sm:px-2.5 sm:text-sm"
            >
              {d.percent > 0 ? `-${d.percent}%` : 'Sale'}
            </span>
          )}

          {saved > 0 && (
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-[5] max-w-[calc(100%-0.75rem)] truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold leading-4 tabular-nums text-white backdrop-blur-sm sm:bottom-2 sm:left-2 sm:text-xs">
              Save {money(saved)}
            </span>
          )}

          <StockTag data={d} />
        </div>

        {/* details */}
        <div className="pointer-events-none flex flex-1 flex-col px-1 pb-0.5 pt-2 sm:px-1.5">
          <h3
            title={product.name}
            className="line-clamp-1 break-words font-heading text-[13px] font-medium leading-5 text-text [overflow-wrap:anywhere] sm:text-sm"
          >
            {product.name}
          </h3>

          <div className={`mt-auto flex gap-1.5 pt-1.5 ${isCustom ? 'flex-col' : 'items-end justify-between'}`}>
            <div className="min-w-0">
              {d.hasDrop && (
                <p className="text-[11px] leading-none tabular-nums text-muted line-through sm:text-xs">
                  {money(d.originalPrice)}
                </p>
              )}
              <p
                className={`break-words font-heading text-[15px] font-bold leading-tight tabular-nums sm:text-lg ${
                  d.hasDrop ? 'mt-0.5' : ''
                } ${showOffer ? 'text-accent' : 'text-text'}`}
              >
                {d.priceText}
              </p>
            </div>

            <div className={`flex items-center gap-1.5 ${isCustom ? 'w-full' : 'shrink-0'}`}>
              <WishlistButton
                product={product}
                active={inWishlist}
                busy={wishBusy}
                onToggle={onToggleWishlist}
                compact
              />
              <CartButton
                product={product}
                data={d}
                inCart={inCart}
                busy={cartBusy}
                onAddToCart={onAddToCart}
                onCustomize={onCustomize}
                compact
              />
            </div>
          </div>
        </div>
      </article>
      {design.element}
    </li>
  );
}

export default memo(DiscountedProductCard);

export function DiscountedProductCardSkeleton() {
  return <ProductCardSkeleton />;
}