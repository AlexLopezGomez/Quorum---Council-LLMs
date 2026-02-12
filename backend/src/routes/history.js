import { Router } from 'express';
import { Evaluation } from '../models/Evaluation.js';

const router = Router();

router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const { cursor, strategy, verdict, status } = req.query;

    const filter = {};
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

    const evaluations = await Evaluation.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select('jobId status testCases summary config createdAt completedAt')
      .lean();

    const hasMore = evaluations.length > limit;
    const results = hasMore ? evaluations.slice(0, limit) : evaluations;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    res.json({
      evaluations: results.map(e => ({
        id: e._id,
        jobId: e.jobId,
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

router.get('/history/:jobId/cost', async (req, res) => {
  try {
    const evaluation = await Evaluation.findOne({ jobId: req.params.jobId })
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

router.get('/stats', async (req, res) => {
  try {
    const [totalEvals, recentEvals] = await Promise.all([
      Evaluation.countDocuments(),
      Evaluation.find({ status: 'complete' })
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
