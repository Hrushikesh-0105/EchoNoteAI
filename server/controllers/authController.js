const expressAsyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { getUserByEmail, upsertUserFromClerk } = require('../services/userService');
const { signExtensionToken } = require('../services/extensionTokenService');

// GET /api/auth/me — the signed-in user's own record
const getCurrentUser = expressAsyncHandler(async (req, res) => {
    const user = await getUserByEmail(req.userEmail);
    res.json(user);
});

// PUT /api/auth/me — creates the user record on first sign-in, refreshes it after
const syncCurrentUser = expressAsyncHandler(async (req, res) => {
    const { firstName } = req.body;
    if (!req.userEmail || !firstName) throw new ApiError(400, 'Email and firstName are required');

    const user = await upsertUserFromClerk(req.userEmail, firstName);
    res.status(200).json({ message: 'User synced', user });
});

// POST /api/auth/extension-token — mints a token for the extension; called by the website only
const createExtensionToken = expressAsyncHandler(async (req, res) => {
    if (!req.userEmail) throw new ApiError(400, 'No verified email on this account');
    const user = await getUserByEmail(req.userEmail);
    res.status(200).json({ token: signExtensionToken({ email: user.email, firstName: user.firstName }) });
});

module.exports = { getCurrentUser, syncCurrentUser, createExtensionToken };
