import { authedRequest } from './httpClient';

// One page of the user's sessions, newest first → { sessions, nextBefore } (pass nextBefore back for the next page)
export function listSessions(token, { before, limit = 20 } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    return authedRequest(`/api/sessions?${params}`, token);
}

// Session detail (title, times, statuses, image counts, summaries) → { session }
export function getSession(token, sessionId) {
    return authedRequest(`/api/sessions/${sessionId}`, token);
}

// One page of a session's screenshots in capture order → { images: [{ _id, capturedAt, url }], total }
export function listSessionImages(token, sessionId, { offset = 0, limit = 50 } = {}) {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    return authedRequest(`/api/sessions/${sessionId}/images?${params}`, token);
}

// The summary, or where it's up to: { state: recording | processing | generating | completed | failed, ... }.
// Safe to poll; starts generation when the session is ready. `retry` restarts a failed summary.
export function requestSummary(token, sessionId, { retry = false } = {}) {
    return authedRequest(`/api/sessions/${sessionId}/summary`, token, {
        method: 'POST',
        body: retry ? { retry: true } : {}
    });
}

// Permanently deletes a finished session with its screenshots and summary → { deleted, imagesDeleted }.
// Fails (409) while the session is still recording.
export function deleteSession(token, sessionId) {
    return authedRequest(`/api/sessions/${sessionId}`, token, { method: 'DELETE' });
}
