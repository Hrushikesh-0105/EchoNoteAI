const logger = require('../utils/logger');
const { publishRetry, publishDeadLetter } = require('../queue/publisher');

const REQUEUE_DELAY_MS = 2_000; // pause before handing a message back after an unexpected error
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let inFlight = 0; // messages being handled across all consumers, for graceful shutdown

// Ack/nack can throw if the channel closed meanwhile; the broker redelivers those messages anyway
function safely(action, description) {
    try {
        action();
    } catch (err) {
        logger.warn(`Could not ${description}: ${err.message}`);
    }
}

function describeJob(body) {
    return Object.entries(body || {}).map(([key, value]) => `${key}=${value}`).join(' ');
}

// Starts consuming `queue` on `channel` with manual acks and retry handling:
// - handle(body, { attempt }) resolves to a short outcome string for the log → ack
// - if it throws and attempts remain → republish to the retry queue with attempt + 1, then ack
// - if it throws on the last attempt → onFinalFailure(body, err), park it in the dead-letter queue, then ack
// - if retry/dead-letter handling itself fails → nack with requeue so the job isn't lost
async function startConsumer(channel, { queue, label, prefetch, maxAttempts, handle, onFinalFailure }) {
    await channel.prefetch(prefetch); // applies to consumers created after this call on this channel

    const { consumerTag } = await channel.consume(queue, async (msg) => {
        if (!msg) return; // the broker cancelled this consumer, e.g. the queue was deleted

        inFlight++;
        const startedAt = Date.now();
        const attempt = Number(msg.properties.headers?.['x-attempt']) || 1;
        const elapsed = () => `${Date.now() - startedAt}ms`;

        let body;
        try {
            body = JSON.parse(msg.content.toString());
        } catch {
            logger.error(`[job ${label}] unreadable message, sending to dead-letter queue`);
            try {
                await publishDeadLetter(queue, { raw: msg.content.toString().slice(0, 500) }, attempt, 'unparseable JSON');
                safely(() => channel.ack(msg), 'ack message');
            } catch {
                safely(() => channel.nack(msg, false, false), 'drop message'); // can't be fixed by retrying
            }
            inFlight--;
            return;
        }

        const job = `[job ${label}] ${describeJob(body)} attempt=${attempt}/${maxAttempts}`;
        logger.info(`${job} started`);

        try {
            const outcome = await handle(body, { attempt });
            safely(() => channel.ack(msg), 'ack message');
            logger.info(`${job} done in ${elapsed()}: ${outcome}`);
        } catch (err) {
            try {
                if (attempt < maxAttempts) {
                    await publishRetry(queue, body, attempt + 1);
                    safely(() => channel.ack(msg), 'ack message');
                    logger.warn(`${job} failed in ${elapsed()}, retry scheduled: ${err.message}`);
                } else {
                    await onFinalFailure(body, err);
                    await publishDeadLetter(queue, body, attempt, err.message);
                    safely(() => channel.ack(msg), 'ack message');
                    logger.error(`${job} failed in ${elapsed()}, no attempts left (moved to dead-letter queue): ${err.message}`);
                }
            } catch (handlingErr) {
                logger.error(`${job} failed and could not be retried (${handlingErr.message}); requeueing`);
                await sleep(REQUEUE_DELAY_MS);
                safely(() => channel.nack(msg, false, true), 'requeue message');
            }
        } finally {
            inFlight--;
        }
    }, { noAck: false });

    logger.info(`Consuming ${queue} (prefetch ${prefetch}, max ${maxAttempts} attempts)`);
    return consumerTag;
}

// Resolves once no messages are being handled, or after timeoutMs
async function waitForInFlight(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (inFlight > 0 && Date.now() < deadline) {
        await sleep(200);
    }
    return inFlight;
}

module.exports = { startConsumer, waitForInFlight };
