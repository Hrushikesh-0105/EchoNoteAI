import { uploadScreenShot, getSessionId } from './api.js';
import { startScreenCapture, stopScreenCapture } from './recording.js';
import * as ui from './ui.js';

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

async function initializeDashboard() {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) return redirectToSignIn();
    ui.setUserDisplayName(decodeDisplayNameFromToken(authToken));
}

initializeDashboard();

// If the token gets invalidated (server rejects it) mid-session, api.js clears it —
// bounce back to sign-in rather than leaving a dead dashboard on screen.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'authToken' in changes && !changes.authToken.newValue) {
        redirectToSignIn();
    }
});

let isRecording = false;
let sessionId = null;
let timerInterval = null;
let startTime = null;

ui.onTitleInput(() => {
    ui.setRecordButtonEnabled(ui.getTrimmedTitle() !== '');
});

ui.onRecordButtonClick(() => {
    toggleRecording();
});

async function toggleRecording() {
    const title = ui.getTrimmedTitle();
    if (!title) {
        alert('Please enter a valid recording title.');
        return;
    }

    if (!sessionId) {
        try {
            sessionId = await getSessionId(title);
        } catch (err) {
            if (isAuthError(err)) return redirectToSignIn();
            console.error('Failed to create session:', err);
            alert('Could not start a session. Please try again.');
            return;
        }
    }

    if (!sessionId) return;

    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        await startScreenCapture({ onScreenshot: handleScreenshot, onStreamEnded: stopRecording });
    } catch (err) {
        console.error('Error accessing display media:', err);
        alert('Failed to start screen capture.');
        return;
    }

    isRecording = true;
    startTime = Date.now();
    ui.setRecordingState(true);
    ui.updateTimerDisplay(0);
    timerInterval = setInterval(() => ui.updateTimerDisplay(Date.now() - startTime), 1000);
}

function handleScreenshot(base64Image) {
    uploadScreenShot(base64Image, sessionId).catch((err) => {
        if (isAuthError(err)) {
            stopRecording();
            redirectToSignIn();
        } else {
            console.error('Failed to upload screenshot:', err);
        }
    });
}

function stopRecording() {
    isRecording = false;
    clearInterval(timerInterval);
    stopScreenCapture();
    ui.setRecordingState(false);

    // The summary is generated lazily server-side when the session is opened on the
    // website (sessionController.js's generateSummary), not here — so all that's left
    // to do on stop is let the next recording start a fresh session.
    sessionId = null;
}
