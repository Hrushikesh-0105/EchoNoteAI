const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
    storage: multer.memoryStorage(), // the buffer goes straight to Cloudinary; nothing is written to disk
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.has(file.mimetype)) return cb(null, true);
        cb(new ApiError(400, `Unsupported image type ${file.mimetype}; use JPEG, PNG or WebP`, 'INVALID_IMAGE'));
    }
});

const parseSingleImage = upload.single('image');

// Parses the multipart body (field `image`, plus text fields like `capturedAt`), turning multer's
// errors into clean 400/413 responses
function parseScreenshotUpload(req, res, next) {
    parseSingleImage(req, res, (err) => {
        if (!err) return next();
        if (err instanceof ApiError) return next(err);
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new ApiError(413, 'Image is larger than 5 MB', 'IMAGE_TOO_LARGE'));
            }
            return next(new ApiError(400, `Invalid upload: ${err.message}`, 'INVALID_IMAGE'));
        }
        next(err);
    });
}

// At most 30 screenshots a minute per user (the extension sends about 12); runs after auth, so it's keyed by user
const screenshotRateLimit = rateLimit({
    windowMs: 60_000,
    limit: 30,
    keyGenerator: (req) => req.userEmail,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many screenshots; slow down', code: 'RATE_LIMITED' });
    }
});

module.exports = { parseScreenshotUpload, screenshotRateLimit };
