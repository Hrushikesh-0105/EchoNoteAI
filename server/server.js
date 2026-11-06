const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // repo-root .env when run outside Docker

const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');
const queue = require('./queue/connection');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(requestLogger);
// Screenshots arrive as multipart uploads (parsed per route), so JSON bodies stay small
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => app.listen(PORT, () => logger.info(`listening on port: ${PORT}...`)))
    .catch((err) => logger.error('MongoDB connection failed:', err));

// The API only publishes jobs. It connects in the background (retrying until RabbitMQ is up) and
// doesn't block startup; publishing fails with a clear error while disconnected.
queue.connect().catch((err) => logger.error('RabbitMQ connection failed:', err));
