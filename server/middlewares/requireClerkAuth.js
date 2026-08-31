const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const logger = require('../utils/logger');

const clerkAuth = ClerkExpressRequireAuth({
    onError: (err, req, res) => {
        logger.warn('Clerk auth rejected:', err.message);
        res.status(401).json({ error: 'Unauthorized access' });
    }
});

/**
 * Verifies the website's Clerk session token; sets req.auth on success.
 *
 * Wraps ClerkExpressRequireAuth because when there's no Authorization header at all
 * (as opposed to an invalid/expired one), it calls next(new Error('Unauthenticated'))
 * directly instead of going through its own onError option — left alone, that would
 * fall through to the generic error-handling middleware as a 500 instead of a 401.
 */
function requireClerkAuth(req, res, next) {
    clerkAuth(req, res, (err) => {
        if (err) {
            logger.warn('Clerk auth rejected:', err.message);
            return res.status(401).json({ error: 'Unauthorized access' });
        }
        next();
    });
}

module.exports = requireClerkAuth;
