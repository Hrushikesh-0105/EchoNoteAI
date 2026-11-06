// Errors from the API: `message` is a short machine-readable reason the dashboard branches on
// (NOT_SIGNED_IN, TOKEN_EXPIRED, SESSION_CLOSED, REQUEST_FAILED); `code` is the server's error code, if any
class ApiError extends Error {
    constructor(message, { status, code, detail } = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.detail = detail;
    }
}

async function getAuthToken() {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) throw new ApiError('NOT_SIGNED_IN');
    return authToken;
}

async function authedFetch(path, options = {}) {
    const token = await getAuthToken();
    const response = await fetch(`${window.ECHO_CONFIG.API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        // Token expired/invalid: drop it so the popup routes back to sign-in next time.
        await chrome.storage.local.remove('authToken');
        throw new ApiError('TOKEN_EXPIRED', { status: 401 });
    }
    return response;
}

// Turns a non-2xx response into an ApiError
async function failure(response) {
    const body = await response.json().catch(() => ({}));
    const reason = response.status === 409 ? 'SESSION_CLOSED' : 'REQUEST_FAILED';
    return new ApiError(reason, { status: response.status, code: body.code, detail: body.error });
}

// Starts a session on the server → { sessionId, maxDurationMs }
export async function createSession(title) {
    const response = await authedFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
    });
    if (!response.ok) throw await failure(response);

    const data = await response.json();
    return { sessionId: data.session._id, maxDurationMs: data.limits?.maxDurationMs };
}

// Uploads one screenshot (multipart; the browser sets the Content-Type boundary itself)
export async function uploadScreenshot(sessionId, blob, capturedAt) {
    const form = new FormData();
    form.append('image', blob, 'screenshot.jpg');
    form.append('capturedAt', String(capturedAt));

    const response = await authedFetch(`/api/sessions/${sessionId}/screenshots`, { method: 'POST', body: form });
    if (!response.ok) throw await failure(response);
    return response.json();
}

// Tells the server the recording ended (safe to call more than once)
export async function stopSession(sessionId) {
    const response = await authedFetch(`/api/sessions/${sessionId}/stop`, { method: 'POST' });
    if (!response.ok) throw await failure(response);
    return response.json();
}
