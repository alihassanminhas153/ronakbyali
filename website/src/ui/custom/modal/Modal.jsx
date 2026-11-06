import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Dialog with a dimmed backdrop.
//   variant "center" : small centred card (confirmations)
//   variant "drawer" : full-height panel from the right (forms); full screen on phones
//   busy             : blocks closing while something is being saved
//   footer           : pinned to the bottom of the panel
// Esc and a click on the backdrop call onClose. Focus is kept inside while it is open.
// Opening and closing are animated: the drawer slides in from the right, the centre card
// fades and scales, the backdrop fades. Keep the component mounted and flip `open` so the
// closing animation can play (it unmounts itself once the animation is done).
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  busy = false,
  layer = 'z-50',
}) {
  const panelRef = useRef(null);
  const returnFocus = useRef(null);
  const isDrawer = variant === 'drawer';
  const duration = isDrawer ? 300 : 200;

  // mounted: stays true while the closing animation plays. shown: drives the CSS transition.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let second;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setShown(true)); // paint the hidden state first
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [open, duration]);

  useEffect(() => {
    if (!open) return undefined;
    returnFocus.current = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      returnFocus.current?.focus?.();
    };
  }, [open]);

  if (!open && !mounted) return null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!busy) onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;

    const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 ${layer} flex ${isDrawer ? 'justify-end' : 'items-center justify-center p-4'} ${
        open ? '' : 'pointer-events-none'
      }`}
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden="true"
        onMouseDown={() => !busy && onClose?.()}
        style={{ transitionDuration: `${duration}ms` }}
        className={`absolute inset-0 bg-bg/80 transition-opacity ease-out motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ transitionDuration: `${duration}ms` }}
        className={`relative flex flex-col overflow-hidden border-border bg-surface shadow-soft outline-none transition-[transform,opacity] ease-out motion-reduce:transition-none ${
          isDrawer
            ? `h-full w-full border-l sm:max-w-2xl ${shown ? 'translate-x-0' : 'translate-x-full'}`
            : `max-h-[90dvh] w-full max-w-md rounded-lg border ${shown ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-wide text-text">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            aria-label="Close"
            className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && <div className="border-t border-border bg-surface px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
