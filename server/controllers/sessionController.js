const expressAsyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const limits = require('../config/sessionLimits');
const sessionService = require('../services/sessionService');
const { resolveUserId } = require('../services/userService');
const { decideSummaryAction } = require('../services/summaryGate');
const { screenshotFolder, uploadImage, deleteImage } = require('../services/external/cloudinaryClient');
const { publishOcrJob, publishSummaryJob } = require('../queue/publisher');

// Reads an integer query parameter, falling back to a default and clamping to [min, max]
function intParam(value, fallback, min, max) {
    if (value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isInteger(number)) throw new ApiError(400, `Invalid number: ${value}`);
    return Math.min(Math.max(number, min), max);
}

// Accepts epoch milliseconds or an ISO date string
function parseCapturedAt(value) {
    if (value === undefined || value === '') return null;
    const date = /^\d+$/.test(String(value)) ? new Date(Number(value)) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

// POST /api/sessions — start a new recording session. Extension-authed.
const createSession = expressAsyncHandler(async (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) throw new ApiError(400, 'Missing title');

    const userId = await resolveUserId(req.userEmail);
    const session = await sessionService.createSession(userId, title);
    res.status(201).json({
        message: 'Session created',
        session: {
            _id: session._id,
            title: session.title,
            sessionStatus: session.sessionStatus,
            startedAt: session.startedAt
        },
        limits: { maxDurationMs: limits.maxSessionDurationMs }
    });
});

// POST /api/sessions/:sessionId/screenshots — store a screenshot in Cloudinary and queue its OCR. Extension-authed.
// Multipart body: `image` (JPEG/PNG/WebP, ≤ 5 MB) and `capturedAt` (epoch ms or ISO).
const addScreenshot = expressAsyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    if (!req.file) throw new ApiError(400, 'Missing image', 'INVALID_IMAGE');
    const capturedAt = parseCapturedAt(req.body?.capturedAt);
    if (!capturedAt) throw new ApiError(400, 'Missing or invalid capturedAt');

    const userId = await resolveUserId(req.userEmail);
    const session = await sessionService.findOwnedSession(userId, sessionId, {
        sessionStatus: 1,
        startedAt: 1,
        imageCount: { $size: '$images' }
    });

    if (session.sessionStatus === 'completed') {
        throw new ApiError(409, 'This session has ended', 'SESSION_COMPLETED');
    }
    if (Date.now() - new Date(session.startedAt).getTime() > limits.maxSessionDurationMs + limits.durationGraceMs) {
        await sessionService.completeSession(sessionId, 'time_limit');
        throw new ApiError(409, 'This session reached its time limit', 'SESSION_TIME_LIMIT');
    }
    if (session.imageCount >= limits.maxImagesPerSession) {
        throw new ApiError(409, 'This session has reached its screenshot limit', 'SESSION_FULL');
    }

    let stored;
    try {
        stored = await uploadImage(req.file.buffer, { folder: screenshotFolder(userId, sessionId) });
    } catch (err) {
        logger.error(`Screenshot upload for session ${sessionId} failed:`, err.message);
        throw new ApiError(502, 'Could not store the screenshot; try again', 'UPLOAD_FAILED');
    }

    const imageId = new mongoose.Types.ObjectId();
    const added = await sessionService.pushImage(sessionId, {
        _id: imageId,
        capturedAt,
        status: 'processing',
        publicId: stored.publicId,
        url: stored.url
    });
    if (!added) {
        // The session ended while the upload was in flight: don't keep an orphaned image
        await deleteImage(stored.publicId).catch((err) =>
            logger.warn(`Could not delete orphaned image ${stored.publicId}:`, err.message));
        throw new ApiError(409, 'This session has ended', 'SESSION_COMPLETED');
    }

    try {
        await publishOcrJob(sessionId, imageId);
    } catch (err) {
        logger.error(`Could not queue OCR for image ${imageId}:`, err.message);
        await sessionService.setImageResult(sessionId, imageId, { status: 'failed', error: 'queue_unavailable' });
        throw new ApiError(503, 'Screenshot stored but could not be processed; the queue is unavailable', 'QUEUE_UNAVAILABLE');
    }

    res.status(202).json({ imageId, status: 'processing' });
});

// POST /api/sessions/:sessionId/stop — the recording ended. Idempotent. Extension-authed.
const stopSession = expressAsyncHandler(async (req, res) => {
    const userId = await resolveUserId(req.userEmail);
    const { sessionId } = req.params;
    await sessionService.findOwnedSession(userId, sessionId, { _id: 1 }); // 404 unless it's theirs

    const updated = await sessionService.completeSession(sessionId, 'stopped');
    const session = updated || await sessionService.findOwnedSession(userId, sessionId, { sessionStatus: 1, endReason: 1, endedAt: 1 });
    res.status(200).json({ sessionStatus: session.sessionStatus, endReason: session.endReason, endedAt: session.endedAt });
});

// GET /api/sessions?limit=20&before=<ISO> — the user's sessions, newest first. Website-authed.
const listSessions = expressAsyncHandler(async (req, res) => {
    const limit = intParam(req.query.limit, 20, 1, 50);
    let before;
    if (req.query.before !== undefined) {
        before = new Date(req.query.before);
        if (Number.isNaN(before.getTime())) throw new ApiError(400, 'Invalid before date');
    }

    const userId = await resolveUserId(req.userEmail);
    const sessions = await sessionService.listSessions(userId, { limit, before });
    // Pass this back as `before` to get the next page; null when there are no more
    const nextBefore = sessions.length === limit ? sessions[sessions.length - 1].startedAt : null;
    res.status(200).json({ sessions, nextBefore });
});

// GET /api/sessions/:sessionId — session detail with image counts, without the images. Website-authed.
const getSession = expressAsyncHandler(async (req, res) => {
    const userId = await resolveUserId(req.userEmail);
    const session = await sessionService.getSessionDetail(userId, req.params.sessionId);
    res.status(200).json({ session });
});

// GET /api/sessions/:sessionId/images?offset=0&limit=50 — screenshots in capture order (time + link only). Website-authed.
const listSessionImages = expressAsyncHandler(async (req, res) => {
    const offset = intParam(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = intParam(req.query.limit, 50, 1, 100);
    const userId = await resolveUserId(req.userEmail);
    const result = await sessionService.listSessionImages(userId, req.params.sessionId, { offset, limit });
    res.status(200).json(result);
});

// POST /api/sessions/:sessionId/summary — returns the summary, or where it's up to (and starts it when ready).
// Safe to poll. Body { retry: true } retries a failed summary. Website-authed.
const requestSummary = expressAsyncHandler(async (req, res) => {
    const userId = await resolveUserId(req.userEmail);
    const { sessionId } = req.params;
    const session = await sessionService.getSummaryState(userId, sessionId);

    const now = new Date();
    const retry = req.body?.retry === true;
    const { effects, response } = decideSummaryAction(session, now, limits, { retry });

    for (const effect of effects) {
        if (effect.type === 'completeSession') {
            await sessionService.completeSession(sessionId, effect.endReason);
            logger.info(`Session ${sessionId} auto-closed: no screenshot for over ${limits.staleSessionMs / 1000}s`);
        } else if (effect.type === 'failStuckImages') {
            await sessionService.failProcessingImages(sessionId, effect.imageIds, 'timeout');
            logger.warn(`Session ${sessionId}: ${effect.imageIds.length} screenshot(s) stuck in OCR marked failed`);
        } else if (effect.type === 'markNoText') {
            await sessionService.markSummaryNoText(sessionId);
        } else if (effect.type === 'claimAndPublish') {
            const claimed = await sessionService.claimSummary(sessionId, now, limits.summaryStuckMs);
            if (claimed) {
                try {
                    await publishSummaryJob(sessionId);
                    logger.info(`Session ${sessionId}: summary generation queued`);
                } catch (err) {
                    logger.error(`Could not queue summary for session ${sessionId}:`, err.message);
                    await sessionService.releaseSummaryClaim(sessionId, 'queue_unavailable');
                    throw new ApiError(503, 'Could not start the summary; try again shortly', 'QUEUE_UNAVAILABLE');
                }
            }
            // Not claimed: another request already started it, so 'generating' is still the right answer
        }
    }

    const body = { ...response.body, title: session.title };
    if (body.state === 'completed') {
        body.completeSummary = session.completeSummary;
        body.intervalSummaries = session.intervalSummaries;
    }
    res.status(response.status).json(body);
});

module.exports = {
    createSession,
    addScreenshot,
    stopSession,
    listSessions,
    getSession,
    listSessionImages,
    requestSummary
};
