import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveMock = vi.hoisted(() => vi.fn());
const updateOneMock = vi.hoisted(() => vi.fn());
const findOneMock = vi.hoisted(() => vi.fn());
const userFindByIdMock = vi.hoisted(() => vi.fn());
const runEvaluationMock = vi.hoisted(() => vi.fn());
const emitMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/models/Evaluation.js', () => {
  class MockEvaluation {
    static updateOne = updateOneMock;
    static findOne = findOneMock;

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

vi.mock('../../src/models/User.js', () => ({
  User: {
    findById: userFindByIdMock,
  },
}));

vi.mock('../../src/utils/sse.js', () => ({
  sseManager: { emit: emitMock },
}));

const { default: evaluateRouter } = await import('../../src/routes/evaluate.js');

function mockFindOneChain(result) {
  return {
    sort: () => ({
      select: () => Promise.resolve(result),
    }),
  };
}

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
    findOneMock.mockReset();
    runEvaluationMock.mockReset();
    emitMock.mockReset();
    userFindByIdMock.mockReset();
    runEvaluationMock.mockResolvedValue(undefined);
    updateOneMock.mockResolvedValue({ acknowledged: true });
    findOneMock.mockReturnValue(mockFindOneChain(null));
    userFindByIdMock.mockReturnValue({
      select: () => Promise.resolve({
        getDecryptedApiKeys: () => ({ openai: null, anthropic: null, google: null }),
      }),
    });
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

  it('returns 409 with active job when a processing evaluation already exists', async () => {
    const app = makeApp();
    saveMock.mockImplementation(() => {
      const duplicate = new Error('duplicate key');
      duplicate.code = 11000;
      throw duplicate;
    });
    findOneMock
      .mockReturnValueOnce(mockFindOneChain(null))
      .mockReturnValueOnce(mockFindOneChain({
        jobId: 'active-job-123',
        status: 'processing',
        createdAt: new Date('2026-03-04T10:00:00.000Z'),
        name: 'Current run',
      }));

    const res = await request(app).post('/api/evaluate').send({
      testCases: [baseTestCase],
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EVALUATION_ALREADY_RUNNING');
    expect(res.body.activeJobId).toBe('active-job-123');
    expect(res.body.status).toBe('processing');
  });
});

describe('GET /api/evaluate/active', () => {
  beforeEach(() => {
    findOneMock.mockReset();
  });

  it('returns 204 when there is no active evaluation', async () => {
    const app = makeApp();
    findOneMock.mockReturnValue(mockFindOneChain(null));

    const res = await request(app).get('/api/evaluate/active');

    expect(res.status).toBe(204);
  });

  it('returns active evaluation metadata when processing evaluation exists', async () => {
    const app = makeApp();
    findOneMock.mockReturnValue(mockFindOneChain({
      jobId: 'active-job-999',
      status: 'processing',
      createdAt: new Date('2026-03-04T12:00:00.000Z'),
      name: 'Smoke test run',
    }));

    const res = await request(app).get('/api/evaluate/active');

    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe('active-job-999');
    expect(res.body.status).toBe('processing');
    expect(res.body.streamUrl).toBe('/api/stream/active-job-999');
    expect(res.body.resultsUrl).toBe('/api/results/active-job-999');
  });
});
