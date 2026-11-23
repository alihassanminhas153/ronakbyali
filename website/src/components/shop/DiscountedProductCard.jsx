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
// DESIGN: "price tag". The photo fills the whole card. A price tag hangs off the left edge showing the
// percentage; it vibrates in short bursts (faster while the card is hovered). Under it a "Sale live"
// pill with a pulsing green dot. The panel is a light panel pinned flush to the bottom with an accent
// bar on top, so it looks clearly different from FeaturedCard's floating dark panel.
//   Resting:  only the name and the sale price with the old price struck through (small panel).
//   Hover / keyboard focus: the panel grows upward and shows the offer name, category, rating, reviews,
//             freshness, "You save ..." and the cart / wishlist buttons.
//   Phones and touch screens (no hover): the panel stays small, with round cart / heart buttons by the price.
// The tag and pill only appear while the product really is discounted. Animations (sale-vibrate, sale-buzz) are defined in index.css.
// costPrice is never shown.

import { memo } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Tag } from 'lucide-react';

import { selectSalesList } from '../../store/slices/saleSlice';
import useEntered from '../../ui/custom/motion/useEntered';
import { PAGE_SIZE } from './shopFilters';
import { CardImage, CardSkeleton, CompactActions, HoverDetails, StockTag, getCardData, money } from './CardShared';

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
  const d = getCardData(product, sales);
  if (!d) return null;

  const showOffer = d.onOffer && !d.outOfStock;
  const actions = { product, data: d, inCart, inWishlist, cartBusy, wishBusy, onAddToCart, onToggleWishlist, onCustomize };
  // the offer name is only worth showing when it says more than "25% off"
  const offerLabel = d.offerName && d.offerName !== `${d.percent}% off` && d.offerName !== 'Offer' ? d.offerName : '';

  return (
    <li
      className={`min-w-0 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <article
        className={`group/card relative isolate block aspect-[4/5] w-full min-w-0 overflow-hidden rounded-2xl border bg-surface-alt shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg focus-within:border-accent/60 sm:aspect-[3/4] ${
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

        {/* the photo fills the whole card */}
        <CardImage src={d.image} alt={product.name} dimmed={d.outOfStock} />

        {/* soft shade so the tags stay readable on any photo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/30 to-transparent"
        />

        {/* price tag (vibrates) + live pill (pulsing dot) */}
        {showOffer && (
          <div className="pointer-events-none absolute left-0 top-3 z-[5] flex flex-col items-start gap-2 sm:top-4">
            <span className="relative inline-flex origin-left animate-sale-vibrate items-baseline gap-1 rounded-r-xl will-change-transform group-hover/card:animate-sale-buzz group-focus-within/card:animate-sale-buzz motion-reduce:animate-none bg-accent py-1.5 pl-5 pr-3 font-heading leading-none text-on-accent shadow-md sm:py-2 sm:pl-6 sm:pr-3.5">
              {/* the hole in the tag */}
              <span
                aria-hidden="true"
                className="absolute left-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-bg/85 shadow-inner sm:left-2.5 sm:size-2"
              />
              {d.percent > 0 ? (
                <>
                  <span className="text-lg font-bold tabular-nums sm:text-2xl">-{d.percent}%</span>
                  <span className="text-[10px] font-semibold sm:text-xs">off</span>
                </>
              ) : (
                <span className="text-sm font-bold sm:text-base">Sale</span>
              )}
            </span>

            <span className="ml-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-text shadow-sm backdrop-blur-sm sm:ml-3 sm:text-xs">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Sale live
            </span>
          </div>
        )}

        <StockTag data={d} />

        {/* ---------- light panel, flush to the bottom: small at rest, grows on hover ---------- */}
        {/* pointer-events-none lets clicks on the text fall through to the card link; buttons opt back in */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t-[3px] border-accent bg-surface/90 px-3 pb-3 pt-2.5 backdrop-blur-md sm:px-4 sm:pb-4 sm:pt-3">
          <h3 className="line-clamp-2 min-h-[2.5rem] break-words font-heading text-sm font-semibold leading-5 text-text [overflow-wrap:anywhere] sm:min-h-0 sm:line-clamp-1 sm:text-base sm:leading-6 sm:group-hover/card:line-clamp-2 sm:group-focus-within/card:line-clamp-2">
            {product.name}
          </h3>

          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p
                className={`break-words font-heading text-base font-bold leading-tight tabular-nums sm:text-xl ${
                  showOffer ? 'text-accent' : 'text-text'
                }`}
              >
                {d.priceText}
              </p>
              {d.hasDrop && <span className="text-xs tabular-nums text-muted line-through">{money(d.originalPrice)}</span>}
            </div>
            <CompactActions actions={actions} tone="light" />
          </div>

          <HoverDetails actions={actions} tone="light">
            {showOffer && offerLabel && (
              <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                <Tag size={12} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{offerLabel}</span>
              </span>
            )}
          </HoverDetails>
        </div>
      </article>
    </li>
  );
}

export default memo(DiscountedProductCard);

export function DiscountedProductCardSkeleton() {
  return <CardSkeleton />;
}