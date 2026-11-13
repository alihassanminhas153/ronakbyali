import { useEffect, useState } from 'react';
import AppIcon from '../AppIcon';
import { toneVar } from '../../graphs/utils';

// Types a phrase, waits, deletes it, then types the next one.
//   const PHRASES = ['Add a new product', 'Upload images'];   (define OUTSIDE the component)
//   <Typewriter phrases={PHRASES} />
export default function Typewriter({ phrases, typeMs = 55, deleteMs = 28, pauseMs = 1700, className = '', icon, tone = 1 }) {
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
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      {icon && <AppIcon name={icon} tone={tone} className="size-6 shrink-0 object-contain sm:size-7" />}
      <span className="sr-only">{phrases[0]}</span>
      <span className="min-w-0 truncate rounded-sm bg-white/90 px-1.5" style={{ color: toneVar(tone) }} aria-hidden="true">
        {reduce ? phrases[0] : text}
        {!reduce && <span className="animate-caret ml-0.5 inline-block h-[0.9em] w-0.5 translate-y-[0.1em] bg-current" />}
      </span>
    </span>
  );
}