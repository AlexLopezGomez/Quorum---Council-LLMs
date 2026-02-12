import OpenAI from 'openai';
import { FAITHFULNESS_PROMPT, formatPrompt } from '../../utils/prompts.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';
const INPUT_COST_PER_1K = 0.00015;
const OUTPUT_COST_PER_1K = 0.0006;

export async function evaluateFaithfulness(testCase) {
  const startTime = Date.now();

  const prompt = formatPrompt(FAITHFULNESS_PROMPT, {
    input: testCase.input,
    actualOutput: testCase.actualOutput,
    retrievalContext: testCase.retrievalContext,
  });

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert RAG evaluator. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const latency = Date.now() - startTime;
  const content = response.choices[0].message.content;
  const usage = response.usage;

  const inputTokens = usage?.prompt_tokens || 0;
  const outputTokens = usage?.completion_tokens || 0;
  const cost = (inputTokens / 1000) * INPUT_COST_PER_1K + (outputTokens / 1000) * OUTPUT_COST_PER_1K;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse OpenAI response: ${content}`);
  }

  return {
    judge: 'openai',
    metric: 'faithfulness',
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
