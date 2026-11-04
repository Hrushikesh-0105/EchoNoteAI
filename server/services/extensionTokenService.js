const jwt = require('jsonwebtoken');

const TTL = process.env.EXTENSION_TOKEN_TTL || '7d';

// Mints an extension-scoped token so the extension never sees the user's real Clerk credential
function signExtensionToken({ email, firstName }) {
    return jwt.sign({ email, firstName }, process.env.EXTENSION_TOKEN_SECRET, { expiresIn: TTL });
}

// Verifies a token minted by signExtensionToken
function verifyExtensionToken(token) {
    return jwt.verify(token, process.env.EXTENSION_TOKEN_SECRET);
}

module.exports = { signExtensionToken, verifyExtensionToken };
