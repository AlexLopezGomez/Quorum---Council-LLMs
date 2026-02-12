import { Router } from 'express';
import { nanoid } from 'nanoid';
import { validateEvaluateRequest } from '../utils/validation.js';
import { Evaluation } from '../models/Evaluation.js';
import { runEvaluation } from '../services/orchestrator.js';
import { sseManager } from '../utils/sse.js';

const router = Router();

router.post('/', validateEvaluateRequest, async (req, res) => {
  try {
    const { testCases, options } = req.validatedBody;
    const jobId = nanoid(12);

    const evaluation = new Evaluation({
      jobId,
      status: 'processing',
      testCases,
      results: [],
      events: [],
      config: { strategy: options?.strategy || 'auto' },
    });

    await evaluation.save();

    const emitEvent = (event, data) => {
      sseManager.emit(jobId, event, data);
    };

    const saveEvent = async (type, data) => {
      try {
        await Evaluation.updateOne(
          { jobId },
          {
            $push: {
              events: {
                type,
                data,
                timestamp: new Date(),
              },
            },
          }
        );
      } catch (err) {
        console.error('Failed to save event:', err);
      }
    };

    const updateDocument = async (updates) => {
      try {
        await Evaluation.updateOne({ jobId }, { $set: updates });
      } catch (err) {
        console.error('Failed to update evaluation:', err);
      }
    };

    runEvaluation(testCases, jobId, emitEvent, saveEvent, updateDocument, options || {}).catch(async (error) => {
      console.error('Evaluation failed:', error);
      await Evaluation.updateOne(
        { jobId },
        {
          $set: {
            status: 'failed',
            completedAt: new Date(),
          },
        }
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
    console.error('Failed to start evaluation:', error);
    res.status(500).json({
      error: 'Failed to start evaluation',
      message: error.message,
    });
  }
});

export default router;
