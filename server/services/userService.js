const UserModel = require('../schemas/userSchema');
const ApiError = require('../utils/ApiError');

/**
 * @param {string} email
 * @returns {Promise<import('mongoose').Document>}
 * @throws {ApiError} 404 if no user has this email
 */
async function getUserByEmail(email) {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, 'User not found');
    return user;
}

/**
 * Creates the user record on first sign-in, or refreshes the display name on
 * subsequent ones. Idempotent — safe to call on every sign-in.
 * @param {string} email
 * @param {string} firstName
 * @returns {Promise<import('mongoose').Document>}
 */
async function upsertUserFromClerk(email, firstName) {
    return UserModel.findOneAndUpdate(
        { email },
        { email, firstName },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

module.exports = { getUserByEmail, upsertUserFromClerk };
