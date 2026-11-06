const expressAsyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const sessionService = require('../services/sessionService');
const { resolveUserId } = require('../services/userService');

// POST /api/sessions — start a new recording session. Extension-authed.
const createSession = expressAsyncHandler(async (req, res) => {
    const { title } = req.body;
    if (!title) throw new ApiError(400, 'Missing title');

    const userId = await resolveUserId(req.userEmail);
    const session = await sessionService.createSession(userId, title);
    res.status(201).json({ message: 'Session created', session });
});

// GET /api/sessions — list the signed-in user's sessions. Website-authed.
const listSessions = expressAsyncHandler(async (req, res) => {
    const userId = await resolveUserId(req.userEmail);
    const sessions = await sessionService.listSessions(userId);
    res.status(200).json({ sessions });
});

// GET /api/sessions/:sessionId — a single session, without its images. Website-authed.
const getSession = expressAsyncHandler(async (req, res) => {
    const userId = await resolveUserId(req.userEmail);
    const session = await sessionService.findOwnedSession(userId, req.params.sessionId, { images: 0 });
    res.status(200).json({ session });
});

// POST /api/sessions/:sessionId/screenshots — rebuilt in the API stage (Cloudinary upload + OCR queue)
const addScreenshot = expressAsyncHandler(async () => {
    throw new ApiError(501, 'Screenshot upload is being rebuilt and is not available yet');
});

// POST /api/sessions/:sessionId/summary — rebuilt in the API stage (summary gate + Gemini queue)
const generateSummary = expressAsyncHandler(async () => {
    throw new ApiError(501, 'Summary generation is being rebuilt and is not available yet');
});

module.exports = { createSession, listSessions, getSession, addScreenshot, generateSummary };
