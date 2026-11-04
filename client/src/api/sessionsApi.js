import { authedRequest } from './httpClient';

// Lists all recording sessions for the signed-in user
export function listSessions(token) {
    return authedRequest('/api/sessions', token);
}

// Fetches a session's final summary, generating it server-side on first request
export function getSessionSummary(token, sessionId) {
    return authedRequest(`/api/sessions/${sessionId}/summary`, token, { method: 'POST' });
}
