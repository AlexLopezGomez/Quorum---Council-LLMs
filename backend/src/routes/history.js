import { Router } from 'express';
import { Evaluation } from '../models/Evaluation.js';

const router = Router();

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
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const { cursor, strategy, verdict, status, search } = req.query;

    const filter = { userId: req.user._id };
    if (cursor) {
      filter._id = { $lt: cursor };
    }
    if (status) {
      filter.status = status;
    }
    if (strategy) {
      filter['config.strategy'] = strategy;
    }
    if (verdict) {
      filter['results.aggregator.verdict'] = verdict;
    }
    if (search) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

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
        userId: e.userId,
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
  } catch (error) {
    console.error('Failed to fetch history:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation history' });
  }
});

router.patch('/:jobId', async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== 'string') {
      return res.status(400).json({ error: 'name must be a string' });
    }

    const evaluation = await Evaluation.findOne({ jobId: req.params.jobId }).select('jobId userId name');

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (evaluation.userId?.toString() !== req.user._id?.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    evaluation.name = name.trim().slice(0, 100);
    await evaluation.save();

    res.json({ jobId: evaluation.jobId, name: evaluation.name });
  } catch (error) {
    console.error('Failed to update evaluation name:', error);
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
  } catch (error) {
    console.error('Failed to fetch cost breakdown:', error);
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
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
