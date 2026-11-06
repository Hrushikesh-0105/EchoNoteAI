// All DOM lookups/updates for the dashboard live here, so app.js only deals with when, not how

const recordButton = document.getElementById('recordButton');
const titleInput = document.getElementById('recordingTitle');
const recordText = document.getElementById('recordText');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const timerDisplay = document.getElementById('recordingTimer');
const timerText = document.getElementById('timerText');
const timeLeftText = document.getElementById('timeLeftText');
const userNameLabel = document.getElementById('userName');
const viewSessionButton = document.getElementById('viewSessionButton');

const SHOW_TIME_LEFT_MS = 5 * 60_000; // show a countdown in the last 5 minutes

function formatClock(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

export function setUserDisplayName(name) {
    userNameLabel.textContent = name;
}

export function getTrimmedTitle() {
    return titleInput.value.trim();
}

export function onRecordButtonClick(handler) {
    recordButton.addEventListener('click', handler);
}

export function onTitleInput(handler) {
    titleInput.addEventListener('input', handler);
}

export function onViewSessionClick(handler) {
    viewSessionButton.addEventListener('click', handler);
}

export function setRecordButtonEnabled(enabled) {
    recordButton.disabled = !enabled;
}

export function setStatus(text) {
    statusText.textContent = text;
}

// Waiting for the share picker and the server
export function setStarting() {
    recordButton.disabled = true;
    titleInput.disabled = true;
    viewSessionButton.hidden = true;
    recordText.textContent = 'Starting…';
    setStatus('Choose what to share');
}

export function setRecording() {
    recordButton.disabled = false;
    recordButton.classList.add('recording');
    statusIndicator.classList.add('recording');
    recordText.textContent = 'Stop Recording';
    setStatus('Recording...');
    timerDisplay.style.display = 'flex';
    timerText.textContent = '00:00';
    timeLeftText.textContent = '';
    titleInput.disabled = true;
}

// Capture has stopped; finishing uploads and telling the server
export function setStopping() {
    recordButton.disabled = true;
    recordButton.classList.remove('recording');
    statusIndicator.classList.remove('recording');
    recordText.textContent = 'Stopping…';
    setStatus('Saving the last screenshots…');
}

// Back to idle. `message` explains how it ended; `canViewSession` shows the link to the website.
export function setIdle({ message = 'Ready to record', canViewSession = false } = {}) {
    recordButton.classList.remove('recording');
    statusIndicator.classList.remove('recording');
    recordText.textContent = 'Start Full Screen Recording';
    setStatus(message);
    timerDisplay.style.display = 'none';
    timerText.textContent = '00:00';
    timeLeftText.textContent = '';
    titleInput.disabled = false;
    titleInput.value = '';
    recordButton.disabled = true; // until a new title is typed
    viewSessionButton.hidden = !canViewSession;
}

// Elapsed time, plus the time left once the end is near
export function updateTimerDisplay(elapsedMs, remainingMs) {
    timerText.textContent = formatClock(elapsedMs);
    timeLeftText.textContent = remainingMs <= SHOW_TIME_LEFT_MS ? `· ${formatClock(remainingMs)} left` : '';
}
