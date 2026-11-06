import { authedRequest } from './httpClient';

// Creates the user record on first sign-in, refreshes the display name after
export function syncCurrentUser(token, firstName) {
    return authedRequest('/api/auth/me', token, { method: 'PUT', body: { firstName } });
}

// Mints a short-lived token to hand off to the browser extension
export function requestExtensionToken(token) {
    return authedRequest('/api/auth/extension-token', token, { method: 'POST' });
}
