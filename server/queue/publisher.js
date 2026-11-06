const { getChannel } = require('./connection');
const { EXCHANGE, RETRY_EXCHANGE, DEAD_LETTER_EXCHANGE, QUEUES } = require('./topology');

// Publishes a persistent JSON message and resolves only once the broker confirms it, so callers
// know a job is safely queued (or get an error they can handle)
function publish(exchange, routingKey, body, headers = {}) {
    const channel = getChannel();
    const content = Buffer.from(JSON.stringify(body));

    return new Promise((resolve, reject) => {
        channel.publish(
            exchange,
            routingKey,
            content,
            { persistent: true, contentType: 'application/json', headers },
            (err) => (err ? reject(err) : resolve())
        );
    });
}

// Queues OCR for one screenshot
function publishOcrJob(sessionId, imageId) {
    return publish(EXCHANGE, QUEUES.OCR, { sessionId: String(sessionId), imageId: String(imageId) }, { 'x-attempt': 1 });
}

// Queues summary generation for a session
function publishSummaryJob(sessionId) {
    return publish(EXCHANGE, QUEUES.SUMMARY, { sessionId: String(sessionId) }, { 'x-attempt': 1 });
}

// Sends a failed job to its retry queue; it returns to `queue` after that queue's retry delay
function publishRetry(queue, body, attempt) {
    return publish(RETRY_EXCHANGE, queue, body, { 'x-attempt': attempt });
}

// Parks a job that used up its attempts in `queue`'s dead-letter queue, with the last error for context
function publishDeadLetter(queue, body, attempt, error) {
    return publish(DEAD_LETTER_EXCHANGE, queue, body, {
        'x-attempt': attempt,
        'x-error': String(error).slice(0, 500),
        'x-failed-at': new Date().toISOString()
    });
}

module.exports = { publishOcrJob, publishSummaryJob, publishRetry, publishDeadLetter };
