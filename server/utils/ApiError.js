// Thrown error carrying an HTTP status code, and optionally a machine-readable code the client can
// branch on (e.g. 'SESSION_COMPLETED'); errorHandler.js turns it into a JSON response
class ApiError extends Error {
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        if (code) this.code = code;
    }
}

module.exports = ApiError;
