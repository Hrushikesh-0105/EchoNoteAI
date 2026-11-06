import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { deleteSession } from '../api/sessionsApi';
import { isRecording } from '../utils/sessionStatus';

// Deletes a session after confirmation. Disabled while the session is recording (the server refuses too).
// `compact` shows just the icon (dashboard cards); otherwise icon + label.
export default function DeleteSessionButton({ session, onDeleted, compact = false }) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const recording = isRecording(session);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      await deleteSession(token, session._id);
      setBusy(false);
      setOpen(false);
      onDeleted(session._id);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err.message || 'Could not delete the session. Please try again.');
      setBusy(false);
    }
  };

  const hint = recording ? 'Stop the recording before deleting this session' : 'Delete session';
  const className = compact
    ? 'p-1.5 rounded-pill text-text/60 hover:text-primary hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none'
    : 'flex items-center gap-1 font-heading font-bold text-text hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none';

  return (
    <>
      <span title={hint}>
        <button
          onClick={(event) => {
            event.stopPropagation(); // don't open the session when used inside a clickable card
            setOpen(true);
          }}
          disabled={recording}
          aria-label={hint}
          className={className}
        >
          <Trash2 className="w-5 h-5" strokeWidth={2.5} />
          {!compact && 'Delete'}
        </button>
      </span>

      {open && (
        <ConfirmDialog
          title="Delete this session?"
          message={`"${session.title}" will be permanently deleted, along with all its screenshots and its summary. This can't be undone.`}
          confirmLabel="Delete"
          busyLabel="Deleting…"
          busy={busy}
          error={error}
          onConfirm={handleConfirm}
          onCancel={close}
        />
      )}
    </>
  );
}
