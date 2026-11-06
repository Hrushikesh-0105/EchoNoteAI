const express = require('express');
const requireClerkAuth = require('../middlewares/requireClerkAuth');
const attachUserEmailFromClerk = require('../middlewares/attachUserEmailFromClerk');
const requireExtensionAuth = require('../middlewares/requireExtensionAuth');
const { parseScreenshotUpload, screenshotRateLimit } = require('../middlewares/screenshotUpload');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

const requireWebsiteAuth = [requireClerkAuth, attachUserEmailFromClerk];

// Used by the browser extension while recording.
router.post('/', requireExtensionAuth, sessionController.createSession);
router.post(
    '/:sessionId/screenshots',
    requireExtensionAuth,
    screenshotRateLimit,
    parseScreenshotUpload,
    sessionController.addScreenshot
);
router.post('/:sessionId/stop', requireExtensionAuth, sessionController.stopSession);

// Used by the website's dashboard and summary views.
router.get('/', requireWebsiteAuth, sessionController.listSessions);
router.get('/:sessionId', requireWebsiteAuth, sessionController.getSession);
router.get('/:sessionId/images', requireWebsiteAuth, sessionController.listSessionImages);
router.post('/:sessionId/summary', requireWebsiteAuth, sessionController.requestSummary);
router.delete('/:sessionId', requireWebsiteAuth, sessionController.deleteSession);

module.exports = router;
