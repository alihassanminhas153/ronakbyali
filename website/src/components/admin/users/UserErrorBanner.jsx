import { AlertCircle, X } from 'lucide-react';

import useEntered from '../../../ui/custom/motion/useEntered';

// Render it only while there is a message ({error && <UserErrorBanner ... />}):
// mounting is what triggers the enter transition. Same look as ConfirmDialog's error.
export default function UserErrorBanner({ message, onDismiss, className = '' }) {
  const entered = useEntered();
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-error transition duration-300 ease-out motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } ${className}`}
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 flex size-7 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}