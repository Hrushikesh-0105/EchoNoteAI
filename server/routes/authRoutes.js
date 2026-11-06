const express = require('express');

const requireClerkAuth = require('../middlewares/requireClerkAuth');
const attachUserEmailFromClerk = require('../middlewares/attachUserEmailFromClerk');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(requireClerkAuth, attachUserEmailFromClerk);

router.get('/me', authController.getCurrentUser);
router.put('/me', authController.syncCurrentUser);
router.post('/extension-token', authController.createExtensionToken);

module.exports = router;
