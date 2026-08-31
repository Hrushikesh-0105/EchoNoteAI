// All DOM element lookups and updates for the dashboard page live here, so app.js
// only has to deal with when things happen, not how the page reflects them.

const recordButton = document.getElementById('recordButton');
const titleInput = document.getElementById('recordingTitle');
const recordIcon = document.getElementById('recordIcon');
const recordText = document.getElementById('recordText');
const statusText = document.getElementById('statusText');
const statusDot = document.querySelector('.status-dot');
const timerDisplay = document.getElementById('recordingTimer');
const timerText = document.getElementById('timerText');
const userNameLabel = document.getElementById('userName');

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

export function setRecordButtonEnabled(enabled) {
    recordButton.disabled = !enabled;
}

/** Switches every recording-related UI element between its recording/idle look. */
export function setRecordingState(recording) {
    if (recording) {
        recordIcon.textContent = '⏹️';
        recordText.textContent = 'Stop Recording';
        statusText.textContent = 'Recording...';
        statusDot.style.backgroundColor = 'red';
        timerDisplay.style.display = 'block';
        titleInput.disabled = true;
    } else {
        recordIcon.textContent = '🔴';
        recordText.textContent = 'Start Full Screen Recording';
        statusText.textContent = 'Recording stopped';
        statusDot.style.backgroundColor = 'gray';
        timerDisplay.style.display = 'none';
        timerText.textContent = '00:00';
        titleInput.disabled = false;
        titleInput.value = '';
        recordButton.disabled = true;
    }
}

export function updateTimerDisplay(elapsedMs) {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    timerText.textContent = `${minutes}:${seconds}`;
}
