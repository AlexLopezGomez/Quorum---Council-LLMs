import { Router } from 'express';
import { AppLog } from '../models/AppLog.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { logger } from '../utils/logger.js';

const router = Router();
const MAX_FILTER_LENGTH = 128;

function normalizeFilter(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().slice(0, MAX_FILTER_LENGTH);
  return trimmed || null;
}

router.get('/search', async (req, res) => {
  try {
    const requestId = normalizeFilter(req.query.requestId);
    const jobId = normalizeFilter(req.query.jobId);
    const limit = String(req.query.limit ?? '100');
    const parsedLimitRaw = Number.parseInt(limit, 10);
    const parsedLimit = Number.isFinite(parsedLimitRaw)
      ? Math.min(Math.max(parsedLimitRaw, 1), 500)
      : 100;

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
