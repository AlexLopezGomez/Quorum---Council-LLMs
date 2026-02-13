# @ragscope/sdk

Lightweight, zero-dependency SDK for capturing RAG interactions and sending them to [RAGScope](https://github.com/your-org/ragscope) for evaluation.

## Quick Start

```js
import { RAGScope } from '@ragscope/sdk';

const ragscope = new RAGScope({ endpoint: 'http://localhost:3000' });

ragscope.capture({
  input: 'What is the capital of France?',
  actualOutput: 'The capital of France is Paris.',
  retrievalContext: ['Paris is the capital and largest city of France.'],
});

await ragscope.close();
```

## Integration Patterns

### 1. Direct Capture

Call `capture()` after each RAG interaction. Non-blocking — won't slow your app.

### 2. Express Middleware

```js
import { ragScopeMiddleware } from './middleware.js';
app.use(ragScopeMiddleware);
```

Wraps `res.json()` to automatically capture responses when `req.ragContext` is set.

### 3. LangChain Callback

Extend `BaseCallbackHandler` and call `ragscope.capture()` in `handleChainEnd`.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | **required** | RAGScope backend URL |
| `apiKey` | `string` | — | Optional API key |
| `defaultStrategy` | `string` | `'auto'` | `auto` \| `single` \| `hybrid` \| `council` |
| `batchSize` | `number` | `10` | Flush when buffer reaches this size |
| `flushInterval` | `number` | `5000` | Auto-flush interval in ms |
| `onError` | `function` | `console.warn` | Error callback (SDK never throws) |

## Data Flow

```
Your App → capture() → Buffer → flush() → POST /api/ingest → RAGScope Backend
                                   ↑                              ↓
                         batchSize or interval           Evaluation Pipeline
                                                              ↓
                                                     SSE Stream / Results API
```

## API

### `new RAGScope(config)`

Creates a new SDK instance.

### `.capture(payload)`

Buffers a RAG interaction. Non-blocking, returns `void`.

### `.flush()`

Sends buffered captures to the backend. Returns a Promise.

### `.close()`

Flushes remaining captures and stops the interval timer. Call this on process shutdown.
