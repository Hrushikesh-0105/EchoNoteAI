const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// Central error handler: ApiErrors are deliberate, so their status and message go to the client as-is;
// anything else is unexpected, so it's logged in full and the client only gets a generic 500
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const isDeliberate = err instanceof ApiError || statusCode < 500;

    if (!isDeliberate) {
        logger.error(`${req.method} ${req.originalUrl} failed:`, err);
    }

    res.status(statusCode).json({
        error: isDeliberate ? err.message : 'Internal server error'
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
