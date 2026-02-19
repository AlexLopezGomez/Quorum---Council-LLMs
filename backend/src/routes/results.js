import { Router } from 'express';
import { Evaluation } from '../models/Evaluation.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * @openapi
 * /api/results/{jobId}:
 *   get:
 *     summary: Get evaluation results
 *     description: Returns 202 with progress if still processing, or full results if complete.
 *     tags: [Evaluation]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Completed evaluation results
 *       202:
 *         description: Evaluation still in progress
 *       404:
 *         description: Evaluation not found
 */
router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const evaluation = await Evaluation.findOne({ jobId, userId: req.user._id });

    if (!evaluation) {
      logger.warn(
        'results.not_found',
        logger.withReq(req, { jobId, statusCode: 404, userId: req.user._id })
      );
      return res.status(404).json({
        error: 'Evaluation not found',
        jobId,
      });
    }

    if (evaluation.status === 'processing') {
      logger.info(
        'results.processing',
        logger.withReq(req, { jobId, statusCode: 202, userId: req.user._id })
      );
      return res.status(202).json({
        jobId,
        status: 'processing',
        message: 'Evaluation is still in progress',
        streamUrl: `/api/stream/${jobId}`,
        progress: {
          completedTestCases: evaluation.results.length,
          totalTestCases: evaluation.testCases.length,
        },
      });
    }

    res.json({
      jobId,
      userId: evaluation.userId,
      status: evaluation.status,
      testCases: evaluation.testCases,
      results: evaluation.results,
      summary: evaluation.summary,
      createdAt: evaluation.createdAt,
      completedAt: evaluation.completedAt,
    });
    logger.info('results.fetched', logger.withReq(req, { jobId, statusCode: 200, userId: req.user._id }));
  } catch (error) {
    logger.error(
      'results.fetch_failed',
      logger.withReq(req, {
        jobId,
        userId: req.user?._id,
        statusCode: 500,
        metadata: { message: error.message },
      })
    );
    res.status(500).json({
      error: 'Failed to fetch results',
      message: error.message,
    });
  }
});

export default router;
