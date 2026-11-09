import { useEffect, useRef, useState } from 'react';

// Number that counts up (or down) to `value` whenever it changes.
//   <CountUp value={128} />   <CountUp value={2500} format={(n) => `Rs ${Math.round(n).toLocaleString()}`} />
export default function CountUp({ value = 0, duration = 1000, format = (n) => Math.round(n).toLocaleString(), className = '' }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      setShown(target);
      return undefined;
    }
    const begin = from.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      const current = begin + (target - begin) * eased;
      from.current = current;
      setShown(current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={`tabular-nums ${className}`}>{format(shown)}</span>;
}