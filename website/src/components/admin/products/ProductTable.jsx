import { ImageOff, Pencil, Star, Trash2 } from 'lucide-react';
import productService from '../../../lib/appwrite/product';
import { colorFor, tint } from '../../../ui/graphs/utils';

// props: products[], busyId, onEdit(product), onDelete(product), onToggleFeatured(product)
const rs = (n) => productService.formatPrice(n);

function Thumb({ product }) {
  const url = productService.getMainImageUrl(product);
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-alt text-muted">
      {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff size={18} />}
    </span>
  );
}

function CategoryChip({ name }) {
  if (!name) return null;
  const c = colorFor(name);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tint(c, 14), color: c }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

function StockBadge({ product }) {
  const remaining = Number(product.remaining) || 0;
  const total = Number(product.totalAvailable) || 0;
  const out = product.status === 'outOfStock' || remaining <= 0;
  const low = !out && total > 0 && remaining / total <= 0.2;
  const tone = out ? 'bg-graph-4/10 text-graph-4' : low ? 'bg-graph-3/10 text-graph-3' : 'bg-graph-2/10 text-graph-2';
  const pct = total ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
  return (
    <div className="min-w-24">
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${tone}`}>{out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}</span>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full bg-current transition-[width] duration-700" style={{ width: `${pct}%`, color: out ? 'var(--graph-4)' : low ? 'var(--graph-3)' : 'var(--graph-2)' }} />
      </div>
      <p className="mt-1 text-[11px] text-muted tabular-nums">{remaining} left · {Number(product.sold) || 0} sold</p>
    </div>
  );
}

function Price({ product }) {
  const discounted = Number(product.discountPercentage) > 0 && Number(product.originalPrice) > Number(product.price);
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm font-medium text-text tabular-nums">{product.priceFormat || rs(product.price)}</p>
      {discounted && (
        <p className="text-xs text-muted">
          <s>{rs(product.originalPrice)}</s> <span className="text-graph-4">-{product.discountPercentage}%</span>
        </p>
      )}
    </div>
  );
}

function Actions({ product, busy, onEdit, onDelete, onToggleFeatured }) {
  const btn = 'grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt disabled:opacity-50';
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" disabled={busy} onClick={() => onToggleFeatured(product)} aria-label={product.featured ? 'Remove from featured' : 'Mark as featured'} aria-pressed={Boolean(product.featured)} className={`${btn} ${product.featured ? 'text-graph-3' : 'hover:text-graph-3'}`}>
        <Star size={16} className={`transition-transform duration-200 ${product.featured ? 'scale-110' : ''}`} fill={product.featured ? 'currentColor' : 'none'} />
      </button>
      <button type="button" onClick={() => onEdit(product)} aria-label="Edit product" className={`${btn} hover:text-text`}><Pencil size={16} /></button>
      <button type="button" onClick={() => onDelete(product)} aria-label="Delete product" className={`${btn} hover:bg-error/10 hover:text-error`}><Trash2 size={16} /></button>
    </div>
  );
}

export default function ProductTable({ products = [], busyId, onEdit, onDelete, onToggleFeatured }) {
  const actions = { onEdit, onDelete, onToggleFeatured };
  const rise = (i) => ({ animationDelay: `${Math.min(i, 12) * 35}ms` });

  return (
    <>
      {/* phones: cards */}
      <ul className="space-y-3 md:hidden">
        {products.map((p, i) => (
          <li key={p.$id} style={rise(i)} className="animate-rise rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent/40">
            <div className="flex gap-3">
              <Thumb product={p} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{p.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5"><CategoryChip name={p.category} />{p.group && <span className="truncate text-xs text-muted">{p.group}</span>}</div>
                <div className="mt-1.5"><Price product={p} /></div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
              <StockBadge product={p} />
              <Actions product={p} busy={busyId === p.$id} {...actions} />
            </div>
          </li>
        ))}
      </ul>

      {/* tablets and up: table */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left">
          <thead className="bg-surface-alt/60 text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p, i) => (
              <tr key={p.$id} style={rise(i)} className="animate-rise transition-colors hover:bg-surface-alt/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb product={p} />
                    <div className="min-w-0">
                      <p className="max-w-64 truncate text-sm font-medium text-text">{p.name}</p>
                      <p className="max-w-64 truncate text-xs text-muted">/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text">
                  <CategoryChip name={p.category} />
                  {p.group && <span className="mt-1 block text-xs text-muted">{p.group}</span>}
                </td>
                <td className="px-4 py-3"><Price product={p} /></td>
                <td className="px-4 py-3"><StockBadge product={p} /></td>
                <td className="px-4 py-3"><div className="flex justify-end"><Actions product={p} busy={busyId === p.$id} {...actions} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}