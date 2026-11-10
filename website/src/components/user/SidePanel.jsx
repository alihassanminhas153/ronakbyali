import { useEffect } from 'react';
import { X } from 'lucide-react';

import useEntered from '../../ui/custom/motion/useEntered';

// Panel that slides in from the LEFT. Mount it only while open, so the form
// inside starts fresh every time and the slide-in plays on mount.
export default function SidePanel({ title, onClose, children }) {
  const entered = useEntered();

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    const previous = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-y-0 left-0 flex w-full max-w-md flex-col border-r border-border bg-surface shadow-xl transition-transform duration-300 motion-reduce:transition-none ${
          entered ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 space-y-8 overflow-y-auto p-4 sm:p-6">{children}</div>
      </aside>
    </div>
  );
}