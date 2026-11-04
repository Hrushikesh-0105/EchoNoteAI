const UserModel = require('../schemas/userSchema');
const ApiError = require('../utils/ApiError');

// Throws 404 if no user has this email
async function getUserByEmail(email) {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(404, 'User not found');
    return user;
}

// Creates the user record on first sign-in, or refreshes the name after — idempotent
async function upsertUserFromClerk(email, firstName) {
    return UserModel.findOneAndUpdate(
        { email },
        { email, firstName },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

module.exports = { getUserByEmail, upsertUserFromClerk };
