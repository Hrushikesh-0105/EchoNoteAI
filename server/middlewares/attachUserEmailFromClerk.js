const expressAsyncHandler = require('express-async-handler');
const { resolveEmailFromClerkAuth } = require('../services/external/clerkClient');

/**
 * Runs after requireClerkAuth to resolve req.auth into req.userEmail — so
 * controllers can read req.userEmail uniformly, whether the request came through
 * Clerk (website) or the extension-token middleware (browser extension).
 */
const attachUserEmailFromClerk = expressAsyncHandler(async (req, res, next) => {
    req.userEmail = await resolveEmailFromClerkAuth(req.auth);
    next();
});

module.exports = attachUserEmailFromClerk;
