import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import '../users/userScroll.css';

import productService from '../../../lib/appwrite/product';
import { PATHS } from '../../../router/path';
import { tint, toneVar } from '../../../ui/graphs/utils';
import { money, timeAgo } from '../orders/orderMeta';
import { STALE_DAYS } from './useCartWishlist';

const chip = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium';

/* ---------------- small pieces ---------------- */

// ok / low / short / out / removed, coloured like the order badges
export function StockBadge({ stock }) {
  const c = toneVar(stock.tone);
  return (
    <span className={chip} style={{ background: tint(c, 14), color: c }}>
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: c }} />
      {stock.label}
    </span>
  );
}

function Thumb({ product }) {
  let src = null;
  try {
    src = product ? productService.getMainImageUrl(product) : null;
  } catch {
    src = null;
  }
  return (
    <span className="h-14 w-11 shrink-0 overflow-hidden rounded bg-surface-alt">
      {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </span>
  );
}

function ProductName({ product, fallback }) {
  if (!product) {
    return <span className="block truncate text-sm text-muted">Product removed{fallback ? ` (${fallback})` : ''}</span>;
  }
  return (
    <Link to={PATHS.product(product.category, product.group, product.slug)} className="block truncate text-sm font-medium text-text hover:text-accent">
      {product.name}
    </Link>
  );
}

/* ---------------- shoppers (carts / wishlists) ---------------- */

function Line({ line, kind, index }) {
  const { product, stock } = line;
  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="flex animate-rise gap-3 rounded-md border border-border bg-surface p-2.5 transition-colors hover:border-accent/40"
    >
      <Thumb product={product} />
      <div className="min-w-0 flex-1">
        <ProductName product={product} fallback={line.productId} />
        {line.variant && <p className="text-xs text-muted">Option: {line.variant}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StockBadge stock={stock} />
          {kind === 'wish' && line.bought && (
            <span className={chip} style={{ background: tint(toneVar(7), 14), color: toneVar(7) }}>Bought</span>
          )}
        </div>
        {kind === 'cart' && (
          <p className="mt-1.5 text-xs tabular-nums text-muted">
            {line.quantity} × {money(line.price)} = <span className="font-medium text-text">{money(line.price * line.quantity)}</span>
          </p>
        )}
      </div>
    </li>
  );
}

function HolderRow({ entry, kind, index }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // products load only after the first open
  const [shown, setShown] = useState(false); // flips one frame later so the first open animates too

  useEffect(() => {
    if (!open) {
      setShown(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, [open]);
  const expanded = open && shown;
  const { row, lines } = entry;
  const who = row.name || row.username || row.email || row.$id;
  const contact = [row.email, row.phone, row.city].filter(Boolean).join(' · ');
  const stale = kind === 'cart' && entry.days >= STALE_DAYS;
  const tone = toneVar(kind === 'cart' ? 1 : 6);
  const summary = kind === 'cart' ? `${entry.units} ${entry.units === 1 ? 'item' : 'items'} · ${money(entry.value)}` : `${entry.saved} saved`;

  return (
    <li style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }} className="animate-rise">
      <button
        type="button"
        onClick={() => { setMounted(true); setOpen((v) => !v); }}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-300 hover:bg-surface-alt/50 ${open ? 'bg-surface-alt/40' : ''}`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold uppercase" style={{ background: tint(tone, 14), color: tone }}>
          {String(who).trim().charAt(0) || '?'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text">{who}</span>
          {contact && <span className="block truncate text-xs text-muted">{contact}</span>}
        </span>
        <span className="hidden items-center gap-2 md:flex">
          {entry.problems > 0 && (
            <span className={chip} style={{ background: tint(toneVar(4), 14), color: toneVar(4) }}>
              {entry.problems} stock {entry.problems === 1 ? 'problem' : 'problems'}
            </span>
          )}
          {stale && <span className={chip} style={{ background: tint(toneVar(3), 14), color: toneVar(3) }}>Idle {Math.floor(entry.days)}d</span>}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-medium tabular-nums text-text">{summary}</span>
          <span className="block text-xs text-muted">Changed {timeAgo(row.$updatedAt)}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {mounted && (
        <div
          aria-hidden={!open}
          className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
            expanded ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <ul className="grid gap-2 border-t border-border bg-surface-alt/30 p-3 sm:grid-cols-2">
              {lines.map((l, i) => <Line key={`${l.productId}:${i}`} line={l} kind={kind} index={i} />)}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

export function HolderList({ entries, kind }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {entries.map((e, i) => <HolderRow key={e.id} entry={e} kind={kind} index={i} />)}
    </ul>
  );
}

/* ---------------- products held by somebody ---------------- */

export function ProductDemandTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="user-scroll overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left">
          <thead className="bg-surface-alt/60 text-xs text-muted">
            <tr>
              {['Product', 'Stock now', 'In carts', 'Wishlists', 'Price'].map((h, i) => (
                <th key={h} className={`px-4 py-3 font-medium ${i >= 2 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((d, i) => (
              <tr key={d.id} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }} className="animate-rise transition-colors hover:bg-surface-alt/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb product={d.product} />
                    <div className="min-w-0">
                      <div className="max-w-64"><ProductName product={d.product} fallback={d.id} /></div>
                      {d.product && <p className="truncate text-xs text-muted">{[d.product.category, d.product.group].filter(Boolean).join(' · ')}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StockBadge stock={d.stock} />
                  {d.product?.remaining != null && (
                    <p className="mt-1 text-xs text-muted">{d.product.remaining} left of {d.product.totalAvailable ?? '—'}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums text-text">
                  {d.cartQty ? (
                    <>{d.cartQty} <span className="text-xs text-muted">in {d.carts} {d.carts === 1 ? 'cart' : 'carts'}</span></>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums text-text">{d.wishes || <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums text-text">{d.product ? money(d.product.price) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}