const UserModel = require('../schemas/userSchema');
const ApiError = require('../utils/ApiError');
const { extractTextFromImage } = require('./external/ocrSpaceClient');
const { generateSessionSummary } = require('./external/geminiClient');

async function findUserOrThrow(email) {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, 'User not found');
    return user;
}

function findSessionOrThrow(user, sessionId) {
    const session = user.sessions.id(sessionId);
    if (!session) throw new ApiError(404, 'Session not found');
    return session;
}

async function createSession(email, title) {
    const user = await findUserOrThrow(email);
    user.sessions.push({ title, summarized: false, date: new Date() });
    await user.save();
    return user.sessions[user.sessions.length - 1];
}

async function listSessions(email) {
    const user = await findUserOrThrow(email);
    return user.sessions;
}

async function getSession(email, sessionId) {
    const user = await findUserOrThrow(email);
    return findSessionOrThrow(user, sessionId);
}

// OCRs a screenshot and appends the extracted text to the session's running transcript
async function appendScreenshotText(email, sessionId, base64Image) {
    const user = await findUserOrThrow(email);
    const session = findSessionOrThrow(user, sessionId);

    const extractedText = await extractTextFromImage(base64Image);
    session.summary += extractedText;
    await user.save();
}

// Generates the summary via Gemini once, then caches it — later requests are free reads
async function getOrGenerateSummary(email, sessionId) {
    const user = await findUserOrThrow(email);
    const session = findSessionOrThrow(user, sessionId);

    if (!session.summarized) {
        session.summary = await generateSessionSummary(session.summary);
        session.summarized = true;
        await user.save();
    }

    return { summary: session.summary, title: session.title };
}

module.exports = {
    createSession,
    listSessions,
    getSession,
    appendScreenshotText,
    getOrGenerateSummary
};
