// A recording that stopped sending screenshots this long ago was abandoned (the popup closed without
// stopping); the server closes it as soon as its summary is requested or it's deleted
const ABANDONED_AFTER_MS = 60_000;

// True while a session is actively recording (in progress and still receiving screenshots)
export function isRecording(session) {
  if (session?.sessionStatus !== 'in_progress') return false;
  const quietFor = Date.now() - new Date(session.lastActivityAt || session.startedAt).getTime();
  return quietFor <= ABANDONED_AFTER_MS;
}
