import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Check, Minus, Pencil, Plus, X } from 'lucide-react';

import productService from '../../lib/appwrite/product';
import { getEffectivePricing } from '../../lib/saleMath';
import { selectSalesList } from '../../store/slices/saleSlice';
import { MAX_PER_DESIGN, cleanPicks, getDesigns, picksTotal, validatePicks } from '../../lib/productDesigns';

const rs = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`;

function DesignImage({ id, alt }) {
  const [full, setFull] = useState(false);
  const src = full ? productService.getImageUrl(id) : productService.getThumbUrl(id, 480);
  return <img src={src} alt={alt} loading="lazy" onError={() => setFull(true)} className="h-full w-full object-cover" />;
}

// "Choose your design" box. Opens before a product with designs goes to the cart,
// the order form or the checkout.
//   open, product, onClose
//   initial   : picks chosen earlier (when the customer edits)
//   onConfirm : (picks) => void      picks = [{ id, name, quantity }]
export default function DesignPicker({ open, product, initial = [], onClose, onConfirm, confirmLabel = 'Continue' }) {
  const sales = useSelector(selectSalesList);
  const designs = useMemo(() => getDesigns(product), [product]);
  const [qty, setQty] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const start = {};
    cleanPicks(product, initial).forEach((p) => { start[p.id] = p.quantity; });
    setQty(start);
    setError('');
  }, [open, product]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !product) return null;

  const picks = designs.filter((d) => qty[d.id] > 0).map((d) => ({ id: d.id, name: d.name, quantity: qty[d.id] }));
  const pieces = picksTotal(picks);
  const unit = getEffectivePricing(product, sales).price;

  const toggle = (id) => {
    setError('');
    setQty((cur) => {
      const next = { ...cur };
      if (next[id] > 0) delete next[id];
      else next[id] = 1;
      return next;
    });
  };
  const change = (id, delta) => {
    setError('');
    setQty((cur) => ({ ...cur, [id]: Math.min(MAX_PER_DESIGN, Math.max(1, (cur[id] || 1) + delta)) }));
  };
  const confirm = () => {
    const problem = validatePicks(product, picks);
    if (problem) { setError(problem); return; }
    onConfirm?.(picks);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div onClick={() => onClose?.()} className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a design for ${product.name}`}
        className="relative flex max-h-[92vh] w-full max-w-3xl animate-rise flex-col overflow-hidden rounded-t-2xl border border-border bg-bg shadow-soft sm:rounded-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="heading truncate text-text">Choose your design</h2>
            <p className="truncate text-xs text-muted">{product.name}. Pick one or more designs and how many of each.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>

        <ul className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 sm:p-6 md:grid-cols-4">
          {designs.map((design) => {
            const count = qty[design.id] || 0;
            const selected = count > 0;
            return (
              <li key={design.id}>
                <div className={`overflow-hidden rounded-lg border transition-colors ${selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-accent/50'}`}>
                  <button
                    type="button"
                    onClick={() => toggle(design.id)}
                    aria-pressed={selected}
                    aria-label={`${selected ? 'Remove' : 'Choose'} ${design.name}`}
                    className="relative block aspect-square w-full bg-surface-alt"
                  >
                    <DesignImage id={design.id} alt={design.name} />
                    {selected && (
                      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-white"><Check size={14} aria-hidden="true" /></span>
                    )}
                  </button>
                  <div className="p-2">
                    <p className="truncate text-sm font-medium text-text" title={design.name}>{design.name}</p>
                    {selected ? (
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <button type="button" onClick={() => change(design.id, -1)} disabled={count <= 1} aria-label={`Fewer ${design.name}`} className="grid size-8 place-items-center rounded-md border border-border bg-surface text-text disabled:opacity-40"><Minus size={14} /></button>
                        <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-text" aria-live="polite">{count}</span>
                        <button type="button" onClick={() => change(design.id, 1)} disabled={count >= MAX_PER_DESIGN} aria-label={`More ${design.name}`} className="grid size-8 place-items-center rounded-md border border-border bg-surface text-text disabled:opacity-40"><Plus size={14} /></button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Tap to choose</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">
              {picks.length ? `${picks.length} design${picks.length > 1 ? 's' : ''}, ${pieces} piece${pieces > 1 ? 's' : ''}` : 'No design chosen yet'}
            </p>
            {picks.length > 0 && <p className="text-xs text-muted tabular-nums">{rs(unit)} each · {rs(unit * pieces)}</p>}
            {error && <p role="alert" className="text-xs text-error">{error}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="button" onClick={confirm} disabled={!picks.length} className="btn btn-primary min-w-32 disabled:opacity-50">{confirmLabel}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// What was chosen, as plain text with an Edit button (the choices are not shown as inputs).
//   picks  : [{ id, name, quantity }]
//   onEdit : () => void     (open the DesignPicker again)
export function DesignSummary({ picks = [], onEdit, disabled = false }) {
  if (!picks.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <ul className="flex min-w-0 flex-wrap gap-1.5">
        {picks.map((pick) => (
          <li key={pick.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt py-0.5 pl-0.5 pr-2.5 text-text">
            <span className="size-5 overflow-hidden rounded-full bg-surface"><DesignImage id={pick.id} alt="" /></span>
            {pick.name} <span className="text-muted">×{pick.quantity}</span>
          </li>
        ))}
      </ul>
      {onEdit && (
        <button type="button" onClick={onEdit} disabled={disabled} className="inline-flex items-center gap-1 font-medium text-accent transition-colors hover:text-accent-hover disabled:opacity-50">
          <Pencil size={12} aria-hidden="true" /> Edit
        </button>
      )}
    </div>
  );
}
