import { DEMO_MODE } from '../../demo/demoConfig.js';

let evaluateFaithfulness, evaluateGroundedness, evaluateContextRelevancy, aggregateResults;

if (DEMO_MODE) {
  const mock = await import('./mock.js');
  evaluateFaithfulness = mock.mockFaithfulness;
  evaluateGroundedness = mock.mockGroundedness;
  evaluateContextRelevancy = mock.mockContextRelevancy;
  aggregateResults = mock.mockAggregate;
} else {
  const openai = await import('./openai.js');
  const anthropic = await import('./anthropic.js');
  const gemini = await import('./gemini.js');
  const agg = await import('../aggregator.js');
  evaluateFaithfulness = openai.evaluateFaithfulness;
  evaluateGroundedness = anthropic.evaluateGroundedness;
  evaluateContextRelevancy = gemini.evaluateContextRelevancy;
  aggregateResults = agg.aggregateResults;
}

export { evaluateFaithfulness, evaluateGroundedness, evaluateContextRelevancy, aggregateResults };
