import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createValidationMiddleware } from '../utils/validation.js';
import { Evaluation } from '../models/Evaluation.js';
import { runEvaluation } from '../services/orchestrator.js';
import { sseManager } from '../utils/sse.js';
import { logger } from '../utils/logger.js';

const router = Router();

const captureSchema = z.object({
  input: z.string().min(1).max(1000),
  actualOutput: z.string().min(1).max(5000),
  expectedOutput: z.string().max(5000).optional(),
  retrievalContext: z.array(z.string().max(10000)).min(1).max(20),
  metadata: z.record(z.unknown()).optional(),
  capturedAt: z.string().optional(),
});

const ingestRequestSchema = z.object({
  captures: z.array(captureSchema).min(1).max(50),
  options: z.object({
    strategy: z.enum(['auto', 'single', 'hybrid', 'council']).default('auto'),
  }).optional().default({ strategy: 'auto' }),
});

/**
 * @openapi
 * /api/ingest:
 *   post:
 *     summary: Ingest SDK captures for evaluation
 *     description: Accepts a batch of 1-50 RAG interaction captures from the SDK and triggers evaluation.
 *     tags: [SDK]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [captures]
 *             properties:
 *               captures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [input, actualOutput, retrievalContext]
 *                   properties:
 *                     input: { type: string }
 *                     actualOutput: { type: string }
 *                     expectedOutput: { type: string }
 *                     retrievalContext: { type: array, items: { type: string } }
 *                     metadata: { type: object }
 *                     capturedAt: { type: string }
 *                 minItems: 1
 *                 maxItems: 50
 *               options:
 *                 type: object
 *                 properties:
 *                   strategy: { type: string, enum: [auto, single, hybrid, council], default: auto }
 *     responses:
 *       202:
 *         description: Captures ingested and evaluation started
 *       400:
 *         description: Validation error
 */
router.post('/', createValidationMiddleware(ingestRequestSchema), async (req, res) => {
  try {
    const { captures, options } = req.validatedBody;
    const jobId = nanoid(12);
    logger.audit(
      'sdk.ingest.requested',
      logger.withReq(req, {
        actor: 'sdk',
        userId: req.user._id,
        jobId,
        metadata: {
          strategy: options?.strategy || 'auto',
          captureCount: captures.length,
        },
      })
    );

    const testCases = captures.map(({ input, actualOutput, expectedOutput, retrievalContext, metadata, capturedAt }) => ({
      input,
      actualOutput,
      expectedOutput,
      retrievalContext,
      metadata,
      capturedAt,
    }));

    const evaluation = new Evaluation({
      jobId,
      userId: req.user._id,
      status: 'processing',
      testCases,
      results: [],
      events: [],
      config: {
        strategy: options?.strategy || 'auto',
        source: 'sdk',
        captureCount: captures.length,
      },
    });

    await evaluation.save();
    logger.audit(
      'sdk.ingest.accepted',
      logger.withReq(req, {
        actor: 'sdk',
        userId: req.user._id,
        statusCode: 202,
        jobId,
      })
    );

    const emitEvent = (event, data) => {
      sseManager.emit(jobId, event, data);
    };

    const saveEvent = async (type, data) => {
      try {
        await Evaluation.updateOne(
          { jobId },
          { $push: { events: { type, data, timestamp: new Date() } } }
        );
      } catch (err) {
        logger.error(
          'sdk.ingest.event_save_failed',
          logger.withReq(req, {
            jobId,
            metadata: { eventType: type, message: err.message },
          })
        );
      }
    };

    const updateDocument = async (updates) => {
      try {
        await Evaluation.updateOne({ jobId }, { $set: updates });
      } catch (err) {
        logger.error(
          'sdk.ingest.update_failed',
          logger.withReq(req, {
            jobId,
            metadata: { message: err.message },
          })
        );
      }
    };

    runEvaluation(testCases, jobId, emitEvent, saveEvent, updateDocument, options || {}).catch(async (error) => {
      logger.error(
        'sdk.ingest.evaluation_failed',
        logger.withReq(req, {
          jobId,
          metadata: { message: error.message },
        })
      );
      await Evaluation.updateOne(
        { jobId },
        { $set: { status: 'failed', completedAt: new Date() } }
      );
      emitEvent('evaluation_error', {
        jobId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    });

    res.status(202).json({
      jobId,
      captureCount: captures.length,
      streamUrl: `/api/stream/${jobId}`,
    });
  } catch (error) {
    logger.error(
      'sdk.ingest.failed',
      logger.withReq(req, {
        statusCode: 500,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({ error: 'Failed to ingest captures' });
  }
});

export default router;
