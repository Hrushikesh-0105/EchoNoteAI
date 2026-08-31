const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    title: String,
    // True once the raw OCR text has been reduced to a final Gemini summary.
    summarized: Boolean,
    date: {
        type: Date,
        default: Date.now
    },
    summary: { type: String, default: '' }
});

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
    },
    sessions: [sessionSchema]
}, {
    timestamps: true
});

const UserModel = mongoose.model('user', userSchema);

module.exports = UserModel;
