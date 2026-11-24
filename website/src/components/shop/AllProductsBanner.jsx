import { useCallback, useEffect, useRef, useState } from 'react';
import productService from '../../lib/appwrite/product';
import siteLayoutService from '../../lib/appwrite/siteLayout';

const SLIDE_MS = 5000;
const SLIDE_ANIM_MS = 1200;
const SLIDE_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function AllProductsBanner() {
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const [pageVisible, setPageVisible] = useState(true);
  const parkTimer = useRef(null);

  useEffect(() => {
    let active = true;
    siteLayoutService.getAllProductsBanner().then((result) => {
      if (!active || !result.ok) return;
      const ids = Array.isArray(result.row?.imageIds) ? result.row.imageIds : [];
      setImages(ids.map((id) => ({ id, src: productService.getImageUrl(id) })).filter((image) => image.src));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const goTo = useCallback((next) => {
    if (next === current || next < 0 || next >= images.length) return;
    setLeaving(current);
    setCurrent(next);
    window.clearTimeout(parkTimer.current);
    parkTimer.current = window.setTimeout(() => setLeaving(null), SLIDE_ANIM_MS + 100);
  }, [current, images.length]);

  useEffect(() => {
    if (images.length < 2 || !pageVisible || prefersReducedMotion()) return undefined;
    const timer = window.setTimeout(() => goTo((current + 1) % images.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [current, goTo, images.length, pageVisible]);

  useEffect(() => () => window.clearTimeout(parkTimer.current), []);

  if (!images.length) return null;
  const reducedMotion = prefersReducedMotion();

  return (
    <section
      aria-label="All Products banners"
      className="sticky top-[4.25rem] z-0 isolate h-[clamp(12rem,35vw,350px)] max-h-[350px] w-full overflow-hidden bg-surface-alt lg:top-[4.5rem]"
    >
      {images.map((image, index) => {
        const active = index === current;
        const exit = index === leaving;
        return (
          <div
            key={image.id}
            aria-hidden={!active}
            className="absolute inset-0"
            style={{
              transform: active ? 'translate3d(0,0,0)' : exit ? 'translate3d(-100%,0,0)' : 'translate3d(100%,0,0)',
              transition: !reducedMotion && (active || exit)
                ? `transform ${SLIDE_ANIM_MS}ms ${SLIDE_EASE}`
                : 'none',
              willChange: active || exit ? 'transform' : 'auto',
            }}
          >
            <img
              src={image.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              loading={index === current || index === (current + 1) % images.length ? 'eager' : 'lazy'}
              className="h-full w-full select-none object-cover"
            />
          </div>
        );
      })}

      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/30 bg-black/35 px-3 py-2 backdrop-blur-md">
          <div role="group" aria-label="Banner images" className="flex items-center gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show banner ${index + 1} of ${images.length}`}
                aria-current={index === current ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  index === current ? 'w-7 bg-white' : 'w-2.5 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
