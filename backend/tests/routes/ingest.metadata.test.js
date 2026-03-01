import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveMock = vi.hoisted(() => vi.fn());
const runEvaluationMock = vi.hoisted(() => vi.fn());
const emitMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/models/Evaluation.js', () => {
  class MockEvaluation {
    static updateOne = vi.fn();

    constructor(doc) {
      Object.assign(this, doc);
    }

    async save() {
      saveMock(this);
      return this;
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

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
    withReq: (_req, ctx) => ctx,
  },
}));

async function buildApp() {
  const { default: ingestRouter } = await import('../../src/routes/ingest.js');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: 'user-123' };
    next();
  });
  app.use('/', ingestRouter);
  return app;
}

const baseCapture = {
  input: 'What is RAG?',
  actualOutput: 'RAG stands for Retrieval-Augmented Generation.',
  retrievalContext: ['RAG combines retrieval with generation.'],
};

describe('POST /api/ingest — metadata propagation', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    runEvaluationMock.mockResolvedValue(undefined);
    app = await buildApp();
  });

  it('preserves metadata in the stored test case', async () => {
    const capture = {
      ...baseCapture,
      metadata: { sessionId: 'ses_abc', userId: 'usr_123' },
    };

    await request(app).post('/').send({ captures: [capture] }).expect(202);

    const saved = saveMock.mock.calls[0][0];
    expect(saved.testCases[0].metadata).toEqual({ sessionId: 'ses_abc', userId: 'usr_123' });
  });

  it('preserves capturedAt in the stored test case', async () => {
    const ts = '2026-01-15T10:30:00.000Z';
    const capture = { ...baseCapture, capturedAt: ts };

    await request(app).post('/').send({ captures: [capture] }).expect(202);

    const saved = saveMock.mock.calls[0][0];
    expect(saved.testCases[0].capturedAt).toBe(ts);
  });

  it('preserves both metadata and capturedAt when both are present', async () => {
    const ts = '2026-03-01T08:00:00.000Z';
    const capture = {
      ...baseCapture,
      metadata: { correlationId: 'corr-xyz' },
      capturedAt: ts,
    };

    await request(app).post('/').send({ captures: [capture] }).expect(202);

    const saved = saveMock.mock.calls[0][0];
    expect(saved.testCases[0].metadata).toEqual({ correlationId: 'corr-xyz' });
    expect(saved.testCases[0].capturedAt).toBe(ts);
  });

  it('stores undefined for metadata and capturedAt when omitted', async () => {
    await request(app).post('/').send({ captures: [baseCapture] }).expect(202);

    const saved = saveMock.mock.calls[0][0];
    expect(saved.testCases[0].metadata).toBeUndefined();
    expect(saved.testCases[0].capturedAt).toBeUndefined();
  });

  it('propagates metadata across all captures in a batch', async () => {
    const captures = [
      { ...baseCapture, metadata: { tag: 'first' } },
      { ...baseCapture, metadata: { tag: 'second' } },
    ];

    await request(app).post('/').send({ captures }).expect(202);

    const saved = saveMock.mock.calls[0][0];
    expect(saved.testCases[0].metadata).toEqual({ tag: 'first' });
    expect(saved.testCases[1].metadata).toEqual({ tag: 'second' });
  });
});
