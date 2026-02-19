import { z } from 'zod';

const verdictSchema = z.enum(['PASS', 'WARN', 'FAIL', 'SKIP', 'ERROR']);

const thresholdSchema = z.object({
  pass: z.number().min(0).max(1),
  warn: z.number().min(0).max(1),
});

const metricVerdictSchema = z.object({
  metric: z.string(),
  score: z.number().nullable(),
  verdict: verdictSchema,
  threshold: thresholdSchema.optional(),
});

const testCaseResultSchema = z.object({
  index: z.number().int().nonnegative(),
  id: z.string().optional(),
  metricVerdicts: z.array(metricVerdictSchema),
  overallVerdict: verdictSchema,
  strategy: z.string(),
  riskScore: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const regressionSchema = z.object({
  metric: z.string(),
  previous: z.number(),
  current: z.number(),
  delta: z.number(),
  testCaseId: z.string().optional(),
});

const summarySchema = z.object({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  warned: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errored: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(100),
  avgScores: z.record(z.number().nullable()),
  totalCost: z.number().nonnegative(),
});

export const testRunResultSchema = z.object({
  runId: z.string(),
  timestamp: z.string().datetime(),
  config: z.record(z.unknown()),
  dataset: z.string(),
  strategyDistribution: z.record(z.number().int().nonnegative()),
  results: z.array(testCaseResultSchema),
  summary: summarySchema,
  regressions: z.array(regressionSchema),
  overallVerdict: verdictSchema,
});
