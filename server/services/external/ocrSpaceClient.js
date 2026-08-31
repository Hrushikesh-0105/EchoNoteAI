const axios = require('axios');
const logger = require('../../utils/logger');

const OCR_SPACE_API_URL = process.env.OCR_SPACE_API_URL || 'https://api.ocr.space/parse/image';

/**
 * Runs OCR on a base64-encoded PNG via the OCR.space API.
 * @param {string} base64Image - image bytes, base64-encoded, no data: URI prefix
 * @returns {Promise<string>} the extracted text
 */
async function extractTextFromImage(base64Image) {
    const body = new URLSearchParams();
    body.append('base64Image', `data:image/png;base64,${base64Image}`);
    body.append('language', 'eng');
    body.append('isOverlayRequired', 'false');
    body.append('OCREngine', '2'); // engine 2: better auto language/layout detection

    try {
        const response = await axios.post(OCR_SPACE_API_URL, body.toString(), {
            headers: {
                apikey: process.env.OCR_SPACE_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return response.data.ParsedResults[0].ParsedText;
    } catch (error) {
        logger.error('OCR.space request failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { extractTextFromImage };
