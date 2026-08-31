const { verifyExtensionToken } = require('../services/extensionTokenService');

/**
 * Verifies the browser extension's bearer token (minted by
 * controllers/authController.js#createExtensionToken). Separate from
 * requireClerkAuth because the extension never sees a Clerk session token — only
 * this app-issued, extension-scoped one. Sets req.userEmail on success.
 */
function requireExtensionAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing extension token' });
    }

    try {
        req.userEmail = verifyExtensionToken(token).email;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired extension token', code: 'TOKEN_INVALID' });
    }
}

module.exports = requireExtensionAuth;
