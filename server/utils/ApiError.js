// Thrown error carrying an HTTP status code; errorHandler.js turns it into a JSON response
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

module.exports = ApiError;
