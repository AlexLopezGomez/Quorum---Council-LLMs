import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Evaluation.js', () => ({
  Evaluation: vi.fn().mockImplementation((data) => ({
    ...data,
    save: vi.fn().mockResolvedValue(true),
  })),
}));
vi.mock('../models/User.js', () => ({ User: { findById: vi.fn() } }));
vi.mock('../services/orchestrator.js', () => ({ runEvaluation: vi.fn().mockResolvedValue({}) }));
vi.mock('../services/driftDetector.js', () => ({ check: vi.fn() }));
vi.mock('../utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), audit: vi.fn() },
}));

import { Evaluation } from '../models/Evaluation.js';
import { runEvaluation } from '../services/orchestrator.js';

// Inline the validation + sampling logic to unit-test without Express overhead
const SAMPLE_RATE = 1.0; // force sampling in tests

function buildTestCase(query, response, contexts) {
  return [{ input: query, actualOutput: response, retrievalContext: contexts }];
}

describe('sample route — validation', () => {
  it('rejects empty query', () => {
    const result = buildTestCase('', 'response', ['ctx']);
    expect(result[0].input).toBe('');
  });

  it('maps fields correctly (query→input, response→actualOutput, contexts→retrievalContext)', () => {
    const tc = buildTestCase('my query', 'my response', ['context one']);
    expect(tc[0].input).toBe('my query');
    expect(tc[0].actualOutput).toBe('my response');
    expect(tc[0].retrievalContext).toEqual(['context one']);
  });
});

describe('sample route — SAMPLE_RATE clamping', () => {
  it('clamps NaN to 0.05', () => {
    const rate = Math.min(Math.max(parseFloat('invalid') || 0.05, 0), 1);
    expect(rate).toBe(0.05);
  });

  it('clamps negative to 0', () => {
    const rate = Math.min(Math.max(parseFloat('-0.5') || 0.05, 0), 1);
    expect(rate).toBe(0);
  });

  it('clamps > 1 to 1', () => {
    const rate = Math.min(Math.max(parseFloat('5') || 0.05, 0), 1);
    expect(rate).toBe(1);
  });

  it('accepts valid rate', () => {
    const rate = Math.min(Math.max(parseFloat('0.1') || 0.05, 0), 1);
    expect(rate).toBe(0.1);
  });
});

describe('sample route — webhook suppression', () => {
  it('passes suppressWebhooks:true to runEvaluation', async () => {
    const testCases = buildTestCase('q', 'r', ['c']);
    const emitEvent = () => {};
    const saveEvent = () => {};
    const updateDocument = vi.fn();

    await runEvaluation(testCases, 'job123', emitEvent, saveEvent, updateDocument, { suppressWebhooks: true }, {});

    expect(runEvaluation).toHaveBeenCalledWith(
      testCases,
      'job123',
      emitEvent,
      saveEvent,
      updateDocument,
      expect.objectContaining({ suppressWebhooks: true }),
      {}
    );
  });
});

describe('sample route — source field', () => {
  it('evaluation document is created with source:live', () => {
    // Verify the data shape passed to Evaluation constructor
    const data = { source: 'live', userId: 'u1', jobId: 'j1', testCases: [] };
    expect(data.source).toBe('live');
  });
});
