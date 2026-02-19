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
import observabilityRouter from './routes/observability.js';
import swaggerUi from 'swagger-ui-express';
import { sseManager } from './utils/sse.js';
import { Evaluation } from './models/Evaluation.js';
import { spec } from './utils/openapi.js';
import { requireAuth } from './middleware/requireAuth.js';
import { requestContext } from './middleware/requestContext.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ragscope';
sseManager.setLogger(logger);

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
app.use(requestContext);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'RAGScope API' }));
app.use('/api', limiter);

app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info(
      'http.request.complete',
      logger.withReq(req, {
        statusCode: res.statusCode,
        metadata: {
          contentLength: res.getHeader('content-length') || null,
        },
      })
    );
  });
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/stream', requireAuth, streamRouter);
app.use('/api/ingest', requireAuth, ingestRouter);

app.use('/api/evaluate', requireAuth, evaluateRouter);
app.use('/api/history', requireAuth, historyRouter);
app.use('/api/webhooks', requireAuth, webhooksRouter);
app.use('/api/results', requireAuth, resultsRouter);
app.use('/api/observability', requireAuth, observabilityRouter);

app.get('/health', (req, res) => {
  logger.info('system.health.check', logger.withReq(req, { statusCode: 200 }));
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use((err, req, res, next) => {
  logger.error(
    'system.error.unhandled',
    logger.withReq(req, {
      statusCode: 500,
      metadata: {
        message: err?.message,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
      },
    })
  );
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI);
      logger.info('system.mongodb.connected', {
        metadata: { uri: MONGODB_URI.replace(/\/\/.*@/, '//[REDACTED]@') },
      });
      return;
    } catch (err) {
      logger.error('system.mongodb.connect_failed', {
        metadata: {
          attempt: i + 1,
          retries,
          message: err.message,
        },
      });
      if (i < retries - 1) {
        logger.warn('system.mongodb.retry', { metadata: { retryInSeconds: delay / 1000 } });
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
      logger.audit('system.jobs.cleaned', {
        actor: 'system',
        metadata: {
          staleJobs: result.modifiedCount,
        },
      });
    }
  } catch (err) {
    logger.error('system.jobs.cleanup_failed', {
      metadata: { message: err.message },
    });
  }
}

async function start() {
  try {
    await connectWithRetry();
    await cleanupStaleJobs();

    const server = app.listen(PORT, () => {
      logger.info('system.startup', { metadata: { port: PORT } });
    });

    const shutdown = async (signal) => {
      logger.warn('system.shutdown.started', { metadata: { signal } });

      sseManager.closeAll();
      logger.info('system.sse.closed');

      server.close(async () => {
        logger.info('system.http.closed');

        await mongoose.connection.close();
        logger.info('system.mongodb.disconnected');

        process.exit(0);
      });

      setTimeout(() => {
        logger.error('system.shutdown.timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('system.startup.failed', { metadata: { message: err.message } });
    process.exit(1);
  }
}

start();
