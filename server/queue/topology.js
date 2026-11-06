// RabbitMQ names and the setup that creates them. Everything is durable and asserted on every
// (re)connect, which is idempotent as long as the arguments below don't change for an existing queue.

const EXCHANGE = 'echonote';             // main exchange: jobs are published here
const RETRY_EXCHANGE = 'echonote.retry'; // failed jobs wait in a TTL queue, then dead-letter back to EXCHANGE
const DEAD_LETTER_EXCHANGE = 'echonote.dlx'; // jobs that used up their attempts, kept for inspection

const QUEUES = {
    OCR: 'ocr.process',
    SUMMARY: 'summary.generate'
};

// How long a failed job waits before it's retried
const RETRY_DELAY_MS = {
    [QUEUES.OCR]: 10_000,
    [QUEUES.SUMMARY]: 30_000
};

const retryQueueName = (queue) => `${queue}.retry`;
const deadLetterQueueName = (queue) => `${queue}.dlq`;

async function assertTopology(channel) {
    await channel.assertExchange(EXCHANGE, 'direct', { durable: true });
    await channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });

    for (const queue of Object.values(QUEUES)) {
        // Main queue, routed by its own name
        await channel.assertQueue(queue, { durable: true });
        await channel.bindQueue(queue, EXCHANGE, queue);

        // Retry queue: messages expire after the delay and are dead-lettered back to the main queue
        const retryQueue = retryQueueName(queue);
        await channel.assertQueue(retryQueue, {
            durable: true,
            arguments: {
                'x-message-ttl': RETRY_DELAY_MS[queue],
                'x-dead-letter-exchange': EXCHANGE,
                'x-dead-letter-routing-key': queue
            }
        });
        await channel.bindQueue(retryQueue, RETRY_EXCHANGE, queue);

        // Dead-letter queue: final failures, left for a human to look at
        const deadLetterQueue = deadLetterQueueName(queue);
        await channel.assertQueue(deadLetterQueue, { durable: true });
        await channel.bindQueue(deadLetterQueue, DEAD_LETTER_EXCHANGE, queue);
    }
}

module.exports = {
    EXCHANGE,
    RETRY_EXCHANGE,
    DEAD_LETTER_EXCHANGE,
    QUEUES,
    assertTopology
};
