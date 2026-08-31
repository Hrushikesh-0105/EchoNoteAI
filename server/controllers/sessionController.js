const expressAsyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const sessionService = require('../services/sessionService');

/** POST /api/sessions — start a new recording session. Extension-authed. */
const createSession = expressAsyncHandler(async (req, res) => {
    const { title } = req.body;
    if (!title) throw new ApiError(400, 'Missing title');

    const session = await sessionService.createSession(req.userEmail, title);
    res.status(201).json({ message: 'Session created', session });
});

/** GET /api/sessions — list the signed-in user's sessions. Website-authed. */
const listSessions = expressAsyncHandler(async (req, res) => {
    const sessions = await sessionService.listSessions(req.userEmail);
    res.status(200).json({ sessions });
});

/** GET /api/sessions/:sessionId — a single session. Website-authed. */
const getSession = expressAsyncHandler(async (req, res) => {
    const session = await sessionService.getSession(req.userEmail, req.params.sessionId);
    res.status(200).json({ session });
});

/**
 * POST /api/sessions/:sessionId/screenshots — OCR a screenshot and append its text
 * to the session transcript. Extension-authed.
 */
const addScreenshot = expressAsyncHandler(async (req, res) => {
    const { image } = req.body;
    if (!image) throw new ApiError(400, 'Missing image');

    await sessionService.appendScreenshotText(req.userEmail, req.params.sessionId, image);
    res.status(200).json({ message: 'Screenshot processed', sessionId: req.params.sessionId });
});

/**
 * POST /api/sessions/:sessionId/summary — get the final summary, generating it via
 * Gemini on first request. Website-authed.
 */
const generateSummary = expressAsyncHandler(async (req, res) => {
    const result = await sessionService.getOrGenerateSummary(req.userEmail, req.params.sessionId);
    res.status(200).json(result);
});

module.exports = { createSession, listSessions, getSession, addScreenshot, generateSummary };
