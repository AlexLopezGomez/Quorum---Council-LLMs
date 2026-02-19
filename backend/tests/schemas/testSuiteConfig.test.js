import { describe, it, expect } from 'vitest';
import { testSuiteConfigSchema } from '../../src/schemas/testSuiteConfig.js';

describe('testSuiteConfigSchema', () => {
  it('passes for valid minimal config', () => {
    const input = {
      version: 1,
      datasets: ['sample.jsonl'],
      metrics: {
        faithfulness: { pass: 0.7, warn: 0.4 },
      },
    };

    const parsed = testSuiteConfigSchema.parse(input);
    expect(parsed.version).toBe(1);
    expect(parsed.strategy).toBe('auto');
  });

  it('passes for valid full config', () => {
    const input = {
      version: 1,
      datasets: ['a.jsonl', 'b.jsonl'],
      metrics: {
        faithfulness: { pass: 0.8, warn: 0.5 },
        groundedness: { pass: 0.75, warn: 0.45 },
        contextRelevancy: { pass: 0.7, warn: 0.35 },
        finalScore: { pass: 0.72, warn: 0.4 },
      },
      strategy: 'hybrid',
      ci: {
        failOnWarn: true,
        failOnError: true,
        failOnRegression: true,
        regressionThreshold: 0.1,
        baselinePath: 'tests/baselines',
      },
    };

    const parsed = testSuiteConfigSchema.parse(input);
    expect(parsed.strategy).toBe('hybrid');
    expect(parsed.ci.baselinePath).toBe('tests/baselines');
  });

  it('fails when version is missing', () => {
    const result = testSuiteConfigSchema.safeParse({
      datasets: ['sample.jsonl'],
      metrics: { faithfulness: { pass: 0.7, warn: 0.4 } },
    });

    expect(result.success).toBe(false);
  });

  it('fails when version is not 1', () => {
    const result = testSuiteConfigSchema.safeParse({
      version: 2,
      datasets: ['sample.jsonl'],
      metrics: { faithfulness: { pass: 0.7, warn: 0.4 } },
    });

    expect(result.success).toBe(false);
  });

  it('fails when datasets is empty', () => {
    const result = testSuiteConfigSchema.safeParse({
      version: 1,
      datasets: [],
      metrics: { faithfulness: { pass: 0.7, warn: 0.4 } },
    });

    expect(result.success).toBe(false);
  });

  it('fails when no metrics are configured', () => {
    const result = testSuiteConfigSchema.safeParse({
      version: 1,
      datasets: ['sample.jsonl'],
      metrics: {},
    });

    expect(result.success).toBe(false);
  });

  it('fails when warn is greater than pass', () => {
    const result = testSuiteConfigSchema.safeParse({
      version: 1,
      datasets: ['sample.jsonl'],
      metrics: {
        faithfulness: { pass: 0.6, warn: 0.7 },
      },
    });

    expect(result.success).toBe(false);
  });

  it('passes when warn equals pass', () => {
    const result = testSuiteConfigSchema.safeParse({
      version: 1,
      datasets: ['sample.jsonl'],
      metrics: {
        faithfulness: { pass: 0.6, warn: 0.6 },
      },
    });

    expect(result.success).toBe(true);
  });

  it('applies ci defaults when omitted', () => {
    const parsed = testSuiteConfigSchema.parse({
      version: 1,
      datasets: ['sample.jsonl'],
      metrics: {
        faithfulness: { pass: 0.7, warn: 0.4 },
      },
    });

    expect(parsed.ci).toEqual({
      failOnWarn: false,
      failOnError: true,
      failOnRegression: false,
      regressionThreshold: 0.05,
    });
  });

  it('fails when regressionThreshold is out of range', () => {
    const result = testSuiteConfigSchema.safeParse({
      version: 1,
      datasets: ['sample.jsonl'],
      metrics: {
        faithfulness: { pass: 0.7, warn: 0.4 },
      },
      ci: {
        regressionThreshold: 1.5,
      },
    });

    expect(result.success).toBe(false);
  });
});
