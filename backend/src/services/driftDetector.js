import { Evaluation } from '../models/Evaluation.js';
import { DriftAlert } from '../models/DriftAlert.js';
import { logger } from '../utils/logger.js';

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function createAlert(userId, severity, drop, baselineMean, rollingMean) {
  await DriftAlert.create({ userId, severity, drop, baselineMean, rollingMean });
  logger.audit('drift.alert.created', {
    actor: 'system',
    userId,
    metadata: { severity, drop, baselineMean, rollingMean },
  });
}

export async function check(userId) {
  const recent = await Evaluation.find({
    userId,
    source: 'live',
    status: 'complete',
  })
    .sort({ completedAt: -1 })
    .limit(30)
    .select('results.aggregator.finalScore completedAt')
    .lean();

  if (recent.length < 5) return;

  const scores = recent
    .map((e) => e.results?.[0]?.aggregator?.finalScore ?? null)
    .filter((s) => s !== null);

  if (scores.length < 5) return;

  // Newest-first: [0..9] = rolling window, [10..29] = baseline
  const rollingWindow = scores.slice(0, Math.min(10, scores.length));
  const baselineWindow = scores.slice(10);

  if (baselineWindow.length < 5) return;

  const rollingMean = avg(rollingWindow);
  const baselineMean = avg(baselineWindow);
  const drop = baselineMean - rollingMean;

  if (drop < 10) return;

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recentAlert = await DriftAlert.findOne({ userId, createdAt: { $gt: sixHoursAgo } });
  if (recentAlert) return;

  const severity = drop >= 20 ? 'critical' : 'warning';
  await createAlert(userId, severity, drop, baselineMean, rollingMean);
}
