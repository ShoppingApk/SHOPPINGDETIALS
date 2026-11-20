import Modal from '../Modal';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3">
          <button type="button" className="btn-outline flex-1" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={danger ? 'flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60' : 'btn-primary flex-1'}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}
