import { RAGScope } from '@ragscope/sdk';

const ragscope = new RAGScope({
  endpoint: 'http://localhost:3000',
  batchSize: 20,
  flushInterval: 10000,
});

/**
 * Express middleware that wraps res.json() to capture RAG interactions.
 * Attach req.ragContext before calling res.json() with the response.
 */
export function ragScopeMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (req.ragContext) {
      ragscope.capture({
        input: req.ragContext.input || req.body?.query || '',
        actualOutput: typeof body === 'string' ? body : JSON.stringify(body.answer || body),
        retrievalContext: req.ragContext.retrievalContext || [],
        expectedOutput: req.ragContext.expectedOutput,
        metadata: { path: req.path, method: req.method, ...req.ragContext.metadata },
      });
    }
    return originalJson(body);
  };

  next();
}

// Usage:
// app.use(ragScopeMiddleware);
// app.post('/chat', (req, res) => {
//   const context = retrieve(req.body.query);
//   const answer = generate(req.body.query, context);
//   req.ragContext = { input: req.body.query, retrievalContext: context };
//   res.json({ answer });
// });
