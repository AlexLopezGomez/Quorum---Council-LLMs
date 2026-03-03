import { Router } from 'express';
import mongoose from 'mongoose';
import { Evaluation } from '../models/Evaluation.js';
import { logger } from '../utils/logger.js';

const router = Router();
const MAX_SEARCH_LENGTH = 100;

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchTerm(input) {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().slice(0, MAX_SEARCH_LENGTH);
  return normalized || null;
}

/**
 * @openapi
 * /api/history:
 *   get:
 *     summary: Browse evaluation history
 *     description: Cursor-based pagination with optional filters for strategy, verdict, and status.
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: strategy
 *         schema: { type: string, enum: [auto, council, hybrid, single] }
 *       - in: query
 *         name: verdict
 *         schema: { type: string, enum: [PASS, WARN, FAIL] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [processing, complete, failed] }
 *     responses:
 *       200:
 *         description: Paginated evaluation list
 */
router.get('/', async (req, res) => {
  try {
    const parsedLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 20;
    const { cursor, strategy, verdict, status, search } = req.query;
    const searchTerm = normalizeSearchTerm(search);

    const filter = { userId: req.user._id };
    if (cursor) {
      if (typeof cursor !== 'string' || !mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
      filter._id = { $lt: cursor };
    }
    if (status) filter.status = status;
    if (strategy) filter['config.strategy'] = strategy;
    if (verdict) filter['results.aggregator.verdict'] = verdict;
    if (searchTerm) filter.name = { $regex: escapeRegex(searchTerm), $options: 'i' };

    const evaluations = await Evaluation.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select('jobId userId name status testCases summary config createdAt completedAt')
      .lean();

    const hasMore = evaluations.length > limit;
    const results = hasMore ? evaluations.slice(0, limit) : evaluations;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    res.json({
      evaluations: results.map(e => ({
        id: e._id,
        jobId: e.jobId,
        name: e.name || '',
        status: e.status,
        testCaseCount: e.testCases?.length || 0,
        summary: e.summary,
        config: e.config,
        createdAt: e.createdAt,
        completedAt: e.completedAt,
      })),
      nextCursor,
    });
    logger.info(
      'history.fetched',
      logger.withReq(req, {
        userId: req.user._id,
        statusCode: 200,
        metadata: { limit, count: results.length, hasMore },
      })
    );
  } catch (error) {
    logger.error(
      'history.fetch_failed',
      logger.withReq(req, {
        userId: req.user?._id,
        statusCode: 500,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({ error: 'Failed to fetch evaluation history' });
  }
});

router.patch('/:jobId', async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== 'string') {
      logger.warn('history.update_name.invalid_payload', logger.withReq(req, { statusCode: 400, userId: req.user._id }));
      return res.status(400).json({ error: 'name must be a string' });
    }

    const trimmedName = name.trim().slice(0, 100);

    const evaluation = await Evaluation.findOne({ jobId: req.params.jobId, userId: req.user._id }).select('jobId userId name');

    if (!evaluation) {
      logger.warn('history.update_name.not_found', logger.withReq(req, { statusCode: 404, userId: req.user._id }));
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    evaluation.name = trimmedName;
    await evaluation.save();
    logger.audit(
      'history.updated',
      logger.withReq(req, {
        actor: 'user',
        userId: req.user._id,
        statusCode: 200,
        jobId: evaluation.jobId,
        metadata: { name: evaluation.name },
      })
    );

    res.json({ jobId: evaluation.jobId, name: evaluation.name });
  } catch (error) {
    logger.error(
      'history.update_name.failed',
      logger.withReq(req, {
        userId: req.user?._id,
        statusCode: 500,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({ error: 'Failed to update evaluation name' });
  }
});

/**
 * @openapi
 * /api/history/{jobId}/cost:
 *   get:
 *     summary: Cost breakdown for an evaluation
 *     description: Per-test-case cost analysis with savings estimate vs all-council baseline.
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cost breakdown with savings estimate
 *       404:
 *         description: Evaluation not found
 */
router.get('/:jobId/cost', async (req, res) => {
  try {
    const evaluation = await Evaluation.findOne({ jobId: req.params.jobId, userId: req.user._id })
      .select('results summary config')
      .lean();

    if (!evaluation) {
      logger.warn(
        'history.cost.not_found',
        logger.withReq(req, { statusCode: 404, userId: req.user._id, jobId: req.params.jobId })
      );
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const costBreakdown = (evaluation.results || []).map(r => ({
      testCaseIndex: r.testCaseIndex,
      strategy: r.strategy || 'council',
      strategyCost: r.strategyCost || 0,
      judges: Object.entries(r.judges || {}).map(([name, j]) => ({
        name,
        model: j?.model,
        cost: j?.cost || 0,
        tokens: j?.tokens?.total || 0,
      })),
      aggregatorCost: r.aggregator?.cost || 0,
    }));

    const totalCost = costBreakdown.reduce((sum, r) => sum + r.strategyCost, 0);
    // Estimate what full council would cost
    const estimatedCouncilCost = costBreakdown.length * 0.0035;
    const savings = estimatedCouncilCost > 0
      ? Math.round((1 - totalCost / estimatedCouncilCost) * 100)
      : 0;

    res.json({
      jobId: req.params.jobId,
      totalCost: Math.round(totalCost * 1000000) / 1000000,
      estimatedCouncilCost: Math.round(estimatedCouncilCost * 1000000) / 1000000,
      savings: Math.max(0, savings),
      breakdown: costBreakdown,
    });
    logger.info(
      'history.cost.fetched',
      logger.withReq(req, {
        statusCode: 200,
        userId: req.user._id,
        jobId: req.params.jobId,
      })
    );
  } catch (error) {
    logger.error(
      'history.cost.fetch_failed',
      logger.withReq(req, {
        statusCode: 500,
        userId: req.user?._id,
        jobId: req.params.jobId,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({ error: 'Failed to fetch cost breakdown' });
  }
});

/**
 * @openapi
 * /api/stats:
 *   get:
 *     summary: Aggregated evaluation statistics
 *     description: Stats across the most recent 100 evaluations including strategy distribution and cost totals.
 *     tags: [History]
 *     responses:
 *       200:
 *         description: Aggregated statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalEvals, recentEvals] = await Promise.all([
      Evaluation.countDocuments({ userId: req.user._id }),
      Evaluation.find({ status: 'complete', userId: req.user._id })
        .sort({ _id: -1 })
        .limit(100)
        .select('summary config results')
        .lean(),
    ]);

    const strategyCounts = {};
    const costByStrategy = {};
    let totalCost = 0;
    let totalPassRate = 0;
    let evalWithPassRate = 0;

    for (const eval_ of recentEvals) {
      if (eval_.summary?.strategyCounts) {
        for (const [s, c] of Object.entries(eval_.summary.strategyCounts)) {
          strategyCounts[s] = (strategyCounts[s] || 0) + c;
        }
      }
      if (eval_.summary?.costByStrategy) {
        for (const [s, c] of Object.entries(eval_.summary.costByStrategy)) {
          costByStrategy[s] = (costByStrategy[s] || 0) + c;
        }
      }
      if (eval_.summary?.totalCost) {
        totalCost += eval_.summary.totalCost;
      }
      if (eval_.summary?.passRate !== undefined) {
        totalPassRate += eval_.summary.passRate;
        evalWithPassRate++;
      }
    }

    res.json({
      totalEvaluations: totalEvals,
      recentCount: recentEvals.length,
      avgPassRate: evalWithPassRate > 0 ? Math.round(totalPassRate / evalWithPassRate) : null,
      totalCost: Math.round(totalCost * 1000000) / 1000000,
      strategyCounts,
      costByStrategy,
    });
    logger.info(
      'history.stats.fetched',
      logger.withReq(req, {
        statusCode: 200,
        userId: req.user._id,
        metadata: { totalEvaluations: totalEvals, recentCount: recentEvals.length },
      })
    );
  } catch (error) {
    logger.error(
      'history.stats.fetch_failed',
      logger.withReq(req, {
        statusCode: 500,
        userId: req.user?._id,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
