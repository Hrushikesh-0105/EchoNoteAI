const axios = require('axios');

const OCR_SPACE_API_URL = process.env.OCR_SPACE_API_URL || 'https://api.ocr.space/parse/image';
const REQUEST_TIMEOUT_MS = 60_000;

// Runs OCR on a publicly reachable image URL (the screenshot's Cloudinary link) via the OCR.space API.
// Resolves to the extracted text (possibly empty for a blank screen); throws a descriptive error otherwise.
async function extractTextFromUrl(url) {
    const body = new URLSearchParams();
    body.append('url', url);
    body.append('language', 'eng');
    body.append('isOverlayRequired', 'false');
    body.append('OCREngine', '2'); // engine 2: better auto language/layout detection

    let data;
    try {
        const response = await axios.post(OCR_SPACE_API_URL, body.toString(), {
            headers: {
                apikey: process.env.OCR_SPACE_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: REQUEST_TIMEOUT_MS
        });
        data = response.data;
    } catch (error) {
        const detail = error.response
            ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data).slice(0, 200)}`
            : error.message;
        throw new Error(`OCR.space request failed: ${detail}`);
    }

    // OCR.space reports most failures with HTTP 200 and an error payload (or a plain-text message)
    if (!data || typeof data !== 'object') {
        throw new Error(`OCR.space returned an unexpected response: ${String(data).slice(0, 200)}`);
    }
    if (data.IsErroredOnProcessing) {
        const message = [].concat(data.ErrorMessage || []).join('; ') || 'unknown error';
        throw new Error(`OCR.space could not process the image: ${message}`);
    }

    const result = Array.isArray(data.ParsedResults) ? data.ParsedResults[0] : null;
    if (!result) {
        throw new Error('OCR.space returned no parsed results');
    }
    if (result.ErrorMessage && !result.ParsedText) {
        throw new Error(`OCR.space could not read the image: ${result.ErrorMessage}`);
    }

    return result.ParsedText || '';
}

module.exports = { extractTextFromUrl };
