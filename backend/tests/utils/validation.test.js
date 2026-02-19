import { describe, it, expect } from 'vitest';
import { testCaseSchema, evaluateRequestSchema } from '../../src/utils/validation.js';

const baseTestCase = {
  input: 'What is coliving?',
  actualOutput: 'Coliving is a shared living model.',
  expectedOutput: 'Shared housing model.',
  retrievalContext: ['Coliving combines shared spaces with private rooms.'],
};

describe('testCaseSchema', () => {
  it('passes with id', () => {
    const result = testCaseSchema.safeParse({
      ...baseTestCase,
      id: 'test-1',
    });

    expect(result.success).toBe(true);
  });

  it('passes without id for backwards compatibility', () => {
    const result = testCaseSchema.safeParse(baseTestCase);
    expect(result.success).toBe(true);
  });

  it('passes with metadata object', () => {
    const result = testCaseSchema.safeParse({
      ...baseTestCase,
      metadata: { domain: 'coliving' },
    });

    expect(result.success).toBe(true);
  });

  it('fails when id exceeds 100 chars', () => {
    const result = testCaseSchema.safeParse({
      ...baseTestCase,
      id: 'x'.repeat(101),
    });

    expect(result.success).toBe(false);
  });
});

describe('evaluateRequestSchema compatibility', () => {
  it('still parses existing payload format', () => {
    const payload = {
      testCases: [baseTestCase],
      options: { strategy: 'auto' },
    };

    const result = evaluateRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
