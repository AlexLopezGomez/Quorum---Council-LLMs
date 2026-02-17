import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import evaluateRouter from './routes/evaluate.js';
import streamRouter from './routes/stream.js';
import resultsRouter from './routes/results.js';
import historyRouter from './routes/history.js';
import webhooksRouter from './routes/webhooks.js';
import ingestRouter from './routes/ingest.js';
import authRouter from './routes/auth.js';
import swaggerUi from 'swagger-ui-express';
import { sseManager } from './utils/sse.js';
import { Evaluation } from './models/Evaluation.js';
import { spec } from './utils/openapi.js';
import { requireAuth } from './middleware/requireAuth.js';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ragscope';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'RAGScope API' }));
app.use('/api', limiter);

app.use('/api/auth', authRouter);
app.use('/api/stream', streamRouter);
app.use('/api/ingest', ingestRouter);

app.use('/api/evaluate', requireAuth, evaluateRouter);
app.use('/api', requireAuth, historyRouter);
app.use('/api/webhooks', requireAuth, webhooksRouter);
app.use('/api/results', requireAuth, resultsRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Failed to connect to MongoDB after multiple attempts');
}

async function cleanupStaleJobs() {
  try {
    const result = await Evaluation.updateMany(
      { status: 'processing' },
      {
        $set: { status: 'failed', completedAt: new Date() },
        $push: { events: { type: 'server_restart', data: { reason: 'Server restarted while evaluation was in progress' }, timestamp: new Date() } },
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`Cleaned up ${result.modifiedCount} stale processing jobs`);
    }
  } catch (err) {
    console.error('Failed to cleanup stale jobs:', err);
  }
}

async function start() {
  try {
    await connectWithRetry();
    await cleanupStaleJobs();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      sseManager.closeAll();
      console.log('SSE connections closed');

      server.close(async () => {
        console.log('HTTP server closed');

        await mongoose.connection.close();
        console.log('MongoDB connection closed');

        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
