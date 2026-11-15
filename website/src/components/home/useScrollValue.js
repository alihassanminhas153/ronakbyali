// src/components/home/useScrollValue.js
//
// Two small scroll helpers. Both listen in the capture phase, so they also work when
// your layout scrolls inside a div instead of the window, and both run at most once per frame.
//
// 1) useScrollFrame(callback)
//    Calls callback(viewportHeight) on mount, on every scroll and on resize.
//    It does NOT cause re-renders: write to the DOM (refs) inside the callback.
//    This is the smooth option for scroll-driven animation.
//
// 2) useScrollValue(compute, initial)   (default export)
//    Like the above, but keeps what compute() returns in React state, only updating it
//    when a number moved by more than 0.001. Return null from compute to skip an update.

import { useEffect, useRef, useState } from 'react';

export function useScrollFrame(callback) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      callbackRef.current(window.innerHeight);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };

    run();
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, []);
}

const same = (a, b) =>
  Object.keys(b).every((k) => (typeof b[k] === 'number' ? Math.abs((a?.[k] ?? NaN) - b[k]) < 0.001 : a?.[k] === b[k]));

export default function useScrollValue(compute, initial) {
  const [value, setValue] = useState(initial);

  useScrollFrame((vh) => {
    const next = compute(vh);
    if (next) setValue((prev) => (same(prev, next) ? prev : next));
  });

  return value;
}