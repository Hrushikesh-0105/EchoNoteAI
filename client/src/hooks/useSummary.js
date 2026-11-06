import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { requestSummary } from '../api/sessionsApi';

const WAITING_STATES = new Set(['recording', 'processing', 'generating']);
const FAST_POLL_MS = 3_000;
const SLOW_POLL_MS = 10_000;
const SLOW_DOWN_AFTER_MS = 2 * 60_000;

// Asks for a session's summary and keeps asking while it's still on its way (recording, OCR running,
// or Gemini generating), every 3 seconds and then every 10 seconds after 2 minutes. Returns the latest
// response ({ state, imageCounts, reason, completeSummary, intervalSummaries, equations, ... }) plus:
//   error  — a message if the request itself failed (polling stops; `reload` tries again)
//   retry  — restarts a failed summary
//   reload — asks again after a request error
export function useSummary(sessionId) {
  const { getToken } = useAuth();
  const [result, setResult] = useState({ state: 'loading' });
  const [error, setError] = useState(null);
  const [run, setRun] = useState(0);         // bumping this restarts polling
  const retryNextRef = useRef(false);        // send { retry: true } on the next request
  const getTokenRef = useRef(getToken);      // Clerk may hand out a new function each render
  getTokenRef.current = getToken;

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const startedAt = Date.now();

    async function poll() {
      const retry = retryNextRef.current;
      retryNextRef.current = false;
      try {
        const token = await getTokenRef.current();
        const body = await requestSummary(token, sessionId, { retry });
        if (cancelled) return;
        setResult(body);
        setError(null);
        if (WAITING_STATES.has(body.state)) {
          const delay = Date.now() - startedAt > SLOW_DOWN_AFTER_MS ? SLOW_POLL_MS : FAST_POLL_MS;
          timer = setTimeout(poll, delay);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching summary:', err);
        setError(err.message || 'Failed to load the summary.');
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, run]);

  const retry = useCallback(() => {
    retryNextRef.current = true;
    setResult((previous) => ({ ...previous, state: 'generating', reason: undefined }));
    setRun((n) => n + 1);
  }, []);

  const reload = useCallback(() => {
    setError(null);
    setRun((n) => n + 1);
  }, []);

  return { ...result, error, retry, reload };
}
