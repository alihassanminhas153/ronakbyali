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
// DESIGN: white rounded card with an inset square photo and an "On sale" / offer-name pill on it.
// Under the name it shows "You save Rs ..." (the difference between the old and the sale price), then
// the struck-through old price with the "-25%" chip, the sale price in the accent colour, and the
// heart + shopping-cart buttons side by side (Customize replaces the cart for custom products).
// The pill and the savings only show while the product really is discounted.
// The whole card is a link; the buttons sit above it. costPrice is never shown.

import { memo } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Tag } from 'lucide-react';

import { selectSalesList } from '../../store/slices/saleSlice';
import useEntered from '../../ui/custom/motion/useEntered';
import { getEffectivePricing } from '../../lib/saleMath';
import { PAGE_SIZE } from './shopFilters';
import { useDesignAddToCart } from './DesignChooser';
import { CardImage, StockTag, getCardData } from './CardShared';
import { CardBottom, ProductCardSkeleton, SavingsRow } from './CardParts';

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
  // the offer name is only worth showing when it says more than "25% off"
  const offerLabel = d.offerName && d.offerName !== `${d.percent}% off` && d.offerName !== 'Offer' ? d.offerName : 'On sale';

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
        className={`group/card relative isolate flex w-full min-w-0 flex-col rounded-2xl border bg-surface px-2 pb-1 pt-2 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg focus-within:border-accent/60 motion-reduce:transition-none sm:px-2.5 sm:pt-2.5 ${
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

        {/* photo */}
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-surface-alt group-hover/card:[&_img]:scale-105 [&_img]:transition-transform [&_img]:duration-500 motion-reduce:[&_img]:transition-none">
          <CardImage src={d.image} alt={product.name} dimmed={d.outOfStock} />

          {showOffer && (
            <span className="pointer-events-none absolute left-2 top-2 z-[5] inline-flex max-w-[75%] items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-on-accent shadow-sm sm:text-xs">
              <Tag size={12} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{offerLabel}</span>
            </span>
          )}

          <StockTag data={d} />
        </div>

        {/* details */}
        <div className="pointer-events-none flex flex-col px-1.5 pt-3 sm:px-2">
          <h3
            title={product.name}
            className="h-5 truncate font-heading text-sm font-medium leading-5 text-text sm:text-[15px]"
          >
            {product.name}
          </h3>
          <SavingsRow saved={saved} />
          <CardBottom
            product={product}
            data={d}
            accent={showOffer}
            inCart={inCart}
            inWishlist={inWishlist}
            cartBusy={cartBusy}
            wishBusy={wishBusy}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            onCustomize={onCustomize}
          />
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