const { startConsumer } = require('./runConsumer');
const { QUEUES } = require('../queue/topology');
const { findImage, setImageResult } = require('../services/sessionService');
const { extractTextFromUrl } = require('../services/external/ocrSpaceClient');

const PREFETCH = Number(process.env.OCR_PREFETCH) || 2;
const MAX_ATTEMPTS = Number(process.env.OCR_MAX_ATTEMPTS) || 3;

// OCRs one screenshot and stores the text. Skips images that are gone or already finished, so a
// redelivered or duplicate message is harmless.
async function handleOcrJob({ sessionId, imageId }) {
    const image = await findImage(sessionId, imageId);
    if (!image) return 'skipped (image not found)';
    if (image.status !== 'processing') return `skipped (already ${image.status})`;

    const ocrText = await extractTextFromUrl(image.url);
    const updated = await setImageResult(sessionId, imageId, { status: 'completed', ocrText });
    return updated ? `completed (${ocrText.length} chars of text)` : 'skipped (finished by another delivery)';
}

// After the last attempt, mark the image failed so summaries don't wait for it forever
async function markOcrFailed({ sessionId, imageId }, err) {
    await setImageResult(sessionId, imageId, { status: 'failed', error: err.message.slice(0, 500) });
}

function startOcrConsumer(channel) {
    return startConsumer(channel, {
        queue: QUEUES.OCR,
        label: 'ocr',
        prefetch: PREFETCH,
        maxAttempts: MAX_ATTEMPTS,
        handle: handleOcrJob,
        onFinalFailure: markOcrFailed
    });
}

module.exports = { startOcrConsumer };
