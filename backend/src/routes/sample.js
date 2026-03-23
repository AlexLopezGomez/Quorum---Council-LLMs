import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Evaluation } from '../models/Evaluation.js';
import { User } from '../models/User.js';
import { runEvaluation } from '../services/orchestrator.js';
import { check as driftCheck } from '../services/driftDetector.js';
import { createValidationMiddleware } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

const SAMPLE_RATE = Math.min(
  Math.max(parseFloat(process.env.SAMPLE_RATE ?? '0.05') || 0.05, 0),
  1
);

const sampleRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  response: z.string().min(1).max(5000),
  contexts: z.array(z.string().max(10000)).min(1).max(20),
  metadata: z.record(z.unknown()).optional(),
});

const validateSampleRequest = createValidationMiddleware(sampleRequestSchema);

/**
 * @openapi
 * /api/sample:
 *   post:
 *     summary: Submit a live production sample for async evaluation
 *     description: Fire-and-forget endpoint. Samples at SAMPLE_RATE (default 5%). Returns 202 immediately, never blocks production.
 *     tags: [Monitoring]
 *     responses:
 *       202:
 *         description: Sampled (jobId) or skipped
 */
router.post('/', validateSampleRequest, async (req, res) => {
  if (Math.random() > SAMPLE_RATE) {
    return res.status(202).json({ sampled: false });
  }

  const { query, response, contexts } = req.validatedBody;
  const jobId = nanoid(12);

  const testCases = [
    {
      id: nanoid(12),
      input: query,
      actualOutput: response,
      retrievalContext: contexts,
    },
  ];

  const evaluation = new Evaluation({
    jobId,
    userId: req.user._id,
    source: 'live',
    status: 'processing',
    testCases,
    results: [],
    events: [],
    config: { strategy: 'auto' },
  });

  try {
    await evaluation.save();
  } catch (err) {
    logger.error('sample.save.failed', { metadata: { message: err.message, jobId } });
    return res.status(500).json({ error: 'Failed to record sample' });
  }

  res.status(202).json({ sampled: true, jobId });

  let userKeys = { openai: null, anthropic: null, google: null };
  if (!req.serviceKey) {
    try {
      const userWithKeys = await User.findById(req.user._id).select('apiKeys');
      userKeys = userWithKeys.getDecryptedApiKeys();
    } catch (err) {
      logger.warn('sample.keys.decrypt_failed', { metadata: { message: err.message } });
    }
  }

  const emitEvent = () => {};
  const saveEvent = () => {};
  const updateDocument = async (update) => {
    await Evaluation.updateOne({ jobId }, { $set: update });
    if (update.status === 'complete') {
      driftCheck(evaluation.userId).catch((err) =>
        logger.error('drift.check.failed', { metadata: { message: err.message, userId: evaluation.userId } })
      );
    }
  };

  runEvaluation(testCases, jobId, emitEvent, saveEvent, updateDocument, { suppressWebhooks: true }, userKeys).catch(
    async (err) => {
      logger.error('sample.evaluation.failed', { metadata: { message: err.message, jobId } });
      await Evaluation.updateOne({ jobId }, { $set: { status: 'failed', completedAt: new Date() } });
    }
  );
});

export default router;
