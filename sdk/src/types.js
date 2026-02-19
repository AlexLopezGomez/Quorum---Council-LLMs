/**
 * @typedef {Object} SDKConfig
 * @property {string} endpoint - RAGScope backend URL (e.g., 'http://localhost:3000')
 * @property {string} [apiKey] - Optional API key for authentication
 * @property {'auto'|'single'|'hybrid'|'council'} [defaultStrategy='auto'] - Default evaluation strategy
 * @property {number} [batchSize=10] - Flush when buffer reaches this size
 * @property {number} [flushInterval=5000] - Auto-flush interval in ms
 * @property {function(Error): void} [onError] - Error callback (never throws)
 * @property {string} [correlationId] - Optional fixed correlation ID propagated to backend
 */

/**
 * @typedef {Object} CapturePayload
 * @property {string} input - The user query
 * @property {string} actualOutput - The RAG system response
 * @property {string} [expectedOutput] - Optional expected response
 * @property {string[]} retrievalContext - Retrieved context passages
 * @property {Object} [metadata] - Arbitrary metadata (sessionId, userId, etc.)
 * @property {string} [metadata.correlationId] - Correlation ID for distributed tracing
 * @property {string} [capturedAt] - ISO timestamp of when the interaction happened
 */

/**
 * @typedef {Object} IngestResponse
 * @property {string} jobId - The evaluation job ID
 * @property {number} captureCount - Number of captures ingested
 * @property {string} streamUrl - SSE stream URL for real-time results
 */

export {};
