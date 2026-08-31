const jwt = require('jsonwebtoken');

const TTL = process.env.EXTENSION_TOKEN_TTL || '7d';

/**
 * Mints a short-lived, extension-scoped token for a verified user. Handed to the
 * browser extension by the website after a real Clerk sign-in (see
 * controllers/authController.js#createExtensionToken) so the extension never sees
 * the user's actual Clerk credential. Carries firstName too, purely so the extension
 * UI has a display name without needing a second authenticated call.
 * @param {{ email: string, firstName: string }} user
 * @returns {string} signed JWT
 */
function signExtensionToken({ email, firstName }) {
    return jwt.sign({ email, firstName }, process.env.EXTENSION_TOKEN_SECRET, { expiresIn: TTL });
}

/**
 * Verifies a token minted by signExtensionToken.
 * @param {string} token
 * @returns {{ email: string, firstName: string }} decoded payload
 * @throws if the token is missing, malformed, or expired
 */
function verifyExtensionToken(token) {
    return jwt.verify(token, process.env.EXTENSION_TOKEN_SECRET);
}

module.exports = { signExtensionToken, verifyExtensionToken };
