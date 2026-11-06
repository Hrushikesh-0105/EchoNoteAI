const { startConsumer } = require('./runConsumer');
const { QUEUES } = require('../queue/topology');

const MAX_ATTEMPTS = Number(process.env.SUMMARY_MAX_ATTEMPTS) || 2;

// Placeholder until the summary stage: acknowledges the job and leaves the session in 'generating'
async function handleSummaryJob() {
    return 'skipped (summary generation is not implemented yet)';
}

async function markSummaryFailed() {
    // Implemented with summary generation
}

function startSummaryConsumer(channel) {
    return startConsumer(channel, {
        queue: QUEUES.SUMMARY,
        label: 'summary',
        prefetch: 1, // Gemini calls are slow and expensive; one at a time per worker
        maxAttempts: MAX_ATTEMPTS,
        handle: handleSummaryJob,
        onFinalFailure: markSummaryFailed
    });
}

module.exports = { startSummaryConsumer };
