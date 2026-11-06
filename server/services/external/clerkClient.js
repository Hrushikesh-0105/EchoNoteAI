const { clerkClient } = require('@clerk/clerk-sdk-node');

// Session tokens don't carry email by default, so fall back to the Clerk API when it's absent
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
