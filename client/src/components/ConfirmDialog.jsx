import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Modal asking the user to confirm a destructive action. Esc or clicking outside cancels (unless busy).
export default function ConfirmDialog({ title, message, confirmLabel, busyLabel, busy, error, onConfirm, onCancel }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-text/80 flex items-center justify-center p-4 cursor-default"
      onClick={(event) => {
        event.stopPropagation(); // don't trigger a clickable card behind the dialog
        if (!busy) onCancel();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="card-brutal max-w-md w-full p-6" onClick={(event) => event.stopPropagation()}>
        <h2 id="confirm-dialog-title" className="font-heading font-extrabold text-xl text-text">{title}</h2>
        <p className="mt-2 text-text/80">{message}</p>
        {error && <p className="mt-3 font-bold text-primary">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="btn-brutal bg-surface text-text px-4 py-2 rounded-pill font-heading font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="btn-brutal flex items-center gap-2 bg-primary text-text px-4 py-2 rounded-pill font-heading font-bold"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
