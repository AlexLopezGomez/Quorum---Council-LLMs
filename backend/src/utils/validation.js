import { z } from 'zod';

const MAX_TEST_CASES = 10;
const MAX_CONTEXT_PASSAGES = 20;
const MAX_INPUT_LENGTH = 1000;
const MAX_OUTPUT_LENGTH = 5000;
const MAX_CONTEXT_LENGTH = 10000;

export const testCaseSchema = z.object({
  id: z.string().max(100).optional(),
  input: z
    .string()
    .min(1, 'Input is required')
    .max(MAX_INPUT_LENGTH, `Input must be at most ${MAX_INPUT_LENGTH} characters`),
  actualOutput: z
    .string()
    .min(1, 'Actual output is required')
    .max(MAX_OUTPUT_LENGTH, `Actual output must be at most ${MAX_OUTPUT_LENGTH} characters`),
  expectedOutput: z
    .string()
    .max(MAX_OUTPUT_LENGTH, `Expected output must be at most ${MAX_OUTPUT_LENGTH} characters`)
    .optional(),
  retrievalContext: z
    .array(
      z.string().max(MAX_CONTEXT_LENGTH, `Each context passage must be at most ${MAX_CONTEXT_LENGTH} characters`)
    )
    .min(1, 'At least one retrieval context passage is required')
    .max(MAX_CONTEXT_PASSAGES, `At most ${MAX_CONTEXT_PASSAGES} context passages allowed`),
  metadata: z.record(z.unknown()).optional(),
});

export const evaluateRequestSchema = z.object({
  testCases: z
    .array(testCaseSchema)
    .min(1, 'At least one test case is required')
    .max(MAX_TEST_CASES, `At most ${MAX_TEST_CASES} test cases allowed in demo mode`),
  name: z.string().max(100).optional().default(''),
  options: z.object({
    strategy: z.enum(['auto', 'single', 'hybrid', 'council']).default('auto'),
    riskOverride: z.number().min(0).max(1).optional(),
    demo: z.boolean().optional().default(false),
  }).optional().default({ strategy: 'auto' }),
});

export function createValidationMiddleware(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

export const validateEvaluateRequest = createValidationMiddleware(evaluateRequestSchema);
