import { useEffect, useState } from 'react';

// Types a phrase, waits, deletes it, then types the next one.
//   const PHRASES = ['Add a new product', 'Upload images'];   (define OUTSIDE the component)
//   <Typewriter phrases={PHRASES} />
export default function Typewriter({ phrases, typeMs = 55, deleteMs = 28, pauseMs = 1700, className = '' }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce) return undefined;
    const full = phrases[index % phrases.length];
    let t;
    if (!deleting && text === full) t = setTimeout(() => setDeleting(true), pauseMs);
    else if (deleting && text === '') t = setTimeout(() => { setDeleting(false); setIndex((i) => i + 1); }, 250);
    else t = setTimeout(() => setText(full.slice(0, text.length + (deleting ? -1 : 1))), deleting ? deleteMs : typeMs);
    return () => clearTimeout(t);
  }, [text, deleting, index, phrases, typeMs, deleteMs, pauseMs, reduce]);

  return (
    <span className={`inline-flex max-w-full items-center ${className}`}>
      <span className="sr-only">{phrases[0]}</span>
      <span className="min-w-0 truncate" style={{ color: 'var(--on-brown)' }} aria-hidden="true">
        {reduce ? phrases[0] : text}
        {!reduce && <span className="animate-caret ml-0.5 inline-block h-[0.9em] w-0.5 translate-y-[0.1em] bg-current" />}
      </span>
    </span>
  );
}