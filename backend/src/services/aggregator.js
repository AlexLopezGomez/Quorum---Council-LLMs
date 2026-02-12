import Anthropic from '@anthropic-ai/sdk';
import { AGGREGATOR_PROMPT, formatPrompt } from '../utils/prompts.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const INPUT_COST_PER_1K = 0.003;
const OUTPUT_COST_PER_1K = 0.015;

export async function aggregateResults(testCase, judgeResults) {
  const startTime = Date.now();

  const formatJudgeResult = (result) => {
    if (!result || result.error) {
      return `Error: ${result?.error || 'Judge failed'}`;
    }
    return JSON.stringify(
      {
        score: result.score,
        reason: result.reason,
        details: result.details,
      },
      null,
      2
    );
  };

  const prompt = formatPrompt(AGGREGATOR_PROMPT, {
    faithfulnessResult: formatJudgeResult(judgeResults.openai),
    groundednessResult: formatJudgeResult(judgeResults.anthropic),
    contextRelevancyResult: formatJudgeResult(judgeResults.gemini),
    input: testCase.input,
    actualOutput: testCase.actualOutput,
    expectedOutput: testCase.expectedOutput || 'Not provided',
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    system: 'You are an expert RAG evaluation aggregator. Synthesize judge verdicts into a final assessment. Always respond with valid JSON only.',
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
    throw new Error(`Failed to parse aggregator response: ${content}`);
  }

  return {
    model: MODEL,
    finalScore: parsed.finalScore,
    verdict: parsed.verdict,
    synthesis: parsed.synthesis,
    disagreements: parsed.disagreements || [],
    recommendation: parsed.recommendation,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
    cost: Math.round(cost * 1000000) / 1000000,
    latency,
  };
}
