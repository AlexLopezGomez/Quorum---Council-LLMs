import { Router } from 'express';
import { Evaluation } from '../models/Evaluation.js';

const router = Router();

router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const evaluation = await Evaluation.findOne({ jobId });

    if (!evaluation) {
      return res.status(404).json({
        error: 'Evaluation not found',
        jobId,
      });
    }

    if (evaluation.status === 'processing') {
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
      status: evaluation.status,
      testCases: evaluation.testCases,
      results: evaluation.results,
      summary: evaluation.summary,
      createdAt: evaluation.createdAt,
      completedAt: evaluation.completedAt,
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch results',
      message: error.message,
    });
  }
});

export default router;
