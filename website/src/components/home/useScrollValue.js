// src/components/home/useScrollValue.js
//
// USAGE
//   const { p } = useScrollValue(() => {
//     const rect = ref.current?.getBoundingClientRect();
//     return rect ? { p: clamp(-rect.top / rect.height) } : null;
//   }, { p: 0 });
//
// Calls `compute(viewportHeight)` on every scroll and resize (at most once per frame)
// and returns whatever object it produced. It listens in the capture phase, so it also
// works when your layout scrolls inside a div instead of the window.
// Return null from compute to skip an update. State only changes when a number moved
// by more than 0.001, so it does not re-render for no reason.

import { useEffect, useRef, useState } from 'react';

const same = (a, b) => {
  const keys = Object.keys(b);
  return keys.every((k) => (typeof b[k] === 'number' ? Math.abs((a?.[k] ?? NaN) - b[k]) < 0.001 : a?.[k] === b[k]));
};

export default function useScrollValue(compute, initial) {
  const [value, setValue] = useState(initial);
  const computeRef = useRef(compute);

  useEffect(() => {
    computeRef.current = compute;
  });

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const next = computeRef.current(window.innerHeight);
      if (next) setValue((prev) => (same(prev, next) ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return value;
}