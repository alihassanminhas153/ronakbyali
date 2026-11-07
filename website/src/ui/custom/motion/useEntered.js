import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// false on the first paint, true shortly after. Use it to drive enter transitions
// (opacity + transform only) without keyframes:
//
//   const entered = useEntered(index * 30);
//   className={`transition duration-300 ease-out motion-reduce:transition-none
//     ${entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
//
// `delay` (ms) staggers the start. With prefers-reduced-motion it is true from the
// first render, so nothing waits or slides.
export default function useEntered(delay = 0) {
  const [entered, setEntered] = useState(prefersReducedMotion);

  useEffect(() => {
    if (entered) return undefined;
    const id = setTimeout(() => setEntered(true), delay + 16);
    return () => clearTimeout(id);
  }, [entered, delay]);

  return entered;
}