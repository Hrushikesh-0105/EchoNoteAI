// All DOM element lookups and updates for the dashboard page live here, so app.js
// only has to deal with when things happen, not how the page reflects them.

const recordButton = document.getElementById('recordButton');
const titleInput = document.getElementById('recordingTitle');
const recordText = document.getElementById('recordText');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
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
    recordButton.classList.toggle('recording', recording);
    statusIndicator.classList.toggle('recording', recording);

    if (recording) {
        recordText.textContent = 'Stop Recording';
        statusText.textContent = 'Recording...';
        timerDisplay.style.display = 'flex';
        titleInput.disabled = true;
    } else {
        recordText.textContent = 'Start Full Screen Recording';
        statusText.textContent = 'Recording stopped';
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
