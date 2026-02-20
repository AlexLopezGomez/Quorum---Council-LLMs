// Synced from backend/src/schemas/testSuiteConfig.js — keep in sync manually
import { z } from 'zod';

const metricThresholdSchema = z
  .object({ pass: z.number().min(0).max(1), warn: z.number().min(0).max(1) })
  .refine((d) => d.warn <= d.pass, { message: 'warn must be <= pass', path: ['warn'] });

const metricsConfigSchema = z
  .object({
    faithfulness: metricThresholdSchema.optional(),
    groundedness: metricThresholdSchema.optional(),
    contextRelevancy: metricThresholdSchema.optional(),
    finalScore: metricThresholdSchema.optional(),
  })
  .refine((m) => Object.values(m).some(Boolean), 'At least one metric must be configured');

const ciOptionsSchema = z.object({
  failOnWarn: z.boolean().default(false),
  failOnError: z.boolean().default(true),
  failOnRegression: z.boolean().default(false),
  regressionThreshold: z.number().min(0).max(1).default(0.05),
  baselinePath: z.string().optional(),
});

export const testSuiteConfigSchema = z.object({
  version: z.literal(1),
  datasets: z.array(z.string()).min(1),
  metrics: metricsConfigSchema,
  strategy: z.enum(['auto', 'single', 'hybrid', 'council']).default('auto'),
  ci: ciOptionsSchema.default({}),
});

export function parseConfig(rawObject) {
  return testSuiteConfigSchema.parse(rawObject);
}
