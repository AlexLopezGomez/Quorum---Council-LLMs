import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import evaluateRouter from './routes/evaluate.js';
import streamRouter from './routes/stream.js';
import resultsRouter from './routes/results.js';
import historyRouter from './routes/history.js';
import webhooksRouter from './routes/webhooks.js';
import ingestRouter from './routes/ingest.js';
import authRouter from './routes/auth.js';
import keysRouter from './routes/keys.js';
import serviceKeysRouter from './routes/serviceKeys.js';
import observabilityRouter from './routes/observability.js';
import waitlistRouter from './routes/waitlist.js';
import benchmarkRouter from './routes/benchmark.js';
import sampleRouter from './routes/sample.js';
import monitoringRouter from './routes/monitoring.js';
import * as batchPoller from './services/batchPoller.js';
import swaggerUi from 'swagger-ui-express';
import { sseManager } from './utils/sse.js';
import { Evaluation } from './models/Evaluation.js';
import { BenchmarkRun } from './models/BenchmarkRun.js';
import { spec } from './utils/openapi.js';
import { requireAuth, requireAnyAuth } from './middleware/requireAuth.js';
import { requireServiceScope } from './middleware/requireServiceAuth.js';
import { DriftAlert } from './models/DriftAlert.js';
import { requestContext } from './middleware/requestContext.js';
import { logger } from './utils/logger.js';
import { validateProductionSecrets } from './utils/validateSecrets.js';
import { serveFrontend } from './utils/staticServe.js';

process.on('unhandledRejection', (reason) => logger.error('process.unhandledRejection', { metadata: { reason: String(reason) } }));
process.on('uncaughtException', (err) => {
  logger.error('process.uncaughtException', { metadata: { message: err?.message } });
  process.exit(1);
});

const app = express();
// TRUST_PROXY should match the number of upstream proxy hops in your infrastructure.
// Set to 0 or omit when running without a reverse proxy to prevent IP spoofing.
const TRUST_PROXY = process.env.TRUST_PROXY !== undefined
  ? (process.env.TRUST_PROXY === 'false' ? false : parseInt(process.env.TRUST_PROXY) || false)
  : false;
app.set('trust proxy', TRUST_PROXY);
app.set('query parser', 'simple');
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quorum';
let isShuttingDown = false;
sseManager.setLogger(logger);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
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

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === 'production'
          ? ["'self'", "https://apis.google.com"]
          : ["'self'", "'unsafe-inline'", "https://apis.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://*.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://*.firebaseio.com",
          "https://*.firebaseapp.com",
        ],
        frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"],
        workerSrc: ["'self'", "blob:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(mongoSanitize());
app.use(cookieParser());
app.use(requestContext);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'Quorum API' }));
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
app.use('/api/waitlist', waitlistRouter);
app.use('/api/stream', requireAnyAuth, requireServiceScope(['ingest', 'evaluate']), streamRouter);
app.use('/api/ingest', requireAnyAuth, requireServiceScope('ingest'), ingestRouter);
app.use('/api/results', requireAnyAuth, requireServiceScope(['ingest', 'evaluate']), resultsRouter);

app.use('/api/evaluate', requireAuth, evaluateRouter);
app.use('/api/history', requireAuth, historyRouter);
app.use('/api/webhooks', requireAuth, webhooksRouter);
app.use('/api/keys', requireAuth, keysRouter);
app.use('/api/service-keys', requireAuth, serviceKeysRouter);
app.use('/api/observability', requireAuth, observabilityRouter);
app.use('/api', requireAuth, benchmarkRouter);
app.use('/api/sample', requireAnyAuth, requireServiceScope(['ingest', 'evaluate']), sampleRouter);
app.use('/api/monitoring', requireAnyAuth, requireServiceScope(['ingest', 'evaluate']), monitoringRouter);

app.get('/health', (req, res) => {
  logger.info('system.health.check', logger.withReq(req, { statusCode: 200 }));
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/ready', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  if (!mongoReady || isShuttingDown) {
    return res.status(503).json({ status: 'not_ready', mongodb: mongoReady ? 'connected' : 'disconnected', shuttingDown: isShuttingDown });
  }
  res.json({ status: 'ready' });
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

async function migrateLegacyIndexes() {
  try {
    const collection = mongoose.connection.collection('evaluations');
    const indexes = await collection.indexes();
    const legacyIndex = indexes.find((idx) => idx.name === 'uniq_processing_evaluation_per_user');
    // Drop only if it lacks the source filter (old version)
    if (legacyIndex && !legacyIndex.partialFilterExpression?.source) {
      await collection.dropIndex('uniq_processing_evaluation_per_user');
      logger.info('system.migration.index_dropped', {
        metadata: { index: 'uniq_processing_evaluation_per_user', reason: 'recreating with source:batch filter' },
      });
    }
  } catch (err) {
    logger.warn('system.migration.index_drop_failed', { metadata: { message: err.message } });
  }
}

async function cleanupStaleJobs() {
  try {
    // Scope to non-live only: live samples that were processing on restart are dead but harmless to leave failed
    const evalResult = await Evaluation.updateMany(
      { status: 'processing', source: { $ne: 'live' } },
      {
        $set: { status: 'failed', completedAt: new Date() },
        $push: { events: { type: 'server_restart', data: { reason: 'Server restarted while evaluation was in progress' }, timestamp: new Date() } },
      }
    );

    const benchmarkResult = await BenchmarkRun.updateMany(
      { status: { $in: ['processing', 'submitting', 'aggregating'] } },
      { $set: { status: 'failed', completedAt: new Date() } }
    );

    const total = evalResult.modifiedCount + benchmarkResult.modifiedCount;
    if (total > 0) {
      logger.audit('system.jobs.cleaned', {
        actor: 'system',
        metadata: { staleEvaluations: evalResult.modifiedCount, staleBenchmarks: benchmarkResult.modifiedCount },
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
    validateProductionSecrets();
    await connectWithRetry();
    await migrateLegacyIndexes();
    await cleanupStaleJobs();
    batchPoller.start();

    serveFrontend(app);

    const server = app.listen(PORT, () => {
      logger.info('system.startup', { metadata: { port: PORT } });
    });

    const shutdown = async (signal) => {
      isShuttingDown = true;
      logger.warn('system.shutdown.started', { metadata: { signal } });

      batchPoller.stop();
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
