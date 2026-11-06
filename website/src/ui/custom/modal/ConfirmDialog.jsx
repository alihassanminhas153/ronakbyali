import { AlertCircle } from 'lucide-react';

import ActionButton from '../button/ActionButton';
import Modal from './Modal';

// "Are you sure?" dialog. danger turns the confirm button red.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      busy={busy}
      layer="z-[60]"
      footer={
        <div className="flex justify-end gap-3">
          <ActionButton variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </ActionButton>
          <ActionButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </ActionButton>
        </div>
      }
    >
      <p className="text-sm text-muted">{message}</p>
      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-error">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </Modal>
  );
}
