import { createSession, uploadScreenshot, stopSession } from './api.js';
import { requestScreenStream, startScreenshots, stopScreenCapture } from './recording.js';
import * as ui from './ui.js';

const DEFAULT_MAX_DURATION_MS = 60 * 60_000; // the server sends the real limit when a session starts
const UPLOAD_DRAIN_TIMEOUT_MS = 15_000;      // how long stopping waits for screenshots still uploading

function decodeDisplayNameFromToken(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.firstName || payload.email || 'User';
    } catch {
        return 'User';
    }
}

function isAuthError(err) {
    return err.message === 'NOT_SIGNED_IN' || err.message === 'TOKEN_EXPIRED';
}

function redirectToSignIn() {
    window.location.href = '../Authentication/signin.html';
}

function describeDuration(ms) {
    const minutes = Math.round(ms / 60_000);
    if (minutes % 60 === 0) {
        const hours = minutes / 60;
        return `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function initializeDashboard() {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) return redirectToSignIn();
    ui.setUserDisplayName(decodeDisplayNameFromToken(authToken));
}

initializeDashboard();

// If the token gets invalidated mid-session, bounce back to sign-in rather than leaving a dead dashboard
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'authToken' in changes && !changes.authToken.newValue) {
        redirectToSignIn();
    }
});

// 'idle' → 'starting' → 'recording' → 'stopping' → 'idle'
let state = 'idle';
let sessionId = null;
let maxDurationMs = DEFAULT_MAX_DURATION_MS;
let startTime = null;
let timerInterval = null;
let lastSessionId = null;          // for the "view on website" link after stopping
const pendingUploads = new Set();  // uploads still in flight, awaited before telling the server we stopped

ui.onTitleInput(() => {
    if (state === 'idle') ui.setRecordButtonEnabled(ui.getTrimmedTitle() !== '');
});

ui.onRecordButtonClick(() => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording({ reason: 'user' });
});

ui.onViewSessionClick(() => {
    if (lastSessionId) chrome.tabs.create({ url: `${window.ECHO_CONFIG.WEBSITE_URL}summary/${lastSessionId}` });
});

async function startRecording() {
    const title = ui.getTrimmedTitle();
    if (!title) return;
    state = 'starting';
    ui.setStarting();

    // 1. Ask what to share first, so cancelling the picker never leaves an empty session behind
    let stream;
    try {
        stream = await requestScreenStream();
    } catch (err) {
        state = 'idle';
        const cancelled = err.name === 'NotAllowedError';
        if (!cancelled) console.error('Error accessing display media:', err);
        ui.setIdle({ message: cancelled ? 'Screen sharing was cancelled' : 'Could not start screen capture' });
        return;
    }

    // 2. Then start the session on the server
    try {
        const session = await createSession(title);
        sessionId = session.sessionId;
        maxDurationMs = session.maxDurationMs || DEFAULT_MAX_DURATION_MS;
    } catch (err) {
        stream.getTracks().forEach((track) => track.stop());
        state = 'idle';
        if (isAuthError(err)) return redirectToSignIn();
        console.error('Failed to create session:', err);
        ui.setIdle({ message: 'Could not start a session. Please try again.' });
        return;
    }

    // 3. Start taking screenshots
    try {
        await startScreenshots(stream, {
            onScreenshot: handleScreenshot,
            onStreamEnded: () => stopRecording({ reason: 'stream_ended' })
        });
    } catch (err) {
        console.error('Failed to start screenshots:', err);
        stopScreenCapture();
        stopSession(sessionId).catch(() => {}); // the session is empty; close it
        sessionId = null;
        state = 'idle';
        ui.setIdle({ message: 'Could not start screen capture' });
        return;
    }

    state = 'recording';
    startTime = Date.now();
    ui.setRecording();
    timerInterval = setInterval(tick, 1000);
}

// Updates the timer and stops at the session's time limit
function tick() {
    const elapsed = Date.now() - startTime;
    ui.updateTimerDisplay(elapsed, maxDurationMs - elapsed);
    if (elapsed >= maxDurationMs) stopRecording({ reason: 'time_limit' });
}

function handleScreenshot(blob, capturedAt) {
    if (state !== 'recording' || !sessionId) return;

    const upload = uploadScreenshot(sessionId, blob, capturedAt)
        .catch((err) => {
            if (isAuthError(err)) {
                // The token was removed; the storage listener redirects to sign-in
                stopRecording({ reason: 'signed_out', serverAlreadyClosed: true });
            } else if (err.message === 'SESSION_CLOSED') {
                // The server ended the session (time limit, or it was closed elsewhere); don't call stop again
                const reason = err.code === 'SESSION_TIME_LIMIT' ? 'time_limit' : 'closed';
                stopRecording({ reason, serverAlreadyClosed: true });
            } else {
                // One lost screenshot shouldn't end the recording
                console.error('Failed to upload screenshot:', err.status, err.code || err.message);
            }
        })
        .finally(() => pendingUploads.delete(upload));
    pendingUploads.add(upload);
}

// Stops capturing, waits for uploads still in flight, then tells the server the session ended.
// If this page closes before that (e.g. the popup is dismissed), the server auto-closes the session after
// a minute without screenshots.
async function stopRecording({ reason, serverAlreadyClosed = false }) {
    if (state !== 'recording') return;
    state = 'stopping';
    clearInterval(timerInterval);
    stopScreenCapture();
    ui.setStopping();

    await Promise.race([Promise.allSettled([...pendingUploads]), sleep(UPLOAD_DRAIN_TIMEOUT_MS)]);

    const endedSessionId = sessionId;
    if (!serverAlreadyClosed) {
        try {
            await stopSession(endedSessionId);
        } catch (err) {
            // Not fatal: the server auto-closes sessions that stop receiving screenshots
            if (!isAuthError(err)) console.error('Failed to stop session:', err.status, err.code || err.message);
        }
    }

    sessionId = null;
    lastSessionId = endedSessionId;
    state = 'idle';

    const messages = {
        user: 'Recording saved',
        stream_ended: 'Screen sharing ended. Recording saved',
        time_limit: `Time limit reached (${describeDuration(maxDurationMs)}). Recording saved`,
        closed: 'Session ended',
        signed_out: 'Signed out'
    };
    ui.setIdle({ message: messages[reason] || 'Recording saved', canViewSession: reason !== 'signed_out' });
}
