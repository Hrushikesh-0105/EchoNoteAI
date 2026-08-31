const SCREENSHOT_INTERVAL_MS = window.ECHO_CONFIG.SCREENSHOT_INTERVAL_MS || 5000;

let captureStream = null;
let screenshotInterval = null;

/**
 * Starts a screen-share capture and begins periodically snapshotting it.
 * @param {object} handlers
 * @param {(base64Image: string) => void} handlers.onScreenshot - called with each captured frame, base64-encoded PNG
 * @param {() => void} handlers.onStreamEnded - called when the user stops sharing via the browser's own UI
 */
export async function startScreenCapture({ onScreenshot, onStreamEnded }) {
    captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    const video = document.createElement('video');
    video.srcObject = captureStream;
    video.muted = true;
    video.play();
    await new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true }));

    captureScreenshot(video, onScreenshot);
    screenshotInterval = setInterval(() => captureScreenshot(video, onScreenshot), SCREENSHOT_INTERVAL_MS);

    captureStream.getVideoTracks()[0].onended = onStreamEnded;
}

function captureScreenshot(videoElement, onScreenshot) {
    if (videoElement.readyState < 2) {
        console.warn('Video not ready yet to capture screenshot.');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    canvas.getContext('2d').drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        if (!blob) {
            console.error('Blob is null');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Image = reader.result.split(',')[1]; // strip the data:image/png;base64, prefix
            onScreenshot(base64Image);
        };
        reader.readAsDataURL(blob);
    }, 'image/png');
}

/** Stops the active capture and screenshot interval, if any. */
export function stopScreenCapture() {
    clearInterval(screenshotInterval);
    screenshotInterval = null;

    if (captureStream) {
        captureStream.getTracks().forEach((track) => track.stop());
        captureStream = null;
    }
}
