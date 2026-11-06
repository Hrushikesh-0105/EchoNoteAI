const { verifyExtensionToken } = require('../services/extensionTokenService');

// Verifies the extension's app-issued bearer token (minted by authController#createExtensionToken); sets req.userEmail
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
