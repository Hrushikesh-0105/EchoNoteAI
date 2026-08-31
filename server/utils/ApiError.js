/**
 * A thrown error carrying an HTTP status code. Services throw this for expected
 * failure conditions (not found, bad input); the centralized error-handling
 * middleware (middlewares/errorHandler.js) turns it into a JSON response.
 */
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

module.exports = ApiError;
