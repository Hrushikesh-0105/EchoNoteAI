const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const logger = require('../utils/logger');

const clerkAuth = ClerkExpressRequireAuth({
    onError: (err, req, res) => {
        logger.warn('Clerk auth rejected:', err.message);
        res.status(401).json({ error: 'Unauthorized access' });
    }
});

// Wraps ClerkExpressRequireAuth so a missing Authorization header 401s instead of falling through as a 500
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
