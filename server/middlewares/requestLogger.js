const crypto = require('crypto');
const logger = require('../utils/logger');

const MAX_STRING = 120;        // longer strings (summaries, OCR text, images) are cut to this
const MAX_ARRAY_ITEMS = 5;     // longer arrays show the first few items plus a count
const MAX_DEPTH = 4;
const REDACTED_KEYS = new Set(['token', 'authorization', 'password', 'apikey', 'secret']);
const BINARY_KEYS = new Set(['image', 'base64image']); // logged as their length only

// Makes a compact, safe copy of a request/response body for logging: no secrets, no huge strings
function summarize(value, depth = 0) {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
        return value.length > MAX_STRING
            ? `${value.slice(0, MAX_STRING)}… (${value.length} chars)`
            : value;
    }

    if (typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toHexString === 'function') return value.toHexString(); // ObjectId
    if (depth >= MAX_DEPTH) return Array.isArray(value) ? `[array(${value.length})]` : '[object]';

    if (Array.isArray(value)) {
        const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => summarize(item, depth + 1));
        if (value.length > MAX_ARRAY_ITEMS) items.push(`… ${value.length - MAX_ARRAY_ITEMS} more`);
        return items;
    }

    const plain = typeof value.toJSON === 'function' ? value.toJSON() : value; // Mongoose documents
    const result = {};
    for (const [key, entry] of Object.entries(plain)) {
        const lowerKey = key.toLowerCase();
        if (REDACTED_KEYS.has(lowerKey)) result[key] = '[redacted]';
        else if (BINARY_KEYS.has(lowerKey) && typeof entry === 'string') result[key] = `[base64, ${entry.length} chars]`;
        else result[key] = summarize(entry, depth + 1);
    }
    return result;
}

function hasContent(body) {
    return body && typeof body === 'object' && Object.keys(body).length > 0;
}

// Logs every request when it arrives and again when its response finishes, tagged with a short id to pair them.
// Mounted before body parsing so even malformed or oversized bodies get logged; the parsed request body
// (and any uploaded file) is therefore logged on the finish line, once routes have parsed it.
function requestLogger(req, res, next) {
    const id = crypto.randomBytes(3).toString('hex');
    const startedAt = process.hrtime.bigint();

    const length = req.headers['content-length'];
    logger.info(`[${id}] --> ${req.method} ${req.originalUrl}${length ? ` (${length} bytes)` : ''}`);

    // Capture whatever the handler sends as JSON so it can be logged on finish
    let responseBody;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        responseBody = body;
        return originalJson(body);
    };

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const user = req.userEmail ? ` user=${req.userEmail}` : '';
        const parts = [`[${id}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms${user}`];
        if (hasContent(req.body)) parts.push(`req=${JSON.stringify(summarize(req.body))}`);
        if (req.file) parts.push(`file=${req.file.mimetype} ${req.file.size} bytes`);
        if (responseBody !== undefined) parts.push(`res=${JSON.stringify(summarize(responseBody))}`);

        const line = parts.join(' ');
        if (res.statusCode >= 500) logger.error(line);
        else if (res.statusCode >= 400) logger.warn(line);
        else logger.info(line);
    });

    next();
}

module.exports = requestLogger;
