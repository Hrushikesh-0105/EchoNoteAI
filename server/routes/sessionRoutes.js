const express = require('express');
const requireClerkAuth = require('../middlewares/requireClerkAuth');
const attachUserEmailFromClerk = require('../middlewares/attachUserEmailFromClerk');
const requireExtensionAuth = require('../middlewares/requireExtensionAuth');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

const requireWebsiteAuth = [requireClerkAuth, attachUserEmailFromClerk];

// Created by, and appended to by, the browser extension while recording.
router.post('/', requireExtensionAuth, sessionController.createSession);
router.post('/:sessionId/screenshots', requireExtensionAuth, sessionController.addScreenshot);

// Read by the website's dashboard/summary views.
router.get('/', requireWebsiteAuth, sessionController.listSessions);
router.get('/:sessionId', requireWebsiteAuth, sessionController.getSession);
router.post('/:sessionId/summary', requireWebsiteAuth, sessionController.generateSummary);

module.exports = router;
