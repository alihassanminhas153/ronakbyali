// src/components/shop/ProductRow.jsx   (a titled, horizontally scrolling row of product cards)
//
// USAGE
//   <ProductRow icon={Crown} title="Featured" hint="Hand-picked by us" count={items.length}>
//     {items.map((p, i) => <FeaturedCard key={p.$id} product={p} index={i} ... />)}
//   </ProductRow>
//
//   <ProductRow icon={Crown} title="Featured" busy>          // loading: pass skeleton cards as children
//     {Array.from({ length: 4 }, (_, i) => <FeaturedCardSkeleton key={i} />)}
//   </ProductRow>
//
// The children must be the cards themselves: each card renders its own <li>, and this row sizes
// those <li>s (about 2 per screen on phones, 3 on tablets, 4 on desktop, so the next card peeks in).
// The arrow buttons scroll by almost one screen. They are disabled at either end and hidden when
// everything already fits. Swiping, the mouse wheel and the keyboard (Tab through the cards) work too.
//
// SectionHeading is exported so other blocks of the page (results, popular) look the same.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function SectionHeading({ icon: Icon, title, hint, children }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold leading-tight text-text sm:text-lg">{title}</h2>
          {hint && <p className="truncate text-xs text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ArrowButton({ direction, disabled, onClick }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Scroll left' : 'Scroll right'}
      className={`grid size-9 place-items-center rounded-full border border-border bg-surface text-text shadow-soft transition-all duration-200 hover:border-accent/60 hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text motion-reduce:transition-none ${FOCUS}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export default function ProductRow({ icon, title, hint, count, busy = false, children }) {
  const scroller = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  // Re-measure on scroll, on resize and whenever the cards change (loading -> loaded).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [measure, count, busy]);

  const scrollByPage = (direction) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
  };

  const overflows = canPrev || canNext;

  return (
    <section aria-label={title} aria-busy={busy || undefined}>
      <SectionHeading icon={icon} title={title} hint={hint}>
        {overflows && !busy && (
          <div className="flex shrink-0 items-center gap-2">
            <ArrowButton direction="prev" disabled={!canPrev} onClick={() => scrollByPage(-1)} />
            <ArrowButton direction="next" disabled={!canNext} onClick={() => scrollByPage(1)} />
          </div>
        )}
      </SectionHeading>

      {/* py / px leave room for the hover lift and shadow, which an overflow container would clip */}
      <ul
        ref={scroller}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 pt-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden [&>li]:shrink-0 [&>li]:basis-[46%] [&>li]:snap-start sm:[&>li]:basis-[31%] lg:[&>li]:basis-[23.5%]"
      >
        {children}
      </ul>
    </section>
  );
}