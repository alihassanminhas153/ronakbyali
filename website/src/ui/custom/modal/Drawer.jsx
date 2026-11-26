import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import AppIcon, { resolveAppIconName } from '../AppIcon';
import useScrollLock from '../motion/useScrollLock';
import { toneVar } from '../../graphs/utils';

// Side panel that slides in from the right (same behaviour as the product form).
//   Mount it while you need it (use a changing `key` for a fresh form), flip `open`.
//   onSubmit given -> the panel is a <form>.   footer = buttons node.
export default function Drawer({
  open,
  onClose,
  title,
  titleClassName = '',
  subtitle,
  icon: Icon,
  tone = 1,
  closeLabel,
  busy = false,
  onSubmit,
  footer,
  children,
  width = 'max-w-xl',
  headerImage = '',
  blurFooter = false,
}) {
  const [shown, setShown] = useState(false);
  const color = toneVar(tone);
  useScrollLock(open);

  useEffect(() => {
    if (!open) { setShown(false); return undefined; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
        <header
          className={`relative flex justify-between gap-3 border-b border-border px-4 sm:px-6 ${
            headerImage
              ? 'min-h-44 items-end overflow-hidden pb-4 pt-14 sm:min-h-56 sm:pb-5 sm:pt-16'
              : 'items-center py-3'
          }`}
        >
          {headerImage && (
            <>
              <img src={headerImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" aria-hidden="true" />
            </>
          )}
          <div className="relative z-10 flex min-w-0 items-center gap-3">
            {Icon && (
              <AppIcon
                name={resolveAppIconName(Icon)}
                tone={tone}
                className="h-10 w-10 shrink-0 object-contain"
              />
            )}
            <div className="min-w-0">
              <h2 className={`heading truncate ${titleClassName}`} style={headerImage ? undefined : { color }}>{title}</h2>
              {subtitle && <p className={`truncate text-xs ${headerImage ? 'text-white/80' : 'text-muted'}`}>{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className={`grid h-10 shrink-0 place-items-center rounded-md transition-colors ${
              headerImage
                ? 'absolute right-3 top-3 z-10 bg-black/40 text-white backdrop-blur-md hover:bg-black/60 sm:right-5'
                : 'text-muted hover:bg-surface-alt hover:text-text'
            } ${
              closeLabel ? 'min-w-16 px-3 text-sm' : 'w-10'
            }`}
          >
            {closeLabel || <X size={18} />}
          </button>
        </header>
        <div className={`flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 ${blurFooter && footer ? 'pb-28' : ''}`}>{children}</div>
        {footer && (
          <footer
            className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-6 ${
              blurFooter
                ? 'absolute inset-x-0 bottom-0 z-10 border-white/20 bg-blue-950/35 backdrop-blur-xl backdrop-saturate-150'
                : 'border-border bg-bg'
            }`}
          >
            {footer}
          </footer>
        )}
      </Panel>
    </div>
  );
}