import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { tint, toneVar } from '../../graphs/utils';

// Side panel that slides in from the right (same behaviour as the product form).
//   Mount it while you need it (use a changing `key` for a fresh form), flip `open`.
//   onSubmit given -> the panel is a <form>.   footer = buttons node.
export default function Drawer({ open, onClose, title, subtitle, icon: Icon, tone = 1, busy = false, onSubmit, footer, children, width = 'max-w-xl' }) {
  const [shown, setShown] = useState(false);
  const color = toneVar(tone);

  useEffect(() => {
    if (!open) { setShown(false); return undefined; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, busy, onClose]);

  const Panel = onSubmit ? 'form' : 'div';
  const panelProps = onSubmit ? { onSubmit, noValidate: true } : {};

  return (
    <div className="fixed inset-0 z-50" style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? 0 : 350}ms` }} aria-hidden={!open}>
      <div onClick={() => !busy && onClose()} className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />
      <Panel
        {...panelProps}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full ${width} flex-col border-l border-border bg-bg shadow-soft transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: tint(color, 14), color }}>
                <Icon size={20} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="heading truncate" style={{ color }}>{title}</h2>
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-muted transition-colors hover:bg-surface-alt hover:text-text">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 sm:px-6">{footer}</footer>}
      </Panel>
    </div>
  );
}