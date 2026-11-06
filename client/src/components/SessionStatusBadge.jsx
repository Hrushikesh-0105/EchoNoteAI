import { isRecording } from '../utils/sessionStatus';

// Statuses that are only reached after the recording finished
const SUMMARY_LABELS = {
  not_started: { label: 'Ready to summarize', className: 'bg-muted text-text' },
  generating: { label: 'Generating', className: 'bg-note text-text' },
  completed: { label: 'Ready', className: 'bg-accent text-surface' },
  failed: { label: 'Failed', className: 'bg-primary text-text' },
};

// One label combining the recording status and the summary status
export default function SessionStatusBadge({ session }) {
  const { label, className } = isRecording(session)
    ? { label: 'Recording', className: 'bg-primary text-text' }
    : SUMMARY_LABELS[session.summaryStatus] || SUMMARY_LABELS.not_started;

  return (
    <span className={`px-3 py-1 text-xs font-bold rounded-pill border-2 border-text ${className}`}>
      {label}
    </span>
  );
}
