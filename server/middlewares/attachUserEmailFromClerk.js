const expressAsyncHandler = require('express-async-handler');
const { resolveEmailFromClerkAuth } = require('../services/external/clerkClient');

// Resolves req.auth into req.userEmail so controllers read one field regardless of auth method
const attachUserEmailFromClerk = expressAsyncHandler(async (req, res, next) => {
    req.userEmail = await resolveEmailFromClerkAuth(req.auth);
    next();
});

module.exports = attachUserEmailFromClerk;
