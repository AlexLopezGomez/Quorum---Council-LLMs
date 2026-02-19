import { Quorum } from '@quorum/sdk';

const quorum = new Quorum({
  endpoint: 'http://localhost:3000',
  defaultStrategy: 'auto',
});

quorum.capture({
  input: 'What is the capital of France?',
  actualOutput: 'The capital of France is Paris.',
  retrievalContext: ['Paris is the capital and largest city of France.'],
});

await quorum.close();
