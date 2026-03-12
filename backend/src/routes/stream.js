import { Router } from 'express';
import { Evaluation } from '../models/Evaluation.js';
import { BenchmarkRun } from '../models/BenchmarkRun.js';
import { sseManager, setSSEHeaders } from '../utils/sse.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * @openapi
 * /api/stream/{jobId}:
 *   get:
 *     summary: SSE stream for real-time evaluation updates
 *     description: Replays stored events then subscribes to live events. Closes on evaluation_complete or evaluation_error.
 *     tags: [Streaming]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: SSE event stream
 *         content:
 *           text/event-stream:
 *             schema: { type: string }
 *       404:
 *         description: Evaluation not found
 */
router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const evaluation = await Evaluation.findOne({ jobId, userId: req.user._id });

    if (!evaluation) {
      logger.warn('sse.stream.not_found', logger.withReq(req, { userId: req.user._id, jobId, statusCode: 404 }));
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    setSSEHeaders(res);
    logger.info('sse.connection.opened', logger.withReq(req, { userId: req.user._id, jobId, statusCode: 200 }));

    if (evaluation.events && evaluation.events.length > 0) {
      logger.info(
        'sse.replay.started',
        logger.withReq(req, { userId: req.user._id, jobId, metadata: { eventCount: evaluation.events.length } })
      );
      for (const event of evaluation.events) {
        const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        res.write(message);
      }
    }

    if (evaluation.status === 'complete' || evaluation.status === 'failed') {
      res.write(`event: replay_complete\ndata: ${JSON.stringify({ status: evaluation.status })}\n\n`);
      logger.info(
        'sse.replay.completed',
        logger.withReq(req, { userId: req.user._id, jobId, metadata: { status: evaluation.status } })
      );
      res.end();
      return;
    }

    sseManager.addConnection(jobId, res);

    res.write(`event: connected\ndata: ${JSON.stringify({ jobId, status: evaluation.status })}\n\n`);
  } catch (error) {
    logger.error(
      'sse.stream.error',
      logger.withReq(req, {
        userId: req.user?._id,
        jobId,
        statusCode: 500,
        metadata: { message: error.message },
      })
    );
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish stream' });
    }
  }
});

router.get('/benchmark/:runId', async (req, res) => {
  const { runId } = req.params;

  try {
    const run = await BenchmarkRun.findOne({ runId, userId: req.user._id });

    if (!run) {
      return res.status(404).json({ error: 'Benchmark run not found' });
    }

    setSSEHeaders(res);

    for (const event of run.events || []) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }

    if (run.status !== 'processing') {
      res.write(`event: replay_complete\ndata: ${JSON.stringify({ runId, status: run.status })}\n\n`);
      res.end();
      return;
    }

    res.write(`event: replay_complete\ndata: ${JSON.stringify({ runId, status: run.status })}\n\n`);
    sseManager.addConnection(runId, res);
  } catch (error) {
    logger.error('sse.benchmark.stream.error', logger.withReq(req, {
      userId: req.user?._id,
      metadata: { runId, message: error.message },
    }));
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish benchmark stream' });
    }
  }
});

export default router;
