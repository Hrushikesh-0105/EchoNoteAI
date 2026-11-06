// Builds the text sent to Gemini from a session's screenshots. Pure: no I/O, so it can be unit-tested.
//
// Every completed screenshot with OCR text is sent, in capture order, numbered from 0 (its "index").
// Repeated screenshots are deliberately NOT merged (agreed design); the prompt tells Gemini to treat
// repeated text as one screen. Returns:
//   text    — the rendered input, one block per screenshot: "[index] HH:MM:SS" then its OCR text
//   entries — entries[index] = { imageId, capturedAt }, to map Gemini's indices back to screenshots
//   stats   — sizes for logging (cost monitoring)

// Milliseconds since the session started → "HH:MM:SS"
function formatOffset(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

function buildSummaryInput(session, { maxChars }) {
    const startedAt = new Date(session.startedAt).getTime();

    const usable = (session.images || [])
        .filter((img) => img.status === 'completed' && typeof img.ocrText === 'string' && img.ocrText.trim())
        .sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));

    let texts = usable.map((img) => img.ocrText.trim());
    const originalChars = texts.reduce((sum, text) => sum + text.length, 0);

    // Over the cap: shorten every screenshot's text by the same proportion, so no part of the session is dropped
    const truncated = originalChars > maxChars;
    if (truncated) {
        const ratio = maxChars / originalChars;
        texts = texts.map((text) => text.slice(0, Math.max(1, Math.floor(text.length * ratio))));
    }

    const text = usable
        .map((img, index) => `[${index}] ${formatOffset(new Date(img.capturedAt).getTime() - startedAt)}\n${texts[index]}`)
        .join('\n\n');

    return {
        text,
        entries: usable.map((img) => ({ imageId: img._id, capturedAt: img.capturedAt })),
        stats: { screenshots: usable.length, chars: text.length, originalChars, truncated }
    };
}

module.exports = { buildSummaryInput };
