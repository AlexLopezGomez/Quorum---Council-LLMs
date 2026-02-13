import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createValidationMiddleware } from '../utils/validation.js';
import { Evaluation } from '../models/Evaluation.js';
import { runEvaluation } from '../services/orchestrator.js';
import { sseManager } from '../utils/sse.js';

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

    const testCases = captures.map(({ input, actualOutput, expectedOutput, retrievalContext }) => ({
      input,
      actualOutput,
      expectedOutput,
      retrievalContext,
    }));

    const evaluation = new Evaluation({
      jobId,
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
        console.error('Failed to save event:', err);
      }
    };

    const updateDocument = async (updates) => {
      try {
        await Evaluation.updateOne({ jobId }, { $set: updates });
      } catch (err) {
        console.error('Failed to update evaluation:', err);
      }
    };

    runEvaluation(testCases, jobId, emitEvent, saveEvent, updateDocument, options || {}).catch(async (error) => {
      console.error('Evaluation failed:', error);
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
    console.error('Failed to ingest captures:', error);
    res.status(500).json({ error: 'Failed to ingest captures', message: error.message });
  }
});

export default router;
