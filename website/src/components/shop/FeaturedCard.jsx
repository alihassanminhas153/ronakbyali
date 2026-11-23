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
// DESIGN: "denim and thread". The photo fills the whole card. A tan-stitched "Featured" patch with a
// slow light sweep sits top left. The panel is a dark indigo-denim glass panel floating over the photo
// with a dashed thread stitch around it.
//   Resting:  only the name and price (small panel).
//   Hover / keyboard focus: the panel grows upward and shows category, rating, reviews, freshness,
//             "You save ..." and the cart / wishlist buttons.
//   Phones and touch screens (no hover): the panel stays small, with round cart / heart buttons by the price.
// Animations (featured-sheen) are defined in index.css. costPrice is never shown.

import { memo } from 'react';
import { Link } from 'react-router';
import { useSelector } from 'react-redux';
import { Crown } from 'lucide-react';

import { selectSalesList } from '../../store/slices/saleSlice';
import useEntered from '../../ui/custom/motion/useEntered';
import { PAGE_SIZE } from './shopFilters';
import { CardImage, CardSkeleton, CompactActions, HoverDetails, StockTag, getCardData, money } from './CardShared';

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
  const d = getCardData(product, sales);
  if (!d) return null;

  const actions = { product, data: d, inCart, inWishlist, cartBusy, wishBusy, onAddToCart, onToggleWishlist, onCustomize };

  return (
    <li
      className={`min-w-0 transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <article className="group/card relative isolate block aspect-[4/5] w-full min-w-0 overflow-hidden rounded-2xl border border-thread/40 bg-surface-alt shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-thread hover:shadow-lg focus-within:border-thread sm:aspect-[3/4]">
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

        {/* soft shade so the panel and tags stay readable on any photo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
        />

        {/* featured patch: denim label with a stitched edge */}
        <span className="pointer-events-none absolute left-2.5 top-2.5 z-[5] inline-flex items-center gap-1.5 overflow-hidden rounded-md bg-brown px-2.5 py-1.5 text-[11px] font-semibold text-on-brown shadow-sm outline-dashed outline-1 outline-offset-[-3px] outline-thread/80 after:pointer-events-none after:absolute after:inset-0 after:animate-featured-sheen after:bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.38)_50%,transparent_65%)] after:content-[''] motion-reduce:after:hidden sm:left-3 sm:top-3 sm:text-xs">
          <Crown size={13} className="shrink-0 text-thread" aria-hidden="true" />
          Featured
        </span>

        <StockTag data={d} />

        {/* ---------- denim panel: small at rest, grows on hover ---------- */}
        {/* pointer-events-none lets clicks on the text fall through to the card link; buttons opt back in */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 rounded-xl border border-dashed border-thread/60 bg-brown/85 px-3 py-2.5 text-on-brown shadow-soft backdrop-blur-md sm:inset-x-3 sm:bottom-3 sm:px-4 sm:py-3">
          <h3 className="line-clamp-2 min-h-[2.5rem] break-words font-heading text-sm font-semibold leading-5 text-on-brown [overflow-wrap:anywhere] sm:min-h-0 sm:line-clamp-1 sm:text-base sm:leading-6 sm:group-hover/card:line-clamp-2 sm:group-focus-within/card:line-clamp-2">
            {product.name}
          </h3>

          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="break-words font-heading text-base font-semibold leading-tight tabular-nums text-on-brown sm:text-lg">
                {d.priceText}
              </p>
              {d.hasDrop && (
                <span className="hidden text-xs text-on-brown/60 line-through sm:inline">{money(d.originalPrice)}</span>
              )}
            </div>
            <CompactActions actions={actions} tone="dark" />
          </div>

          <HoverDetails actions={actions} tone="dark" />
        </div>
      </article>
    </li>
  );
}

export default memo(FeaturedCard);

export function FeaturedCardSkeleton() {
  return <CardSkeleton />;
}