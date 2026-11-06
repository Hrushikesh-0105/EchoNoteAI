const amqp = require('amqplib');
const logger = require('../utils/logger');
const { assertTopology } = require('./topology');

const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

// One connection and one confirm channel per process, re-created whenever either drops
let connection = null;
let channel = null;
let connecting = null;   // the in-flight connect loop, so concurrent callers share it
let shuttingDown = false;
const readyHandlers = []; // run on every new channel, e.g. to (re)start consumers

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Hides credentials in the URL for logging
function describeUrl(url) {
    return url.replace(/\/\/[^@]*@/, '//***@');
}

async function openChannel() {
    const url = process.env.RABBITMQ_URL;
    if (!url) throw new Error('RABBITMQ_URL is not set');

    const conn = await amqp.connect(url);
    conn.on('error', (err) => logger.warn('RabbitMQ connection error:', err.message));
    conn.on('close', () => {
        // Only clear state if this is still the live connection (a stale one may close late)
        if (connection === conn) {
            connection = null;
            channel = null;
        }
        if (!shuttingDown) {
            logger.warn('RabbitMQ connection closed; reconnecting');
            connect().catch(() => {}); // connect() retries until it succeeds and logs its own errors
        }
    });

    try {
        const ch = await conn.createConfirmChannel();
        ch.on('error', (err) => logger.warn('RabbitMQ channel error:', err.message));
        ch.on('close', () => {
            // A channel can close on its own (e.g. a protocol error); drop the connection too so the
            // 'close' handler above rebuilds both
            if (!shuttingDown && connection === conn) {
                conn.close().catch(() => {});
            }
        });

        await assertTopology(ch);
        for (const handler of readyHandlers) {
            await handler(ch);
        }

        connection = conn;
        channel = ch;
        logger.info(`RabbitMQ connected to ${describeUrl(url)}`);
    } catch (err) {
        // Don't leave a half-set-up connection open; the connect loop will try again
        await conn.close().catch(() => {});
        throw err;
    }
}

// Connects (or reconnects), retrying with exponential backoff until it succeeds or shutdown starts
function connect() {
    if (channel) return Promise.resolve(channel);
    if (connecting) return connecting;

    connecting = (async () => {
        let delay = INITIAL_RETRY_MS;
        while (!shuttingDown) {
            try {
                await openChannel();
                return channel;
            } catch (err) {
                logger.warn(`RabbitMQ connect failed (${err.message}); retrying in ${delay / 1000}s`);
                await sleep(delay);
                delay = Math.min(delay * 2, MAX_RETRY_MS);
            }
        }
        throw new Error('RabbitMQ connection is shutting down');
    })().finally(() => {
        connecting = null;
    });

    return connecting;
}

// The current channel; throws if not connected right now (callers decide how to handle that)
function getChannel() {
    if (!channel) throw new Error('RabbitMQ is not connected');
    return channel;
}

// Registers a handler to run with each new channel, including the current one if already connected
async function onChannelReady(handler) {
    readyHandlers.push(handler);
    if (channel) await handler(channel);
}

async function close() {
    shuttingDown = true;
    try {
        if (channel) await channel.close();
    } catch { /* already closed */ }
    try {
        if (connection) await connection.close();
    } catch { /* already closed */ }
    channel = null;
    connection = null;
}

module.exports = { connect, getChannel, onChannelReady, close };
