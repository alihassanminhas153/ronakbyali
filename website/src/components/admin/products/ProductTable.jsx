import { ImageOff, Pencil, Star, Trash2 } from 'lucide-react';

import productService from '../../../lib/appwrite/product';

const LOW_STOCK = 5;

function StockBadge({ product }) {
  const remaining = Number(product.remaining) || 0;
  const out = product.status === 'outOfStock' || remaining <= 0;
  const low = !out && remaining <= LOW_STOCK;
  const tone = out ? 'text-error' : low ? 'text-warning' : 'text-success';
  return (
    <div>
      <p className={`text-sm font-medium ${tone}`}>{out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}</p>
      <p className="text-xs text-muted">
        {remaining} left of {product.totalAvailable ?? 0}
      </p>
    </div>
  );
}

const iconBtn =
  'flex size-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';

// Product listing for the admin panel.
//   products : rows from the store
//   onEdit(product), onDelete(product), onToggleFeatured(product)
//   busyId   : id of the row that is being changed right now
export default function ProductTable({ products, onEdit, onDelete, onToggleFeatured, busyId = null }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[46rem] text-left">
        <thead>
          <tr className="border-b border-border text-sm text-muted">
            <th scope="col" className="px-4 py-3 font-medium">Product</th>
            <th scope="col" className="px-4 py-3 font-medium">Category</th>
            <th scope="col" className="px-4 py-3 font-medium">Price</th>
            <th scope="col" className="px-4 py-3 font-medium">Stock</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const image = productService.getMainImageUrl(p);
            const discounted = Number(p.discountPercentage) > 0;
            const busy = busyId === p.$id;
            return (
              <tr key={p.$id} className="border-b border-border last:border-0 hover:bg-surface-alt/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-md border border-border bg-surface-alt">
                      {image ? (
                        <img src={image} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-muted">
                          <ImageOff size={18} aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text">{p.name}</p>
                      <p className="truncate text-xs text-muted">/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-text">{p.category}</p>
                  <p className="text-xs text-muted">{p.group}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-text">{p.priceFormat || productService.formatPrice(p.price)}</p>
                  {discounted && (
                    <p className="text-xs text-muted">
                      <span className="line-through">{productService.formatPrice(p.originalPrice)}</span> · {p.discountPercentage}% off
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StockBadge product={p} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleFeatured?.(p)}
                      aria-pressed={Boolean(p.featured)}
                      aria-label={p.featured ? `Remove ${p.name} from featured` : `Feature ${p.name}`}
                      title={p.featured ? 'Featured' : 'Not featured'}
                      className={`${iconBtn} ${p.featured ? 'text-accent' : ''}`}
                    >
                      <Star size={17} fill={p.featured ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => onEdit?.(p)} aria-label={`Edit ${p.name}`} title="Edit" className={`${iconBtn} hover:text-text`}>
                      <Pencil size={17} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => onDelete?.(p)} aria-label={`Delete ${p.name}`} title="Delete" className={`${iconBtn} hover:text-error`}>
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
