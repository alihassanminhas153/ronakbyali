import { memo, useState } from 'react';
import { Link } from 'react-router';
import { ImageOff } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import { getMainImageUrl } from '../../store/slices/productsSlice';
import { PATHS } from '../../router/path';
import useEntered from '../../ui/custom/motion/useEntered';
import { PAGE_SIZE } from './shopFilters';

// One product in the storefront grid. costPrice is never shown here.
//   index -> position in the list; the stagger restarts every page so
//            "Load more" results do not wait behind the earlier ones.
const ProductCard = memo(function ProductCard({ product, index = 0 }) {
  const entered = useEntered((index % PAGE_SIZE) * 40);
  const [brokenSrc, setBrokenSrc] = useState('');

  const src = getMainImageUrl(product);
  const showImage = src && src !== brokenSrc;

  const remaining = Number(product.remaining) || 0;
  const out = product.status === 'outOfStock' || remaining <= 0;
  const low = !out && remaining <= 5;
  const discount = Number(product.discountPercentage) || 0;

  // The long URL carries the slug as :productId (Product.jsx looks it up by slug).
  const to = PATHS.product(product.category, product.group, product.slug || product.$id);

  return (
    <li
      className={`transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <Link
        to={to}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-accent/50 hover:bg-surface-alt/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-alt">
          {showImage ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              onError={() => setBrokenSrc(src)}
              className={`size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
                out ? 'opacity-60' : ''
              }`}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted">
              <ImageOff size={28} aria-hidden="true" />
            </div>
          )}

          {out ? (
            <span className="absolute left-2 top-2 rounded-sm border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted">
              Out of stock
            </span>
          ) : (
            discount > 0 && (
              <span className="absolute left-2 top-2 rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
                {discount}% off
              </span>
            )
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="truncate text-xs text-muted">
            {product.category}
            {product.group ? ` / ${product.group}` : ''}
          </p>
          <h2 className="line-clamp-2 text-sm font-medium text-text">{product.name}</h2>

          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
            <span className="font-semibold text-text">
              {product.priceFormat || productService.formatPrice(product.price)}
            </span>
            {discount > 0 && (
              <span className="text-sm text-muted line-through">
                {productService.formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          {low && <p className="text-xs text-warning">Only {remaining} left</p>}
        </div>
      </Link>
    </li>
  );
});

export default ProductCard;

export function ProductCardSkeleton() {
  return (
    <li aria-hidden="true" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="aspect-[4/5] animate-pulse bg-surface-alt motion-reduce:animate-none" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-1/3 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
        <div className="h-4 w-4/5 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
        <div className="h-4 w-1/3 animate-pulse rounded-sm bg-surface-alt motion-reduce:animate-none" />
      </div>
    </li>
  );
}