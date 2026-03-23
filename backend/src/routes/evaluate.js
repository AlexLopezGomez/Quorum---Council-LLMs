import { Router } from 'express';
import { nanoid } from 'nanoid';
import { validateEvaluateRequest } from '../utils/validation.js';
import { Evaluation } from '../models/Evaluation.js';
import { User } from '../models/User.js';
import { runEvaluation } from '../services/orchestrator.js';
import { sseManager } from '../utils/sse.js';
import { logger } from '../utils/logger.js';

const router = Router();
const ACTIVE_CONFLICT_CODE = 'EVALUATION_ALREADY_RUNNING';

function isDuplicateKeyError(error) {
  return Number(error?.code) === 11000;
}

async function findActiveEvaluationForUser(userId) {
  return Evaluation.findOne({ userId, status: 'processing', source: 'batch' })
    .sort({ createdAt: -1 })
    .select('jobId status createdAt name');
}

router.get('/active', async (req, res) => {
  try {
    const activeEvaluation = await findActiveEvaluationForUser(req.user._id);
    if (!activeEvaluation) {
      logger.info(
        'evaluation.active.none',
        logger.withReq(req, {
          statusCode: 204,
          userId: req.user._id,
        })
      );
      return res.status(204).send();
    }

    logger.info(
      'evaluation.active.fetched',
      logger.withReq(req, {
        statusCode: 200,
        userId: req.user._id,
        jobId: activeEvaluation.jobId,
      })
    );
    return res.json({
      jobId: activeEvaluation.jobId,
      status: activeEvaluation.status,
      name: activeEvaluation.name || '',
      createdAt: activeEvaluation.createdAt,
      streamUrl: `/api/stream/${activeEvaluation.jobId}`,
      resultsUrl: `/api/results/${activeEvaluation.jobId}`,
    });
  } catch (error) {
    logger.error(
      'evaluation.active.fetch_failed',
      logger.withReq(req, {
        statusCode: 500,
        userId: req.user?._id,
        metadata: { message: error.message },
      })
    );
    return res.status(500).json({ error: 'Failed to fetch active evaluation' });
  }
});

/**
 * @openapi
 * /api/evaluate:
 *   post:
 *     summary: Start a new evaluation
 *     description: Validates test cases, creates an Evaluation document, and fires async evaluation pipeline. Returns 202 immediately.
 *     tags: [Evaluation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testCases]
 *             properties:
 *               testCases:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TestCase'
 *                 minItems: 1
 *                 maxItems: 10
 *               options:
 *                 type: object
 *                 properties:
 *                   strategy:
 *                     type: string
 *                     enum: [auto, single, hybrid, council]
 *                     default: auto
 *                   riskOverride:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *     responses:
 *       202:
 *         description: Evaluation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId: { type: string }
 *                 strategy: { type: string }
 *                 streamUrl: { type: string }
 *                 resultsUrl: { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', validateEvaluateRequest, async (req, res) => {
  try {
    const { testCases, options, name } = req.validatedBody;
    const isDemo = Boolean(options?.demo);

    if (!isDemo) {
      const existingActiveEvaluation = await findActiveEvaluationForUser(req.user._id);
      if (existingActiveEvaluation) {
        logger.warn(
          'evaluation.create.conflict',
          logger.withReq(req, {
            statusCode: 409,
            userId: req.user._id,
            jobId: existingActiveEvaluation.jobId,
          })
        );
        return res.status(409).json({
          error: 'An evaluation is already running. Resume the active evaluation before starting a new one.',
          code: ACTIVE_CONFLICT_CODE,
          status: 'processing',
          activeJobId: existingActiveEvaluation.jobId,
        });
      }
    }

    const jobId = nanoid(12);
    logger.audit(
      'evaluation.create.requested',
      logger.withReq(req, {
        actor: 'user',
        userId: req.user._id,
        metadata: {
          jobId,
          strategy: options?.strategy || 'auto',
          testCaseCount: testCases.length,
        },
      })
    );

    const evaluation = new Evaluation({
      jobId,
      name: name || '',
      userId: req.user._id,
      source: 'batch',
      status: 'processing',
      testCases,
      results: [],
      events: [],
      config: { strategy: options?.strategy || 'auto', demo: isDemo },
    });
    try {
      await evaluation.save();
    } catch (saveError) {
      if (isDuplicateKeyError(saveError)) {
        const activeEvaluation = await findActiveEvaluationForUser(req.user._id);
        logger.warn(
          'evaluation.create.conflict',
          logger.withReq(req, {
            statusCode: 409,
            userId: req.user._id,
            jobId: activeEvaluation?.jobId || null,
          })
        );
        return res.status(409).json({
          error: 'An evaluation is already running. Resume the active evaluation before starting a new one.',
          code: ACTIVE_CONFLICT_CODE,
          status: 'processing',
          activeJobId: activeEvaluation?.jobId || null,
        });
      }
      throw saveError;
    }
    logger.audit(
      'evaluation.created',
      logger.withReq(req, {
        actor: 'user',
        userId: req.user._id,
        statusCode: 202,
        jobId,
        metadata: { strategy: options?.strategy || 'auto' },
      })
    );

    const emitEvent = (event, data) => {
      sseManager.emit(jobId, event, data);
      logger.info(
        'sse.event.emitted',
        logger.withReq(req, {
          jobId,
          metadata: { event, type: 'live_emit' },
        })
      );
    };

    const saveEvent = async (type, data) => {
      try {
        await Evaluation.updateOne(
          { jobId },
          { $push: { events: { type, data, timestamp: new Date() } } }
        );
      } catch (err) {
        logger.error(
          'evaluation.event.save_failed',
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
          'evaluation.update_failed',
          logger.withReq(req, {
            jobId,
            metadata: { message: err.message },
          })
        );
      }
    };

    let userKeys = { openai: null, anthropic: null, google: null };
    try {
      const userWithKeys = await User.findById(req.user._id).select('apiKeys');
      userKeys = userWithKeys.getDecryptedApiKeys();
    } catch (err) {
      logger.warn('keys.decrypt.failed', logger.withReq(req, { metadata: { message: err.message } }));
    }

    runEvaluation(testCases, jobId, emitEvent, saveEvent, updateDocument, options || {}, userKeys).catch(async (error) => {
      logger.error(
        'evaluation.failed',
        logger.withReq(req, {
          jobId,
          statusCode: 500,
          metadata: { message: error.message },
        })
      );
      logger.audit(
        'evaluation.completed',
        logger.withReq(req, {
          actor: 'system',
          userId: req.user._id,
          jobId,
          metadata: { status: 'failed', reason: error.message },
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
      message: 'Evaluation started',
      strategy: options?.strategy || 'auto',
      streamUrl: `/api/stream/${jobId}`,
      resultsUrl: `/api/results/${jobId}`,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const activeEvaluation = await findActiveEvaluationForUser(req.user._id);
      logger.warn(
        'evaluation.create.conflict',
        logger.withReq(req, {
          statusCode: 409,
          userId: req.user._id,
          jobId: activeEvaluation?.jobId || null,
        })
      );
      return res.status(409).json({
        error: 'An evaluation is already running. Resume the active evaluation before starting a new one.',
        code: ACTIVE_CONFLICT_CODE,
        status: 'processing',
        activeJobId: activeEvaluation?.jobId || null,
      });
    }
    logger.error(
      'evaluation.create_failed',
      logger.withReq(req, {
        statusCode: 500,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({
      error: 'Failed to start evaluation',
    });
  }
});

export default router;
