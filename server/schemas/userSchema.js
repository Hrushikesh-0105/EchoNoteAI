const mongoose = require('mongoose');

// Sessions live in their own collection (schemas/sessionSchema.js), linked by userId
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const UserModel = mongoose.model('user', userSchema);

module.exports = UserModel;
