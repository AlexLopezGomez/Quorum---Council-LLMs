import { RAGScope } from '@ragscope/sdk';

const ragscope = new RAGScope({
  endpoint: 'http://localhost:3000',
  defaultStrategy: 'auto',
});

ragscope.capture({
  input: 'What is the capital of France?',
  actualOutput: 'The capital of France is Paris.',
  retrievalContext: ['Paris is the capital and largest city of France.'],
});

await ragscope.close();
