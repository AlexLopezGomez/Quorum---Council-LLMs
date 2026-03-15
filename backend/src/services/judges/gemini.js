import { GoogleGenAI } from '@google/genai';
import { FAITHFULNESS_PROMPT, formatPrompt } from '../../utils/prompts.js';

const MODEL = 'gemini-2.5-flash';
const INPUT_COST_PER_1K = 0.0001;
const OUTPUT_COST_PER_1K = 0.0004;

export async function evaluateContextRelevancy(testCase, apiKey) {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GOOGLE_API_KEY });
  const startTime = Date.now();

  const prompt = formatPrompt(FAITHFULNESS_PROMPT, {
    input: testCase.input,
    actualOutput: testCase.actualOutput,
    retrievalContext: Array.isArray(testCase.retrievalContext)
      ? testCase.retrievalContext.join('\n\n')
      : testCase.retrievalContext,
  });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: 'You are a skeptical expert RAG evaluator. Assume the response contains errors unless the context explicitly confirms each claim. Always respond with valid JSON only.',
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const latency = Date.now() - startTime;
  const content = response.text;
  const usageMetadata = response.usageMetadata;

  const inputTokens = usageMetadata?.promptTokenCount || 0;
  const outputTokens = usageMetadata?.candidatesTokenCount || 0;
  const cost = (inputTokens / 1000) * INPUT_COST_PER_1K + (outputTokens / 1000) * OUTPUT_COST_PER_1K;

  let parsed;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse Gemini response: ${content}`);
  }

  return {
    judge: 'gemini',
    metric: 'contextRelevancy',
    model: MODEL,
    score: parsed.score,
    reasoning: parsed.reasoning,
    hallucinations: parsed.hallucinations || [],
    confidence: parsed.confidence,
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
