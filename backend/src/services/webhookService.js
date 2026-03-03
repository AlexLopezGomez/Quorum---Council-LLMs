import crypto from 'crypto';
import { Webhook } from '../models/Webhook.js';
import { Evaluation } from '../models/Evaluation.js';
import { logger } from '../utils/logger.js';
import { decrypt } from '../utils/encryption.js';

const WEBHOOK_TIMEOUT = 3000;
const MAX_FAILURES = 5;

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function resolveSecret(secret) {
  if (!secret) return null;

  // Backward compatibility for legacy plaintext webhook secrets.
  if (typeof secret === 'string') return secret;

  try {
    return decrypt(secret);
  } catch {
    return null;
  }
}

function formatSlackPayload(evaluation) {
  const { jobId, summary, config } = evaluation;
  const score = summary?.avgFinalScore?.toFixed(2) ?? 'N/A';
  const verdict = summary?.passRate != null ? `${summary.passRate}% pass` : 'N/A';
  const cost = summary?.totalCost != null ? `$${summary.totalCost.toFixed(4)}` : 'N/A';
  const strategy = config?.strategy || 'auto';

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Quorum Evaluation Alert`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Job ID:*\n\`${jobId}\`` },
          { type: 'mrkdwn', text: `*Strategy:*\n${strategy}` },
          { type: 'mrkdwn', text: `*Avg Score:*\n${score}` },
          { type: 'mrkdwn', text: `*Pass Rate:*\n${verdict}` },
          { type: 'mrkdwn', text: `*Cost:*\n${cost}` },
          { type: 'mrkdwn', text: `*Test Cases:*\n${evaluation.testCases?.length || 0}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Dashboard' },
            url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}`,
          },
        ],
      },
    ],
  };
}

function buildPayload(evaluation, matchedEvents) {
  return {
    event: matchedEvents.length === 1 ? matchedEvents[0] : 'multiple',
    matchedEvents,
    jobId: evaluation.jobId,
    summary: evaluation.summary || {},
    config: evaluation.config || {},
    testCaseCount: evaluation.testCases?.length || 0,
    timestamp: new Date().toISOString(),
  };
}

function checkConditions(webhook, evaluation) {
  const matched = [];
  const { summary, results, config } = evaluation;

  for (const event of webhook.events) {
    if (event === 'evaluation_complete') {
      matched.push(event);
    }

    if (event === 'verdict_fail' && results) {
      const hasFail = results.some(r => r.aggregator?.verdict === 'FAIL');
      if (hasFail) matched.push(event);
    }

    if (event === 'score_below_threshold' && summary?.avgFinalScore != null) {
      if (summary.avgFinalScore < webhook.config.scoreThreshold) matched.push(event);
    }

    if (event === 'high_risk_fail' && results) {
      const hasHighRiskFail = results.some(
        r => r.riskScore >= 0.8 && r.aggregator?.verdict === 'FAIL'
      );
      if (hasHighRiskFail) matched.push(event);
    }
  }

  return [...new Set(matched)];
}

async function checkCostSpike(webhook, evaluation) {
  if (!webhook.events.includes('cost_spike') || !evaluation.summary?.totalCost) return false;

  const recentEvals = await Evaluation.find(
    { status: 'complete', _id: { $ne: evaluation._id }, userId: evaluation.userId },
    { 'summary.totalCost': 1 }
  ).sort({ completedAt: -1 }).limit(10).lean();

  if (recentEvals.length < 3) return false;

  const avgCost = recentEvals.reduce((sum, e) => sum + (e.summary?.totalCost || 0), 0) / recentEvals.length;
  return evaluation.summary.totalCost > avgCost * webhook.config.costSpikeMultiplier;
}

async function sendWebhook(webhook, payload) {
  const isSlack = webhook.url.includes('hooks.slack.com');
  const body = isSlack ? JSON.stringify(formatSlackPayload(payload)) : JSON.stringify(payload);

  const headers = { 'Content-Type': 'application/json' };
  const secret = resolveSecret(webhook.secret);
  if (secret) {
    headers['X-Quorum-Signature'] = signPayload(payload, secret);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    logger.audit('webhook.triggered', {
      actor: 'webhook',
      userId: webhook.userId,
      jobId: payload.jobId,
      metadata: {
        webhookId: webhook._id,
        webhookName: webhook.name,
        status: response.status,
        matchedEvents: payload.matchedEvents,
      },
    });

    await Webhook.updateOne(
      { _id: webhook._id },
      { $set: { lastTriggered: new Date(), failureCount: 0 } }
    );
  } catch (err) {
    logger.warn('webhook.failed', {
      userId: webhook.userId,
      jobId: payload.jobId,
      metadata: {
        webhookId: webhook._id,
        webhookName: webhook.name,
        message: err.message,
      },
    });
    const newCount = webhook.failureCount + 1;
    const update = { $inc: { failureCount: 1 } };
    if (newCount >= MAX_FAILURES) {
      update.$set = { active: false };
      logger.audit('webhook.disabled', {
        actor: 'webhook',
        userId: webhook.userId,
        jobId: payload.jobId,
        metadata: {
          webhookId: webhook._id,
          webhookName: webhook.name,
          failureCount: newCount,
        },
      });
    }
    await Webhook.updateOne({ _id: webhook._id }, update);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fireWebhooks(evaluation) {
  const webhooks = await Webhook.find({ active: true, userId: evaluation.userId }).lean();
  if (webhooks.length === 0) return;

  for (const webhook of webhooks) {
    const matchedEvents = checkConditions(webhook, evaluation);

    const isCostSpike = await checkCostSpike(webhook, evaluation);
    if (isCostSpike) matchedEvents.push('cost_spike');

    if (matchedEvents.length === 0) continue;

    const payload = buildPayload(evaluation, matchedEvents);
    logger.info('webhook.match.found', {
      userId: evaluation.userId,
      jobId: evaluation.jobId,
      metadata: {
        webhookId: webhook._id,
        matchedEvents,
      },
    });
    sendWebhook(webhook, payload).catch(() => { });
  }
}
