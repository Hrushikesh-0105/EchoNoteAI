const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildSessionSummaryPrompt } = require('../../prompts/sessionSummaryPrompt');
const logger = require('../../utils/logger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Reduces a session's raw OCR text to a clean Markdown summary via Gemini
async function generateSessionSummary(rawText) {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = buildSessionSummaryPrompt(rawText);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Gemini summary generation failed:', error);
        throw error;
    }
}

module.exports = { generateSessionSummary };
