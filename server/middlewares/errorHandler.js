const logger = require('../utils/logger');

/**
 * Single place every thrown/rejected error in the app ends up. Services throw
 * ApiError for expected conditions (404 not found, 400 bad input); anything else
 * (a 500) is logged server-side and given a generic message — never leaked to the
 * client as a raw stack trace.
 */
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;

    if (statusCode >= 500) {
        logger.error(`${req.method} ${req.originalUrl} failed:`, err);
    }

    res.status(statusCode).json({
        error: statusCode >= 500 ? 'Internal server error' : err.message
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
