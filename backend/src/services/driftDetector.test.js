import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing module under test
vi.mock('../models/Evaluation.js', () => ({
  Evaluation: { find: vi.fn() },
}));
vi.mock('../models/DriftAlert.js', () => ({
  DriftAlert: { findOne: vi.fn(), create: vi.fn() },
}));
vi.mock('../utils/logger.js', () => ({
  logger: { audit: vi.fn(), error: vi.fn() },
}));

import { check } from './driftDetector.js';
import { Evaluation } from '../models/Evaluation.js';
import { DriftAlert } from '../models/DriftAlert.js';

function makeFindChain(results) {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(results),
  };
  Evaluation.find.mockReturnValue(chain);
  return chain;
}

function makeEval(finalScore) {
  return { results: [{ aggregator: { finalScore } }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('driftDetector.check', () => {
  it('returns early when fewer than 5 results', async () => {
    makeFindChain([makeEval(80), makeEval(75)]);
    await check('user1');
    expect(DriftAlert.findOne).not.toHaveBeenCalled();
  });

  it('returns early when fewer than 20 total (no baseline window)', async () => {
    // 15 results — baseline window (slice(10)) = 5 results (need >= 5 baseline), but rolling window is 10
    // Actually 15 results: rollingWindow = slice(0,10) = 10 items, baselineWindow = slice(10) = 5 items
    // 5 >= 5 so baseline IS sufficient, drop = 0 (same scores), no alert
    const evals = Array.from({ length: 15 }, () => makeEval(80));
    makeFindChain(evals);
    DriftAlert.findOne.mockResolvedValue(null);
    await check('user1');
    // No alert since drop < 10
    expect(DriftAlert.create).not.toHaveBeenCalled();
  });

  it('returns early when baseline window has fewer than 5 valid scores', async () => {
    // 10 results exactly: baselineWindow = slice(10) = [] (length 0 < 5)
    const evals = Array.from({ length: 10 }, () => makeEval(80));
    makeFindChain(evals);
    await check('user1');
    expect(DriftAlert.findOne).not.toHaveBeenCalled();
  });

  it('fires warning alert when drop is 10–19 pts', async () => {
    // baseline (oldest): 80, rolling (newest 10): 68 → drop = 12 → warning
    const baseline = Array.from({ length: 15 }, () => makeEval(80));
    const rolling = Array.from({ length: 10 }, () => makeEval(68));
    makeFindChain([...rolling, ...baseline]);
    DriftAlert.findOne.mockResolvedValue(null);
    DriftAlert.create.mockResolvedValue({});

    await check('user1');

    expect(DriftAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warning' })
    );
  });

  it('fires critical alert when drop is >= 20 pts', async () => {
    const baseline = Array.from({ length: 15 }, () => makeEval(90));
    const rolling = Array.from({ length: 10 }, () => makeEval(65));
    makeFindChain([...rolling, ...baseline]);
    DriftAlert.findOne.mockResolvedValue(null);
    DriftAlert.create.mockResolvedValue({});

    await check('user1');

    expect(DriftAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' })
    );
  });

  it('skips alert when one already exists within 6 hours (dedup)', async () => {
    const baseline = Array.from({ length: 15 }, () => makeEval(90));
    const rolling = Array.from({ length: 10 }, () => makeEval(60));
    makeFindChain([...rolling, ...baseline]);
    DriftAlert.findOne.mockResolvedValue({ _id: 'existing', severity: 'critical' });

    await check('user1');

    expect(DriftAlert.create).not.toHaveBeenCalled();
  });

  it('does not alert when drop is below threshold', async () => {
    const baseline = Array.from({ length: 15 }, () => makeEval(80));
    const rolling = Array.from({ length: 10 }, () => makeEval(75));
    makeFindChain([...rolling, ...baseline]);

    await check('user1');

    expect(DriftAlert.findOne).not.toHaveBeenCalled();
    expect(DriftAlert.create).not.toHaveBeenCalled();
  });

  it('filters out null finalScore values', async () => {
    // Mix of valid and null scores — should only use non-null
    const baseline = Array.from({ length: 15 }, () => makeEval(80));
    const rolling = [
      makeEval(null),
      ...Array.from({ length: 9 }, () => makeEval(68)),
    ];
    makeFindChain([...rolling, ...baseline]);
    DriftAlert.findOne.mockResolvedValue(null);
    DriftAlert.create.mockResolvedValue({});

    await check('user1');

    // rolling mean = 68, baseline mean = 80, drop = 12 → warning
    expect(DriftAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warning' })
    );
  });
});
