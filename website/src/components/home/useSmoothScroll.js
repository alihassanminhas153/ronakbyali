import { useEffect } from "react";
import Lenis from "lenis";

/* Smooth, eased mouse-wheel and touch scrolling for the page that calls it.
   Install once:  npm i lenis
   It is switched on only when enabled and fully removed when disabled or unmounted, so the
   dashboards keep their normal scrolling. Reduced-motion users keep normal scrolling. */
export default function useSmoothScroll({ lerp = 0.09, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp, smoothWheel: true });
    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [enabled, lerp]);
}