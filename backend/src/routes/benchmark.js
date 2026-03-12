import { Router } from 'express';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { BenchmarkRun } from '../models/BenchmarkRun.js';
import { startBenchmarkRun, loadDataset } from '../services/benchmarkRunner.js';
import { logger } from '../utils/logger.js';

async function preflightCheck() {
  const errors = [];

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;

  if (!openaiKey) {
    errors.push({ provider: 'openai', error: 'No API key configured. Set OPENAI_API_KEY in .env.' });
  } else {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      await client.chat.completions.create({
        model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1,
      });
    } catch (err) {
      errors.push({ provider: 'openai', error: err.message?.substring(0, 200) });
    }
  }

  if (!anthropicKey) {
    errors.push({ provider: 'anthropic', error: 'No API key configured. Set ANTHROPIC_API_KEY in .env.' });
  } else {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }],
      });
    } catch (err) {
      errors.push({ provider: 'anthropic', error: err.message?.substring(0, 200) });
    }
  }

  if (!googleKey) {
    errors.push({ provider: 'gemini', error: 'No API key configured. Set GOOGLE_API_KEY in .env.' });
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: googleKey });
      await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'ping' });
    } catch (err) {
      const msg = err.message?.substring(0, 200) || String(err);
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        errors.push({ provider: 'gemini', error: 'Quota exceeded. A paid-tier key is required for the benchmark.' });
      } else {
        errors.push({ provider: 'gemini', error: msg });
      }
    }
  }

  return errors;
}

const router = Router();

/**
 * POST /api/benchmark/run
 */
router.post('/benchmark/run', async (req, res) => {
  try {
    const mini = req.query.mini === 'true' || req.body?.mini === true;
    const useBatch = req.body?.batch === true;

    const preflightErrors = await preflightCheck();
    if (preflightErrors.length > 0) {
      logger.warn('benchmark.preflight.failed', logger.withReq(req, { metadata: { errors: preflightErrors } }));
      return res.status(400).json({
        error: 'Benchmark preflight failed — one or more providers are unreachable',
        providers: preflightErrors,
      });
    }

    const runId = await startBenchmarkRun(req.user._id, {}, mini, useBatch);

    logger.audit('benchmark.run.started', {
      actor: 'user',
      userId: req.user._id,
      metadata: { runId, mini, useBatch },
    });

    res.status(202).json({
      runId,
      mini,
      useBatch,
      message: useBatch
        ? 'Batch benchmark submitted. Results will be ready in 1–4 hours.'
        : mini ? 'Mini benchmark started (12 cases)' : 'Benchmark started',
      streamUrl: `/api/stream/benchmark/${runId}`,
      resultsUrl: `/api/benchmark/runs/${runId}`,
    });
  } catch (err) {
    logger.error('benchmark.run.start_failed', logger.withReq(req, {
      statusCode: 500,
      userId: req.user?._id,
      metadata: { message: err.message },
    }));
    res.status(500).json({ error: 'Failed to start benchmark run' });
  }
});

/**
 * GET /api/benchmark/runs
 */
router.get('/benchmark/runs', async (req, res) => {
  try {
    const parsedLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 10;
    const { cursor } = req.query;

    const filter = { userId: req.user._id };
    if (cursor) {
      if (typeof cursor !== 'string' || !mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
      filter._id = { $lt: cursor };
    }

    const runs = await BenchmarkRun.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select('runId status datasetVersion totalCases processedCases statistics batchIds batchStatus createdAt completedAt')
      .lean();

    const hasMore = runs.length > limit;
    const results = hasMore ? runs.slice(0, limit) : runs;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    res.json({
      runs: results.map(r => ({
        id: r._id,
        runId: r.runId,
        status: r.status,
        datasetVersion: r.datasetVersion,
        totalCases: r.totalCases,
        processedCases: r.processedCases,
        statistics: r.statistics,
        batchIds: r.batchIds,
        batchStatus: r.batchStatus,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
      nextCursor,
    });
  } catch (err) {
    logger.error('benchmark.runs.fetch_failed', logger.withReq(req, {
      statusCode: 500,
      userId: req.user?._id,
      metadata: { message: err.message },
    }));
    res.status(500).json({ error: 'Failed to fetch benchmark runs' });
  }
});

/**
 * GET /api/benchmark/runs/:runId
 */
router.get('/benchmark/runs/:runId', async (req, res) => {
  try {
    const run = await BenchmarkRun.findOne({
      runId: req.params.runId,
      userId: req.user._id,
    }).lean();

    if (!run) return res.status(404).json({ error: 'Benchmark run not found' });

    res.json(run);
  } catch (err) {
    logger.error('benchmark.run.fetch_failed', logger.withReq(req, {
      statusCode: 500,
      userId: req.user?._id,
      metadata: { message: err.message, runId: req.params.runId },
    }));
    res.status(500).json({ error: 'Failed to fetch benchmark run' });
  }
});

/**
 * GET /api/benchmark/runs/:runId/batch-status
 * Poll-friendly endpoint — frontend checks every 30s during batch processing.
 */
router.get('/benchmark/runs/:runId/batch-status', async (req, res) => {
  try {
    const run = await BenchmarkRun.findOne(
      { runId: req.params.runId, userId: req.user._id },
      'runId status totalCases processedCases batchIds batchStatus createdAt completedAt'
    ).lean();

    if (!run) return res.status(404).json({ error: 'Benchmark run not found' });

    res.json({
      runId: run.runId,
      status: run.status,
      totalCases: run.totalCases,
      processedCases: run.processedCases,
      batchIds: run.batchIds,
      batchStatus: run.batchStatus,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    });
  } catch (err) {
    logger.error('benchmark.batch_status.failed', logger.withReq(req, {
      statusCode: 500,
      userId: req.user?._id,
      metadata: { message: err.message, runId: req.params.runId },
    }));
    res.status(500).json({ error: 'Failed to fetch batch status' });
  }
});

/**
 * GET /api/benchmark/dataset
 */
router.get('/benchmark/dataset', (req, res) => {
  try {
    const dataset = loadDataset();
    const domainCounts = {};
    const failureModes = {};
    let passCases = 0;
    let failCases = 0;

    for (const tc of dataset) {
      domainCounts[tc.domain] = (domainCounts[tc.domain] || 0) + 1;
      failureModes[tc.failureMode] = (failureModes[tc.failureMode] || 0) + 1;
      if (tc.humanVerdict === 'PASS') passCases++;
      else failCases++;
    }

    res.json({
      version: '1.0',
      totalCases: dataset.length,
      passCases,
      failCases,
      failRate: Math.round((failCases / dataset.length) * 100),
      domainCounts,
      failureModes,
    });
  } catch {
    res.status(500).json({ error: 'Failed to load dataset metadata' });
  }
});

export default router;
