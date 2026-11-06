const SCREENSHOT_INTERVAL_MS = window.ECHO_CONFIG.SCREENSHOT_INTERVAL_MS || 5000;
const MAX_WIDTH = 1920;     // larger screens are scaled down; plenty for OCR and much smaller uploads
const JPEG_QUALITY = 0.85;

let captureStream = null;
let screenshotInterval = null;
let video = null;

// Asks the user what to share. Rejects (NotAllowedError) if they cancel the picker.
export function requestScreenStream() {
    return navigator.mediaDevices.getDisplayMedia({ video: true });
}

// Starts taking a screenshot of `stream` immediately and then every few seconds:
// onScreenshot(jpegBlob, capturedAt) for each, onStreamEnded() if the user stops sharing from Chrome's UI
export async function startScreenshots(stream, { onScreenshot, onStreamEnded }) {
    captureStream = stream;
    video = document.createElement('video'); // invisible; only used to read frames
    video.srcObject = stream;
    video.muted = true;
    const ready = new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true }));
    await video.play();
    await ready;

    // Fires when sharing is stopped from Chrome's "Stop sharing" bar (not when we stop the tracks ourselves)
    stream.getVideoTracks()[0].addEventListener('ended', onStreamEnded, { once: true });

    captureScreenshot(onScreenshot);
    screenshotInterval = setInterval(() => captureScreenshot(onScreenshot), SCREENSHOT_INTERVAL_MS);
}

function captureScreenshot(onScreenshot) {
    if (!video || video.readyState < 2) {
        console.warn('Video not ready yet to capture screenshot.');
        return;
    }

    const capturedAt = Date.now();
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        if (!blob) {
            console.error('Could not encode screenshot');
            return;
        }
        onScreenshot(blob, capturedAt);
    }, 'image/jpeg', JPEG_QUALITY);
}

// Stops the screenshot timer and the screen share, if any
export function stopScreenCapture() {
    clearInterval(screenshotInterval);
    screenshotInterval = null;

    if (captureStream) {
        captureStream.getTracks().forEach((track) => track.stop());
        captureStream = null;
    }
    if (video) {
        video.srcObject = null;
        video = null;
    }
}
