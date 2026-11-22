// src/components/home/ProductsMarquee.jsx   (Home page, right after the hero)
//
// USAGE
//   <ProductsMarquee />
//
// Loads the featured products from productsSlice, keeps ONE product per category
// (at most 6) and shows them with the shared ProductCard in an endless,
// auto-scrolling marquee that repeats the cards to fill any screen width. It is a marquee on EVERY
// screen size (cards never stack into one column on narrow screens).
//   - The section animates in when it scrolls into view, and the cards play
//     their own staggered entrance at that moment.
//   - Hover or keyboard focus pauses the marquee (mouse only, touch keeps moving).
//   - prefers-reduced-motion: no auto-scroll, the row becomes a swipeable strip.
//   - No CSS keyframes needed: the scroll uses the Web Animations API.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';

import ProductCard, { ProductCardSkeleton } from '../shop/ProductCard';
import {
  fetchFeaturedProducts,
  selectFeaturedProducts,
  selectFeaturedStatus,
} from '../../store/slices/productsSlice';

/* ---- Settings: tweak here ---- */
const FEATURED_LIMIT = 30; // how many featured products to load (we then keep one per category)
const MAX_CARDS = 6; // the marquee never shows more cards than this
const SPEED = 45; // marquee speed in pixels per second
const SHOP_PATH = '/products';

// The card renders its own <li>, so the width is set on the list's children
const ITEM_WIDTH = '[&>li]:w-[14rem] [&>li]:shrink-0 sm:[&>li]:w-[16.5rem]';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Becomes true once the element has scrolled into view (and stays true) */
function useInView(rootMargin = '0px 0px -10% 0px') {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);

  return [ref, seen];
}

/* ---------- The marquee row ----------
   The list is repeated enough times to always fill the screen. The track slides
   left by exactly ONE list width and starts over, so the loop has no jump. */
function MarqueeRow({ products, speed = SPEED, reverse = false }) {
  const reduced = prefersReducedMotion();
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const groupRef = useRef(null);
  const animRef = useRef(null);
  const [copies, setCopies] = useState(2);
  const [setWidth, setSetWidth] = useState(0);

  // Measure one list, work out how many copies are needed to cover the screen
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const group = groupRef.current;
    if (!wrap || !group) return;

    const measure = () => {
      const width = group.offsetWidth;
      if (!width) return;
      setSetWidth(width);
      setCopies(Math.max(2, Math.ceil(wrap.clientWidth / width) + 1));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(group);
    return () => ro.disconnect();
  }, [products.length]);

  // Slide the track by exactly one list width, forever
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !setWidth || reduced) return;

    const from = reverse ? -setWidth : 0;
    const to = reverse ? 0 : -setWidth;
    const anim = track.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
      { duration: (setWidth / speed) * 1000, iterations: Infinity, easing: 'linear' },
    );
    animRef.current = anim;
    return () => anim.cancel();
  }, [setWidth, speed, reverse, reduced]);

  const pause = () => animRef.current?.pause();
  const play = () => animRef.current?.play();

  return (
    <div
      ref={wrapRef}
      onPointerEnter={(e) => e.pointerType === 'mouse' && pause()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && play()}
      onFocus={pause}
      onBlur={play}
      className={`py-6 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] ${
        reduced ? 'overflow-x-auto' : 'overflow-x-clip'
      }`}
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        {Array.from({ length: reduced ? 1 : copies }).map((_, c) => (
          <ul
            key={c}
            ref={c === 0 ? groupRef : undefined}
            aria-hidden={c === 0 ? undefined : 'true'}
            className={`flex shrink-0 gap-4 pr-4 ${ITEM_WIDTH}`}
          >
            {products.map((product, i) => (
              <ProductCard key={product.$id} product={product} index={i} isDuplicate={c !== 0} />
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/* Placeholder row while loading (and before the section scrolls into view) */
function SkeletonRow() {
  return (
    <div className="overflow-hidden py-6">
      <ul className={`flex gap-4 px-4 sm:px-6 ${ITEM_WIDTH}`} aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </ul>
    </div>
  );
}

/* ---------- The section ---------- */
export default function ProductsMarquee() {
  const dispatch = useDispatch();
  const products = useSelector(selectFeaturedProducts);
  const status = useSelector(selectFeaturedStatus);

  // One product per category, at most MAX_CARDS (the first one found for each category)
  const cards = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const product of products) {
      const key = String(product.category || product.$id).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(product);
      if (out.length === MAX_CARDS) break;
    }
    return out;
  }, [products]);
  const [sectionRef, seen] = useInView();

  // Start loading right away, so the data is ready by the time the section is seen
  useEffect(() => {
    if (status === 'idle') dispatch(fetchFeaturedProducts(FEATURED_LIMIT));
  }, [dispatch, status]);

  const reveal = (delayMs) => ({
    className: `transition duration-700 ease-out motion-reduce:transition-none ${
      seen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
    }`,
    style: { transitionDelay: seen ? `${delayMs}ms` : '0ms' },
  });

  const loading = status === 'idle' || status === 'loading';

  let content;
  if (!seen || loading) {
    content = <SkeletonRow />;
  } else if (status === 'failed') {
    content = <p className="px-4 py-10 text-center text-muted">Could not load products right now.</p>;
  } else if (cards.length === 0) {
    content = <p className="px-4 py-10 text-center text-muted">New products are coming soon.</p>;
  } else {
    content = <MarqueeRow products={cards} />;
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="featured-title"
      className="relative border-t border-border bg-bg py-12 sm:py-16"
    >
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-4 sm:px-6">
        <div {...reveal(0)} className={reveal(0).className}>
          <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">Featured</p>
          <h2
            id="featured-title"
            className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] font-bold tracking-[0.01em] text-text uppercase"
          >
            Shop the <span className="text-accent">latest</span>
          </h2>
        </div>

        <div {...reveal(150)} className={`shrink-0 ${reveal(150).className}`}>
          <Link
            to={SHOP_PATH}
            className="group inline-flex items-center gap-2 rounded-full bg-btn px-4 py-2.5 text-sm font-medium text-btn-ink transition hover:bg-btn-hover active:scale-[0.97]"
          >
            Shop all
            <ArrowUpRight
              size={16}
              strokeWidth={2}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </div>

      <div className={`mt-6 ${reveal(300).className}`} style={reveal(300).style}>
        {content}
      </div>
    </section>
  );
}