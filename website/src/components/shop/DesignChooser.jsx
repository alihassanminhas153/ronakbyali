// src/components/shop/DesignChooser.jsx
//
// The "pick your design" box. Responsive: a bottom sheet on phones, a centred dialog on sm+.
// The customer taps one or more designs and sets how many of each.
// Every design card has the same size: square picture, one-line name, fixed-height action row.
//
// USAGE
//   const chooser = useDesignChooser();
//   chooser.ask(product, { initialPicks, confirmLabel: 'Add to cart', onConfirm: (picks) => ..., onCancel: () => ... });
//   return <>... {chooser.element}</>
//
//   useDesignAddToCart(product, onAddToCart)  -> { onAddToCart, element }   (used by the storefront cards)
//   <DesignSummary picks={picks} onEdit={...} />                            (plain text + Edit button)
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { Check, ImageOff, Minus, Pencil, Plus, X } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import { getDesigns, hasDesigns, picksText, totalQty } from '../../lib/designPicks';
import { addDesignsToCart } from '../../store/slices/cartSlice';

const MAX_EACH = 99;

// Most the customer can pick in total: the stock left, or no limit when stock is not tracked.
const totalLimit = (product) => {
  if (product?.remaining == null) return Infinity;
  const n = Number(product.remaining);
  return Number.isFinite(n) ? Math.max(0, n) : Infinity;
};

function Thumb({ id, alt }) {
  const [failed, setFailed] = useState(false);
  const src = productService.getThumbUrl(id, 480);
  if (!src || failed) {
    return (
      <span className="grid size-full place-items-center bg-surface-alt text-muted/60">
        <ImageOff size={28} aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable="false"
      onError={(e) => {
        const full = productService.getImageUrl(id);
        if (full && e.currentTarget.src !== full) e.currentTarget.src = full;
        else setFailed(true);
      }}
      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none"
    />
  );
}

function Stepper({ name, value, onChange, canAdd }) {
  const btn =
    'grid size-9 place-items-center text-text transition-colors hover:bg-surface-alt active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent';
  return (
    <div className="flex h-9 w-full items-center justify-between overflow-hidden rounded-lg border border-border bg-surface" role="group" aria-label={`Quantity of ${name}`}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label={`Fewer ${name}`} className={btn}>
        <Minus size={15} aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-text" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_EACH || !canAdd}
        aria-label={`More ${name}`}
        className={btn}
      >
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function DesignCard({ design, count, canAdd, onChange }) {
  const selected = count > 0;
  return (
    <li
      className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-surface transition-all duration-200 motion-reduce:transition-none ${
        selected ? 'border-accent shadow-soft ring-2 ring-accent/60' : 'border-border hover:border-accent/60'
      }`}
    >
      <button
        type="button"
        onClick={() => (selected ? onChange(0) : canAdd && onChange(1))}
        disabled={!selected && !canAdd}
        aria-pressed={selected}
        aria-label={`${selected ? 'Remove' : 'Select'} ${design.name}`}
        className="relative block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative block aspect-square w-full overflow-hidden bg-surface-alt">
          <Thumb id={design.id} alt={design.name} />
        </span>
        <span
          className={`absolute right-2 top-2 grid size-6 place-items-center rounded-full shadow-sm transition-all duration-200 motion-reduce:transition-none ${
            selected ? 'scale-100 bg-accent text-on-accent opacity-100' : 'scale-75 opacity-0'
          }`}
          aria-hidden="true"
        >
          <Check size={14} />
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <p className="truncate text-sm font-medium text-text" title={design.name}>
          {design.name}
        </p>
        <div className="mt-auto h-9">
          {selected ? (
            <Stepper name={design.name} value={count} onChange={onChange} canAdd={canAdd} />
          ) : (
            <button
              type="button"
              onClick={() => canAdd && onChange(1)}
              disabled={!canAdd}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-bg text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Plus size={14} aria-hidden="true" />
              Add
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function Panel({ product, initialPicks, confirmLabel, onConfirm, onCancel }) {
  const designs = getDesigns(product);
  const limit = totalLimit(product);
  const [qty, setQty] = useState(() => {
    const valid = new Set(designs.map((d) => d.id));
    return Object.fromEntries(
      (initialPicks || []).filter((p) => valid.has(p.imageId)).map((p) => [p.imageId, Math.min(Number(p.quantity) || 1, MAX_EACH)])
    );
  });
  const [entered, setEntered] = useState(false);
  const dialogRef = useRef(null);

  const picks = designs.filter((d) => qty[d.id]).map((d) => ({ imageId: d.id, name: d.name, quantity: qty[d.id] }));
  const total = totalQty(picks);
  const room = limit - total;
  const overLimit = total > limit;

  const setOne = (id, n) =>
    setQty((current) => {
      const next = { ...current };
      const others = Object.entries(current).reduce((sum, [key, v]) => (key === id ? sum : sum + v), 0);
      const allowed = Math.min(n, MAX_EACH, limit - others);
      if (allowed <= 0) delete next[id];
      else next[id] = allowed;
      return next;
    });

  // open animation, focus, Escape, scroll lock
  useEffect(() => {
    const opener = document.activeElement;
    const frame = window.requestAnimationFrame(() => setEntered(true));
    dialogRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [onCancel]);

  const confirmText =
    total === 0
      ? 'Select a design'
      : `${confirmLabel} · ${total} ${total === 1 ? 'item' : 'items'}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-chooser-title"
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-bg shadow-2xl outline-none transition-all duration-300 ease-out motion-reduce:transition-none sm:max-h-[88dvh] sm:max-w-3xl sm:rounded-2xl ${
          entered ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-8 opacity-0 sm:translate-y-2 sm:scale-95'
        }`}
      >
        {/* grab handle (phones) */}
        <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden="true" />

        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 id="design-chooser-title" className="font-display text-xl font-bold text-text sm:text-2xl">
              Choose your design
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">
              {product.name} · {designs.length} designs. Add one or more and set how many of each.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <ul className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 overflow-y-auto overscroll-contain p-4 sm:grid-cols-3 sm:gap-4 sm:p-6 lg:grid-cols-4">
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              count={qty[d.id] || 0}
              canAdd={room > 0}
              onChange={(n) => setOne(d.id, n)}
            />
          ))}
        </ul>

        <footer className="flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
            <p className="text-sm text-muted">
              Selected:{' '}
              <span className="font-semibold tabular-nums text-text">
                {total} {total === 1 ? 'item' : 'items'}
              </span>
              {picks.length > 1 && <span> across {picks.length} designs</span>}
            </p>
            {total > 0 && (
              <button
                type="button"
                onClick={() => setQty({})}
                className="rounded-md px-2 py-1 text-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Clear
              </button>
            )}
          </div>
          {Number.isFinite(limit) && room <= 0 && (
            <p role="status" className="text-xs text-warning sm:mr-auto">
              Stock limit reached ({limit} available).
            </p>
          )}
          <button
            type="button"
            disabled={total === 0 || overLimit}
            onClick={() => onConfirm(picks)}
            className="h-11 w-full shrink-0 rounded-md bg-accent px-6 font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:min-w-56"
          >
            {confirmText}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

export function useDesignChooser() {
  const [req, setReq] = useState(null);
  const reqRef = useRef(null);
  const ask = useCallback((product, opts = {}) => {
    reqRef.current = { product, ...opts };
    setReq(reqRef.current);
  }, []);
  const cancel = useCallback(() => {
    const current = reqRef.current;
    reqRef.current = null;
    setReq(null);
    current?.onCancel?.();
  }, []);

  const element = req ? (
    <Panel
      product={req.product}
      initialPicks={req.initialPicks}
      confirmLabel={req.confirmLabel || 'Continue'}
      onCancel={cancel}
      onConfirm={(picks) => {
        const current = reqRef.current;
        reqRef.current = null;
        setReq(null);
        current?.onConfirm?.(picks);
      }}
    />
  ) : null;

  return { ask, element };
}

// For the storefront cards. Products without designs behave exactly as before (the parent's handler runs).
// Products with designs open the chooser first, then every chosen design goes into the cart in one write.
export function useDesignAddToCart(product, onAddToCart) {
  const dispatch = useDispatch();
  const chooser = useDesignChooser();
  const { ask } = chooser;

  const wrapped = useCallback(
    (p) => {
      const target = p || product;
      if (!hasDesigns(target)) return onAddToCart?.(target);
      ask(target, {
        confirmLabel: 'Add to cart',
        onConfirm: (picks) => dispatch(addDesignsToCart({ productId: target.$id, picks, toast: true })),
      });
    },
    [product, onAddToCart, ask, dispatch]
  );

  return { onAddToCart: onAddToCart ? wrapped : undefined, element: chooser.element };
}

// Plain text with an Edit button (the picks are never shown in inputs).
export function DesignSummary({ picks, onEdit }) {
  if (!picks?.length) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="text-muted">Designs</p>
        <p className="break-words font-medium text-text">{picksText(picks)}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Pencil size={14} aria-hidden="true" />
          Edit
        </button>
      )}
    </div>
  );
}