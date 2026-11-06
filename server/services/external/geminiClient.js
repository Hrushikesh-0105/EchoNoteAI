const { GoogleGenAI } = require('@google/genai');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const REQUEST_TIMEOUT_MS = 5 * 60_000; // long sessions produce long prompts and long answers

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: REQUEST_TIMEOUT_MS }
});

// API errors carry the whole JSON error body as their message; reduce it to "status: message"
function describeApiError(err) {
    let message = err.message;
    try {
        const parsed = JSON.parse(err.message);
        message = parsed?.error?.message || message;
    } catch { /* not JSON */ }
    return `${err.status ? `${err.status} ` : ''}${message}`.slice(0, 300);
}

// Sends `prompt` and asks for JSON matching `schema` (a JSON Schema); resolves to the parsed object.
// Throws on API errors, blocked/empty responses and unparseable JSON — the caller retries.
async function generateStructuredSummary(prompt, schema) {
    let response;
    try {
        response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseJsonSchema: schema
            }
        });
    } catch (err) {
        throw new Error(`Gemini request failed: ${describeApiError(err)}`);
    }

    const text = response.text;
    if (!text) {
        const reason = response.candidates?.[0]?.finishReason || response.promptFeedback?.blockReason || 'no text';
        throw new Error(`Gemini returned no summary (${reason})`);
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Gemini returned invalid JSON (${text.length} chars)`);
    }
}

module.exports = { generateStructuredSummary, MODEL_NAME };
