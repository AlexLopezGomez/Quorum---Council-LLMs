import { Router } from 'express';
import { z } from 'zod';
import { Webhook } from '../models/Webhook.js';
import { createValidationMiddleware } from '../utils/validation.js';

const router = Router();

const VALID_EVENTS = ['verdict_fail', 'score_below_threshold', 'high_risk_fail', 'cost_spike', 'evaluation_complete'];

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  secret: z.string().max(256).optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1),
  config: z.object({
    scoreThreshold: z.number().min(0).max(1).default(0.7),
    costSpikeMultiplier: z.number().min(1).max(100).default(2),
  }).optional().default({}),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  secret: z.string().max(256).nullable().optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).optional(),
  config: z.object({
    scoreThreshold: z.number().min(0).max(1).optional(),
    costSpikeMultiplier: z.number().min(1).max(100).optional(),
  }).optional(),
  active: z.boolean().optional(),
});

/**
 * @openapi
 * /api/webhooks:
 *   post:
 *     summary: Create a webhook
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Webhook'
 *     responses:
 *       201:
 *         description: Webhook created
 *       400:
 *         description: Validation error
 */
router.post('/', createValidationMiddleware(createWebhookSchema), async (req, res) => {
  try {
    const webhook = new Webhook({ ...req.validatedBody, userId: req.user._id });
    await webhook.save();
    res.status(201).json(webhook);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create webhook', message: err.message });
  }
});

/**
 * @openapi
 * /api/webhooks:
 *   get:
 *     summary: List all webhooks
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: List of webhooks
 */
router.get('/', async (req, res) => {
  try {
    const webhooks = await Webhook.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ webhooks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * @openapi
 * /api/webhooks/{id}:
 *   patch:
 *     summary: Update a webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Webhook'
 *     responses:
 *       200:
 *         description: Webhook updated
 *       404:
 *         description: Webhook not found
 */
router.patch('/:id', createValidationMiddleware(updateWebhookSchema), async (req, res) => {
  try {
    const webhook = await Webhook.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.validatedBody },
      { new: true, runValidators: true }
    );
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    res.json(webhook);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update webhook', message: err.message });
  }
});

/**
 * @openapi
 * /api/webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Webhook deleted
 *       404:
 *         description: Webhook not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const webhook = await Webhook.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ message: 'Webhook deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * @openapi
 * /api/webhooks/{id}/test:
 *   post:
 *     summary: Send a test payload to a webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Test result
 *       404:
 *         description: Webhook not found
 */
router.post('/:id/test', async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, userId: req.user._id });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    const samplePayload = {
      event: 'test',
      matchedEvents: ['evaluation_complete'],
      jobId: 'test-webhook-123',
      summary: { avgFinalScore: 0.75, passRate: 80, totalCost: 0.0042 },
      config: { strategy: 'auto' },
      testCaseCount: 5,
      timestamp: new Date().toISOString(),
    };

    const headers = { 'Content-Type': 'application/json' };
    if (webhook.secret) {
      const crypto = await import('crypto');
      headers['X-RagScope-Signature'] = crypto.createHmac('sha256', webhook.secret)
        .update(JSON.stringify(samplePayload)).digest('hex');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(samplePayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      res.json({ success: response.ok, status: response.status });
    } catch (fetchErr) {
      clearTimeout(timeout);
      res.json({ success: false, error: fetchErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

export default router;
