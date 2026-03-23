import { Router } from 'express';
import { Evaluation } from '../models/Evaluation.js';
import { DriftAlert } from '../models/DriftAlert.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/scores', async (req, res) => {
  try {
    const parsedLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;

    const evaluations = await Evaluation.find({
      userId: req.user._id,
      source: 'live',
      status: 'complete',
    })
      .sort({ completedAt: -1 })
      .limit(limit)
      .select('jobId completedAt results.aggregator.finalScore results.aggregator.verdict results.strategy results.riskScore')
      .lean();

    const scores = evaluations.map((e) => ({
      jobId: e.jobId,
      completedAt: e.completedAt,
      finalScore: e.results?.[0]?.aggregator?.finalScore ?? null,
      verdict: e.results?.[0]?.aggregator?.verdict ?? null,
      strategy: e.results?.[0]?.strategy ?? null,
      riskScore: e.results?.[0]?.riskScore ?? null,
    }));

    logger.info('monitoring.scores.fetched', {
      userId: req.user._id,
      metadata: { count: scores.length },
    });

    res.json({ scores });
  } catch (error) {
    logger.error('monitoring.scores.fetch_failed', {
      userId: req.user?._id,
      metadata: { message: error.message },
    });
    res.status(500).json({ error: 'Failed to fetch monitoring scores' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await DriftAlert.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    logger.info('monitoring.alerts.fetched', {
      userId: req.user._id,
      metadata: { count: alerts.length },
    });

    res.json({
      alerts: alerts.map((a) => ({
        severity: a.severity,
        drop: a.drop,
        baselineMean: a.baselineMean,
        rollingMean: a.rollingMean,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    logger.error('monitoring.alerts.fetch_failed', {
      userId: req.user?._id,
      metadata: { message: error.message },
    });
    res.status(500).json({ error: 'Failed to fetch drift alerts' });
  }
});

export default router;
