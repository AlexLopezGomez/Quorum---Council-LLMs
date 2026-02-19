import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Quorum API',
      version: '1.0.0',
      description: 'AI evaluation platform with Council-of-LLMs architecture and adaptive orchestration.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    components: {
      schemas: {
        TestCase: {
          type: 'object',
          required: ['input', 'actualOutput', 'retrievalContext'],
          properties: {
            input: { type: 'string', maxLength: 1000 },
            actualOutput: { type: 'string', maxLength: 5000 },
            expectedOutput: { type: 'string', maxLength: 5000 },
            retrievalContext: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
          },
        },
        EvaluationResult: {
          type: 'object',
          properties: {
            testCaseIndex: { type: 'number' },
            judges: { type: 'object' },
            aggregator: {
              type: 'object',
              properties: {
                finalScore: { type: 'number' },
                verdict: { type: 'string', enum: ['PASS', 'WARN', 'FAIL', 'ERROR'] },
                synthesis: { type: 'string' },
                disagreements: { type: 'array', items: { type: 'string' } },
                recommendation: { type: 'string' },
              },
            },
            strategy: { type: 'string', enum: ['council', 'hybrid', 'single'] },
            riskScore: { type: 'number' },
          },
        },
        Webhook: {
          type: 'object',
          required: ['name', 'url', 'events'],
          properties: {
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            secret: { type: 'string' },
            events: { type: 'array', items: { type: 'string', enum: ['verdict_fail', 'score_below_threshold', 'high_risk_fail', 'cost_spike', 'evaluation_complete'] } },
            config: {
              type: 'object',
              properties: {
                scoreThreshold: { type: 'number', default: 0.7 },
                costSpikeMultiplier: { type: 'number', default: 2 },
              },
            },
            active: { type: 'boolean', default: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const spec = swaggerJsdoc(options);
