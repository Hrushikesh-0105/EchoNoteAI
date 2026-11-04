const logger = require('../utils/logger');

// Central error handler: ApiErrors map to their status, anything else logs and returns a generic 500
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
