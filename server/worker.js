// Background worker: consumes RabbitMQ jobs (OCR per screenshot, summary per session).
// Runs as its own container from the same image as the API: `node worker.js`.
require('dotenv').config(); // first: some modules read settings when they're loaded
const mongoose = require('mongoose');

const logger = require('./utils/logger');
const queue = require('./queue/connection');
const { startOcrConsumer } = require('./workers/ocrConsumer');
const { startSummaryConsumer } = require('./workers/summaryConsumer');
const { waitForInFlight } = require('./workers/runConsumer');

const SHUTDOWN_TIMEOUT_MS = 30_000;

let consumers = []; // { channel, tag } for the current channel
let shuttingDown = false;

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Worker connected to MongoDB');

    // Runs on every (re)connect: consumers are tied to a channel, so they must be recreated with it
    await queue.onChannelReady(async (channel) => {
        consumers = [
            { channel, tag: await startOcrConsumer(channel) },
            { channel, tag: await startSummaryConsumer(channel) }
        ];
    });
    await queue.connect();
    logger.info('Worker ready');
}

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Worker received ${signal}; stopping consumers`);

    // Stop taking new messages, finish the ones in progress, then disconnect
    for (const { channel, tag } of consumers) {
        await channel.cancel(tag).catch(() => {});
    }
    const remaining = await waitForInFlight(SHUTDOWN_TIMEOUT_MS);
    if (remaining > 0) logger.warn(`${remaining} job(s) still running; RabbitMQ will redeliver them`);

    await queue.close();
    await mongoose.disconnect();
    logger.info('Worker stopped');
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((err) => {
    logger.error('Worker failed to start:', err);
    process.exit(1);
});
