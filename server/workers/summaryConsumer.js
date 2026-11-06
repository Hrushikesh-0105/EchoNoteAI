const { startConsumer } = require('./runConsumer');
const logger = require('../utils/logger');
const { QUEUES } = require('../queue/topology');
const { loadSessionForSummary, saveSummary, failSummary } = require('../services/sessionService');
const { buildSummaryInput } = require('../services/summaryInput');
const { buildIntervalSummaries } = require('../services/summaryOutput');
const { buildSessionSummaryPrompt, SESSION_SUMMARY_SCHEMA } = require('../prompts/sessionSummaryPrompt');
const { generateStructuredSummary, MODEL_NAME } = require('../services/external/geminiClient');

const MAX_ATTEMPTS = Number(process.env.SUMMARY_MAX_ATTEMPTS) || 2;
const MAX_INPUT_CHARS = Number(process.env.SUMMARY_MAX_INPUT_CHARS) || 1_200_000;

// Generates a session's interval summaries and complete summary with Gemini. Only acts while the
// session is 'generating' (claimed by the summary endpoint), so duplicate or stale jobs are harmless.
async function handleSummaryJob({ sessionId }) {
    const session = await loadSessionForSummary(sessionId);
    if (!session) return 'skipped (session not found)';
    if (session.summaryStatus !== 'generating') return `skipped (summary is ${session.summaryStatus})`;

    const input = buildSummaryInput(session, { maxChars: MAX_INPUT_CHARS });
    if (input.entries.length === 0) {
        await failSummary(sessionId, 'no_text');
        return 'failed (no screenshot has text)';
    }

    const { screenshots, chars, originalChars, truncated } = input.stats;
    logger.info(`[summary] session=${sessionId} sending ${screenshots} screenshots, ${chars} chars to ${MODEL_NAME}`);
    if (truncated) {
        logger.warn(`[summary] session=${sessionId} OCR text (${originalChars} chars) was over the ${MAX_INPUT_CHARS}-char cap and was shortened`);
    }

    const prompt = buildSessionSummaryPrompt({
        title: session.title,
        screenshotCount: screenshots,
        lastIndex: screenshots - 1,
        text: input.text
    });
    const output = await generateStructuredSummary(prompt, SESSION_SUMMARY_SCHEMA);
    const { completeSummary, intervalSummaries, equations, warnings } =
        buildIntervalSummaries(output, input.entries, session.images);
    for (const warning of warnings) logger.warn(`[summary] session=${sessionId} ${warning}`);

    const saved = await saveSummary(sessionId, { completeSummary, intervalSummaries, equations });
    return saved
        ? `completed (${intervalSummaries.length} intervals, ${equations.length} equations, ${completeSummary.length}-char summary)`
        : 'skipped (no longer generating; not saved)';
}

// After the last attempt, mark the summary failed so the website can offer a retry. The website only
// gets a short reason code; the details are in the worker log and on the dead-letter message.
async function markSummaryFailed({ sessionId }) {
    await failSummary(sessionId, 'generation_failed');
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
