import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveMock = vi.hoisted(() => vi.fn());
const updateOneMock = vi.hoisted(() => vi.fn());
const runEvaluationMock = vi.hoisted(() => vi.fn());
const emitMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/models/Evaluation.js', () => {
  class MockEvaluation {
    static updateOne = updateOneMock;

    constructor(doc) {
      this.doc = doc;
    }

    async save() {
      saveMock(this.doc);
      return this.doc;
    }
  }

  return { Evaluation: MockEvaluation };
});

vi.mock('../../src/services/orchestrator.js', () => ({
  runEvaluation: runEvaluationMock,
}));

vi.mock('../../src/utils/sse.js', () => ({
  sseManager: { emit: emitMock },
}));

const { default: evaluateRouter } = await import('../../src/routes/evaluate.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011' };
    next();
  });
  app.use('/api/evaluate', evaluateRouter);
  return app;
}

const baseTestCase = {
  input: 'What is coliving?',
  actualOutput: 'Coliving is shared housing.',
  retrievalContext: ['Coliving includes private rooms and shared amenities.'],
};

describe('POST /api/evaluate edge cases', () => {
  beforeEach(() => {
    saveMock.mockReset();
    updateOneMock.mockReset();
    runEvaluationMock.mockReset();
    emitMock.mockReset();
    runEvaluationMock.mockResolvedValue(undefined);
    updateOneMock.mockResolvedValue({ acknowledged: true });
  });

  it('accepts test cases with id and metadata', async () => {
    const app = makeApp();
    const payload = {
      testCases: [
        {
          ...baseTestCase,
          id: 'case-1',
          metadata: { domain: 'coliving', tags: ['pricing', 'policy'] },
        },
      ],
      options: { strategy: 'auto' },
    };

    const res = await request(app).post('/api/evaluate').send(payload);

    expect(res.status).toBe(202);
    expect(saveMock).toHaveBeenCalledTimes(1);
    const savedDoc = saveMock.mock.calls[0][0];
    expect(savedDoc.testCases[0].id).toBe('case-1');
    expect(savedDoc.testCases[0].metadata).toEqual(payload.testCases[0].metadata);
  });

  it('accepts payloads without id and metadata (backwards compatibility)', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/evaluate').send({
      testCases: [baseTestCase],
    });

    expect(res.status).toBe(202);
    const savedDoc = saveMock.mock.calls[0][0];
    expect(savedDoc.testCases[0].id).toBeUndefined();
    expect(savedDoc.testCases[0].metadata).toBeUndefined();
  });

  it('accepts id exactly 100 chars long', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/evaluate').send({
      testCases: [{ ...baseTestCase, id: 'x'.repeat(100) }],
    });

    expect(res.status).toBe(202);
  });

  it('rejects id longer than 100 chars', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/evaluate').send({
      testCases: [{ ...baseTestCase, id: 'x'.repeat(101) }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('rejects empty retrievalContext', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/evaluate').send({
      testCases: [{ ...baseTestCase, retrievalContext: [] }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('rejects when more than 10 test cases are sent', async () => {
    const app = makeApp();
    const testCases = Array.from({ length: 11 }).map((_, idx) => ({
      ...baseTestCase,
      id: `case-${idx}`,
    }));

    const res = await request(app).post('/api/evaluate').send({ testCases });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});
