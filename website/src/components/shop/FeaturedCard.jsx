// src/components/shop/FeaturedCard.jsx   (storefront card for hand-picked / featured products)
//
// USAGE (inside a grid or carousel <ul>; the card renders its own <li>)
//   <FeaturedCard
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
//   <FeaturedCardSkeleton />          // loading placeholder, also an <li>
//
// DESIGN: soft "glass" poster card. The photo fills a tall, very rounded card. The bottom of the photo
// melts into a blurred dark glass fade, and the text sits centred on it: name, price (old price struck
// through with a "-10%" chip when reduced) and a row with the round heart and a white pill button
// (Add to cart with the shopping-cart icon, or Customize for custom products). A glass "Featured"
// chip sits top left. The whole card is a link; the heart and the pill sit above it.
// costPrice is never shown.

import { memo } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Crown } from 'lucide-react';

import { selectSalesList } from '../../store/slices/saleSlice';
import useEntered from '../../ui/custom/motion/useEntered';
import { PAGE_SIZE } from './shopFilters';
import { useDesignAddToCart } from './DesignChooser';
import { CardImage, StockTag, getCardData, money } from './CardShared';
import { CartButton, WishlistButton } from './CardParts';

function FeaturedCard({
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

  return (
    <li
      className={`min-w-0 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <article className="group/card relative isolate block aspect-[3/4.6] w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-border bg-surface-alt shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg focus-within:border-thread sm:aspect-[3/4.2] [&_img]:transition-transform [&_img]:duration-500 hover:[&_img]:scale-105 motion-reduce:transition-none motion-reduce:[&_img]:transition-none">
        {/* whole card is a link; the buttons sit above it */}
        <Link
          to={d.link}
          tabIndex={isDuplicate ? -1 : undefined}
          aria-label={`View ${product.name}`}
          className="absolute inset-0 z-10 rounded-[1.75rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-3px]"
        >
          <span className="sr-only">View {product.name}</span>
        </Link>

        {/* the photo fills the whole card */}
        <CardImage src={d.image} alt={product.name} dimmed={d.outOfStock} />

        {/* soft shade at the top so the chip stays readable */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/30 to-transparent"
        />

        {/* glass fade: the photo blurs and darkens towards the bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-black/80 via-black/45 to-transparent backdrop-blur-[6px] [-webkit-mask-image:linear-gradient(to_top,#000_55%,transparent)] [mask-image:linear-gradient(to_top,#000_55%,transparent)]"
        />

        {/* featured chip */}
        <span className="pointer-events-none absolute left-3 top-3 z-[5] inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md sm:text-xs">
          <Crown size={12} className="shrink-0 text-thread" aria-hidden="true" />
          Featured
        </span>

        <StockTag data={d} />

        {/* centred text + actions */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-3 pb-3 text-center sm:px-4 sm:pb-4">
          <h3 className="line-clamp-1 min-h-5 w-full break-words font-heading text-sm font-semibold leading-5 text-white [overflow-wrap:anywhere] sm:line-clamp-2 sm:min-h-[2.5rem] sm:text-base">
            {product.name}
          </h3>

          <div className="mt-1 flex min-h-[1.75rem] flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
            <p className="break-words font-heading text-lg font-bold leading-tight tabular-nums text-white sm:text-xl">
              {d.priceText}
            </p>
            {d.hasDrop && (
              <>
                <span className="text-xs tabular-nums text-white/70 line-through">{money(d.originalPrice)}</span>
                {d.percent > 0 && (
                  <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-white">
                    -{d.percent}%
                  </span>
                )}
              </>
            )}
          </div>

          <div className="mt-2.5 flex w-full items-center gap-2">
            <WishlistButton
              product={product}
              active={inWishlist}
              busy={wishBusy}
              onToggle={onToggleWishlist}
              variant="glass"
            />
            <CartButton
              product={product}
              data={d}
              inCart={inCart}
              busy={cartBusy}
              onAddToCart={onAddToCart}
              onCustomize={onCustomize}
              variant="pill"
            />
          </div>
        </div>
      </article>
      {design.element}
    </li>
  );
}

export default memo(FeaturedCard);

export function FeaturedCardSkeleton() {
  return (
    <li className="min-w-0" aria-hidden="true">
      <div className="aspect-[3/4.6] w-full animate-pulse rounded-[1.75rem] border border-border bg-surface-alt shadow-soft motion-reduce:animate-none sm:aspect-[3/4.2]" />
    </li>
  );
}