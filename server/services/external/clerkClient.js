const { clerkClient } = require('@clerk/clerk-sdk-node');

/**
 * Resolves the verified email address for a Clerk-authenticated request.
 * req.auth (set by middlewares/requireClerkAuth.js) only includes claims present on
 * the session token, and email isn't one by default — fall back to the Clerk API
 * when it's absent.
 * @param {object} auth - req.auth from ClerkExpressRequireAuth
 * @returns {Promise<string|null>}
 */
async function resolveEmailFromClerkAuth(auth) {
    if (auth?.email) return auth.email;

    const userId = auth?.userId || auth?.sub;
    if (!userId) return null;

    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
        (address) => address.id === user.primaryEmailAddressId
    );
    return primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
}

module.exports = { resolveEmailFromClerkAuth };
