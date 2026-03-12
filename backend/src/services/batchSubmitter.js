import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { FAITHFULNESS_PROMPT, GROUNDEDNESS_PROMPT, CONTEXT_RELEVANCY_PROMPT, formatPrompt } from '../utils/prompts.js';

const OPENAI_MODEL = 'gpt-4o-mini';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const GEMINI_MODEL = 'gemini-2.5-flash';

function buildPromptVars(tc) {
  return {
    input: tc.input,
    actualOutput: tc.actualOutput,
    retrievalContext: Array.isArray(tc.retrievalContext)
      ? tc.retrievalContext.join('\n\n')
      : tc.retrievalContext,
  };
}

export function buildOpenAIBatchLines(cases) {
  return cases.map(tc => {
    const vars = buildPromptVars(tc);
    return JSON.stringify({
      custom_id: `${tc.id}::faithfulness`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: OPENAI_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'You are an expert RAG evaluator. You must respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: formatPrompt(FAITHFULNESS_PROMPT, vars),
          },
        ],
      },
    });
  }).join('\n');
}

export function buildAnthropicBatchRequests(cases) {
  return cases.map(tc => {
    const vars = buildPromptVars(tc);
    return {
      custom_id: `${tc.id}::groundedness`,
      params: {
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: 'You are an expert RAG evaluator. You must respond ONLY with valid JSON.',
        messages: [
          {
            role: 'user',
            content: formatPrompt(GROUNDEDNESS_PROMPT, vars),
          },
        ],
      },
    };
  });
}

export function buildGeminiBatchLines(cases) {
  // Gemini batch API uses same JSONL format as OpenAI but different endpoint
  return cases.map(tc => {
    const vars = buildPromptVars(tc);
    return JSON.stringify({
      custom_id: `${tc.id}::context_relevancy`,
      method: 'POST',
      url: `/v1beta/models/${GEMINI_MODEL}:generateContent`,
      body: {
        contents: [
          {
            role: 'user',
            parts: [{ text: formatPrompt(CONTEXT_RELEVANCY_PROMPT, vars) }],
          },
        ],
        systemInstruction: {
          parts: [{ text: 'You are an expert RAG evaluator. You must respond ONLY with valid JSON.' }],
        },
        generationConfig: { maxOutputTokens: 1024 },
      },
    });
  }).join('\n');
}

export async function submitOpenAIBatch(cases) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const jsonlContent = buildOpenAIBatchLines(cases);

  const file = await client.files.create({
    file: new File([jsonlContent], 'batch_input.jsonl', { type: 'application/jsonl' }),
    purpose: 'batch',
  });

  const batch = await client.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
    metadata: { source: 'quorum-benchmark' },
  });

  return batch.id;
}

export async function submitAnthropicBatch(cases) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const requests = buildAnthropicBatchRequests(cases);

  const batch = await client.beta.messages.batches.create({ requests });
  return batch.id;
}

export async function submitAll(cases) {
  const [openaiId, anthropicId] = await Promise.all([
    submitOpenAIBatch(cases),
    submitAnthropicBatch(cases),
  ]);

  return { openaiId, anthropicId, geminiId: null };
}
