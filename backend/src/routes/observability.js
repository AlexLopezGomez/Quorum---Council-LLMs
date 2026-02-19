import { Router } from 'express';
import { AppLog } from '../models/AppLog.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const { requestId, jobId, limit = '100' } = req.query;
    const parsedLimit = Math.min(Number.parseInt(limit, 10) || 100, 500);

    if (!requestId && !jobId) {
      return res.status(400).json({ error: 'requestId or jobId is required' });
    }

    const filter = { userId: req.user._id };
    if (requestId) filter.requestId = requestId;
    if (jobId) filter.jobId = jobId;

    const [logs, audits] = await Promise.all([
      AppLog.find(filter).sort({ createdAt: -1 }).limit(parsedLimit).lean(),
      AuditEvent.find(filter).sort({ createdAt: -1 }).limit(parsedLimit).lean(),
    ]);

    logger.info(
      'observability.search.executed',
      logger.withReq(req, {
        statusCode: 200,
        userId: req.user._id,
        metadata: { requestId, jobId, limit: parsedLimit, logs: logs.length, audits: audits.length },
      })
    );

    res.json({ requestId: requestId || null, jobId: jobId || null, logs, audits });
  } catch (error) {
    logger.error(
      'observability.search.failed',
      logger.withReq(req, {
        statusCode: 500,
        userId: req.user?._id,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({ error: 'Failed to query observability logs' });
  }
});

export default router;
