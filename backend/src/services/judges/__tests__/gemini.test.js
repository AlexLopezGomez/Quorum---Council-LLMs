import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

const { evaluateContextRelevancy } = await import('../gemini.js');

const baseTestCase = {
  input: 'What is RAG?',
  actualOutput: 'RAG stands for Retrieval-Augmented Generation.',
  retrievalContext: 'Retrieval-Augmented Generation (RAG) combines retrieval with generation.',
};

function makeResponse(text, usageMetadata = { promptTokenCount: 100, candidatesTokenCount: 50 }) {
  return { response: { text: () => text, usageMetadata } };
}

describe('evaluateContextRelevancy', () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

  it('returns correct result on happy path', async () => {
    const payload = {
      score: 0.9,
      reason: 'Context is highly relevant',
      details: { relevantPassages: 3, totalPassages: 3, missingTopics: [], noiseLevel: 'low' },
    };
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)));

    const result = await evaluateContextRelevancy(baseTestCase);

    expect(result.judge).toBe('gemini');
    expect(result.metric).toBe('contextRelevancy');
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.score).toBe(0.9);
    expect(result.reason).toBe('Context is highly relevant');
    expect(result.details).toEqual(payload.details);
    expect(result.tokens.input).toBe(100);
    expect(result.tokens.output).toBe(50);
    expect(result.tokens.total).toBe(150);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('calculates cost correctly based on token counts', async () => {
    const payload = { score: 0.8, reason: 'Good', details: {} };
    mockGenerateContent.mockResolvedValueOnce(
      makeResponse(JSON.stringify(payload), { promptTokenCount: 1000, candidatesTokenCount: 500 })
    );

    const result = await evaluateContextRelevancy(baseTestCase);

    // 1000/1000 * 0.0001 + 500/1000 * 0.0004 = 0.0001 + 0.0002 = 0.0003
    expect(result.cost).toBe(0.0003);
  });

  it('throws when response has no JSON object', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('plain text with no braces'));

    await expect(evaluateContextRelevancy(baseTestCase)).rejects.toThrow('Failed to parse Gemini response');
  });

  it('throws when response contains malformed JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('{ invalid: json: here }'));

    await expect(evaluateContextRelevancy(baseTestCase)).rejects.toThrow('Failed to parse Gemini response');
  });

  it('propagates API errors thrown by generateContent', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API quota exceeded'));

    await expect(evaluateContextRelevancy(baseTestCase)).rejects.toThrow('API quota exceeded');
  });

  it('defaults tokens and cost to 0 when usageMetadata is undefined', async () => {
    const payload = { score: 0.5, reason: 'Partial', details: {} };
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(payload), usageMetadata: undefined },
    });

    const result = await evaluateContextRelevancy(baseTestCase);

    expect(result.tokens.input).toBe(0);
    expect(result.tokens.output).toBe(0);
    expect(result.tokens.total).toBe(0);
    expect(result.cost).toBe(0);
  });

  it('handles score of 0 (minimum boundary)', async () => {
    const payload = { score: 0, reason: 'Completely irrelevant', details: {} };
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)));

    const result = await evaluateContextRelevancy(baseTestCase);

    expect(result.score).toBe(0);
  });

  it('handles score of 1 (maximum boundary)', async () => {
    const payload = { score: 1, reason: 'Perfect context', details: {} };
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)));

    const result = await evaluateContextRelevancy(baseTestCase);

    expect(result.score).toBe(1);
  });

  it('handles empty retrievalContext', async () => {
    const payload = { score: 0.1, reason: 'No context provided', details: {} };
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)));

    const result = await evaluateContextRelevancy({ ...baseTestCase, retrievalContext: '' });

    expect(result.score).toBe(0.1);
  });

  it('handles retrievalContext as an array of passages', async () => {
    const payload = { score: 0.8, reason: 'Good coverage', details: {} };
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)));

    const result = await evaluateContextRelevancy({
      ...baseTestCase,
      retrievalContext: ['passage one', 'passage two'],
    });

    expect(result.score).toBe(0.8);
  });

  it('extracts JSON even when surrounded by extra text', async () => {
    const payload = { score: 0.7, reason: 'Decent context', details: {} };
    const wrappedJson = `Here is my evaluation:\n${JSON.stringify(payload)}\nEnd.`;
    mockGenerateContent.mockResolvedValueOnce(makeResponse(wrappedJson));

    const result = await evaluateContextRelevancy(baseTestCase);

    expect(result.score).toBe(0.7);
  });

  it('passes the formatted prompt to generateContent', async () => {
    const payload = { score: 0.6, reason: 'Ok', details: {} };
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)));

    await evaluateContextRelevancy(baseTestCase);

    const calledWith = mockGenerateContent.mock.calls[0][0];
    expect(typeof calledWith).toBe('string');
    expect(calledWith).toContain('What is RAG?');
  });
});
