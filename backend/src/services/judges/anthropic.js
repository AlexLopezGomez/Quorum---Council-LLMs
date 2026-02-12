import Anthropic from '@anthropic-ai/sdk';
import { GROUNDEDNESS_PROMPT, formatPrompt } from '../../utils/prompts.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-3-haiku-20240307';
const INPUT_COST_PER_1K = 0.00025;
const OUTPUT_COST_PER_1K = 0.00125;

export async function evaluateGroundedness(testCase) {
  const startTime = Date.now();

  const prompt = formatPrompt(GROUNDEDNESS_PROMPT, {
    input: testCase.input,
    actualOutput: testCase.actualOutput,
    retrievalContext: testCase.retrievalContext,
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    system: 'You are an expert RAG evaluator. Always respond with valid JSON only, no additional text.',
  });

  const latency = Date.now() - startTime;
  const content = response.content[0].text;
  const usage = response.usage;

  const inputTokens = usage?.input_tokens || 0;
  const outputTokens = usage?.output_tokens || 0;
  const cost = (inputTokens / 1000) * INPUT_COST_PER_1K + (outputTokens / 1000) * OUTPUT_COST_PER_1K;

  let parsed;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse Anthropic response: ${content}`);
  }

  return {
    judge: 'anthropic',
    metric: 'groundedness',
    model: MODEL,
    score: parsed.score,
    reason: parsed.reason,
    details: parsed.details,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
    cost: Math.round(cost * 1000000) / 1000000,
    latency,
  };
}
