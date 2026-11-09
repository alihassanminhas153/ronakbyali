import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Custom hover label. Rendered in <body> with fixed positioning, so it is never clipped by
// overflow-hidden tables or scrollers, and it follows the theme (inverted: dark on light, light on dark).
const TONES = {
  default: 'bg-text text-bg',
  accent: 'bg-accent text-on-accent',
  danger: 'bg-error text-white',
};

// Low-level bubble. `rect` is the anchor's getBoundingClientRect(); null = hidden.
export function TipBubble({ rect, tone = 'default', children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !rect) return;
    const gap = 9;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const center = rect.left + rect.width / 2;
    const left = Math.max(8, Math.min(center - w / 2, window.innerWidth - w - 8));
    const above = rect.top - h - gap >= 8; // flip below when there is no room on top
    setPos({
      left,
      top: above ? rect.top - h - gap : rect.bottom + gap,
      above,
      arrow: Math.max(10, Math.min(center - left, w - 10)),
    });
  }, [rect]);

  if (!rect) return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      className={`pointer-events-none fixed z-[100] w-max max-w-64 animate-rise rounded-md px-2.5 py-1.5 text-xs font-medium leading-snug shadow-soft [animation-duration:160ms] ${TONES[tone] || TONES.default}`}
    >
      {children}
      <span
        aria-hidden="true"
        style={{ left: (pos?.arrow ?? 0) - 4 }}
        className={`absolute h-2 w-2 rotate-45 ${TONES[tone] || TONES.default} ${pos?.above === false ? '-top-1' : '-bottom-1'}`}
      />
    </div>,
    document.body
  );
}

// <Tooltip label="Edit product"><button>…</button></Tooltip>
// tone: default | accent | danger.  hideOnClick={false} keeps the label while the label itself changes on click.
export default function Tooltip({ label, tone = 'default', hideOnClick = true, className = '', children }) {
  const ref = useRef(null);
  const [rect, setRect] = useState(null);

  const show = () => {
    if (label && ref.current) setRect(ref.current.getBoundingClientRect());
  };
  const hide = () => setRect(null);

  useEffect(() => {
    if (!rect) return undefined;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [rect]);

  return (
    <span
      ref={ref}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={hideOnClick ? hide : undefined}
    >
      {children}
      <TipBubble rect={rect} tone={tone}>{label}</TipBubble>
    </span>
  );
}