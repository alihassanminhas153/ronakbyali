import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../../store/slices/hooks';
import { removeToast, selectToasts } from '../../../store/slices/uiSlice';

const POSITIONS = {
  'top-left': 'left-4 top-4 sm:left-6 sm:top-6',
  'top-center': 'left-4 right-4 top-4 sm:left-1/2 sm:right-auto sm:top-6 sm:-translate-x-1/2',
  'top-right': 'right-4 top-4 sm:right-6 sm:top-6',
  'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
  'bottom-center': 'bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2',
  'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
};

const TYPES = {
  error: {
    Icon: AlertCircle,
    className: 'border-error/40 bg-surface text-error',
    role: 'alert',
  },
  success: {
    Icon: CheckCircle2,
    className: 'border-success/40 bg-surface text-success',
    role: 'status',
  },
  warning: {
    Icon: TriangleAlert,
    className: 'border-warning/40 bg-surface text-warning',
    role: 'alert',
  },
  info: {
    Icon: Info,
    className: 'border-accent/40 bg-surface text-accent',
    role: 'status',
  },
};

const isPosition = (value) => Object.prototype.hasOwnProperty.call(POSITIONS, value);

function ToastItem({ toast, duration, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef(null);
  const isClosing = useRef(false);
  const style = TYPES[toast.type] || TYPES.info;
  const Icon = style.Icon;

  const close = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;
    setLeaving(true);
    exitTimer.current = setTimeout(() => onDismiss(toast.id), 220);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (duration === 0) return undefined;
    const timer = setTimeout(close, duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(exitTimer.current);
    };
  }, [close, duration]);

  return (
    <div
      role={style.role}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-soft transition duration-200 motion-reduce:transition-none ${
        leaving ? 'translate-y-2 opacity-0' : 'animate-rise'
      } ${style.className}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-text">{toast.message}</p>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss notification"
        className="grid size-6 shrink-0 place-items-center rounded text-muted transition-colors hover:bg-surface-alt hover:text-text"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ToastViewport({ position = 'bottom-right', duration = 5000 }) {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(selectToasts);
  const defaultPosition = isPosition(position) ? position : 'bottom-right';
  const dismiss = useCallback((id) => dispatch(removeToast(id)), [dispatch]);

  return Object.keys(POSITIONS).map((slot) => {
    const items = toasts.filter((toast) => (isPosition(toast.position) ? toast.position : defaultPosition) === slot);
    if (!items.length) return null;

    return (
      <div
        key={slot}
        className={`pointer-events-none fixed z-[200] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-2 overflow-hidden sm:w-96 ${POSITIONS[slot]}`}
        aria-live="polite"
      >
        {items.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            duration={Number.isFinite(toast.duration) ? Math.max(0, toast.duration) : duration}
            onDismiss={dismiss}
          />
        ))}
      </div>
    );
  });
}
