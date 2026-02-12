export const FAITHFULNESS_PROMPT = `You are an expert evaluator assessing the faithfulness of a RAG system's response.

TASK: Evaluate whether the actual output contains claims that are NOT supported by the retrieval context.

INPUT:
- User Query: {input}
- Actual Output: {actualOutput}
- Retrieval Context: {retrievalContext}

EVALUATION CRITERIA:
1. Identify all factual claims in the actual output
2. For each claim, determine if it is directly supported by the retrieval context
3. Count unsupported claims (hallucinations)

SCORING:
- 1.0: All claims are fully supported by the context
- 0.7-0.9: Minor unsupported details that don't affect the main message
- 0.4-0.6: Some significant unsupported claims
- 0.1-0.3: Many unsupported claims
- 0.0: Completely fabricated response

Respond in JSON format:
{
  "score": <number between 0 and 1>,
  "reason": "<brief explanation of the score>",
  "details": {
    "totalClaims": <number>,
    "supportedClaims": <number>,
    "unsupportedClaims": <number>,
    "examples": ["<list 1-3 specific examples of unsupported claims if any>"]
  }
}`;

export const GROUNDEDNESS_PROMPT = `You are an expert evaluator assessing the groundedness of a RAG system's response.

TASK: Trace each claim in the actual output back to specific source passages in the retrieval context.

INPUT:
- User Query: {input}
- Actual Output: {actualOutput}
- Retrieval Context: {retrievalContext}

EVALUATION CRITERIA:
1. Break down the actual output into individual claims
2. For each claim, identify the source passage(s) that support it
3. Evaluate the strength of the grounding (direct quote, paraphrase, inference)

SCORING:
- 1.0: Every claim can be traced to a specific source passage
- 0.7-0.9: Most claims are well-grounded with clear sources
- 0.4-0.6: Mixed grounding - some claims traceable, others vague
- 0.1-0.3: Poor grounding - few claims can be traced
- 0.0: No grounding - response appears unconnected to sources

Respond in JSON format:
{
  "score": <number between 0 and 1>,
  "reason": "<brief explanation of the score>",
  "details": {
    "claimAnalysis": [
      {
        "claim": "<extracted claim>",
        "sourcePassage": "<matching context passage or 'NOT FOUND'>",
        "groundingStrength": "strong|moderate|weak|none"
      }
    ]
  }
}`;

export const CONTEXT_RELEVANCY_PROMPT = `You are an expert evaluator assessing the quality of retrieved context in a RAG system.

TASK: Evaluate how relevant the retrieval context is to answering the user's query.

INPUT:
- User Query: {input}
- Retrieval Context: {retrievalContext}
- Actual Output (for reference): {actualOutput}

EVALUATION CRITERIA:
1. Does the context contain information needed to answer the query?
2. Is the context focused or does it contain excessive noise?
3. Are the most relevant passages present?

SCORING:
- 1.0: Context is highly relevant and sufficient to fully answer the query
- 0.7-0.9: Context is mostly relevant with minor irrelevant parts
- 0.4-0.6: Context is partially relevant - some useful info mixed with noise
- 0.1-0.3: Context is mostly irrelevant to the query
- 0.0: Context is completely irrelevant

Respond in JSON format:
{
  "score": <number between 0 and 1>,
  "reason": "<brief explanation of the score>",
  "details": {
    "relevantPassages": <number>,
    "totalPassages": <number>,
    "missingTopics": ["<topics the query asks about but context doesn't cover>"],
    "noiseLevel": "low|medium|high"
  }
}`;

export const AGGREGATOR_PROMPT = `You are the final arbiter synthesizing evaluations from three independent judges assessing a RAG system's output.

JUDGE VERDICTS:
1. Faithfulness (OpenAI): {faithfulnessResult}
2. Groundedness (Anthropic): {groundednessResult}
3. Context Relevancy (Gemini): {contextRelevancyResult}

ORIGINAL TEST CASE:
- User Query: {input}
- Actual Output: {actualOutput}
- Expected Output: {expectedOutput}

YOUR TASK:
1. Synthesize the three judge evaluations into a coherent assessment
2. Identify any disagreements or contradictions between judges
3. Provide a final verdict and actionable recommendation

VERDICT CRITERIA:
- PASS: Final score >= 0.7 and no critical issues
- WARN: Final score 0.4-0.7 or minor issues identified
- FAIL: Final score < 0.4 or critical issues identified

Respond in JSON format:
{
  "finalScore": <weighted average, number between 0 and 1>,
  "verdict": "PASS|WARN|FAIL",
  "synthesis": "<2-3 sentence summary of the evaluation>",
  "disagreements": ["<list any significant disagreements between judges>"],
  "recommendation": "<specific actionable advice to improve the RAG system>"
}`;

export function formatPrompt(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const formattedValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    result = result.replace(new RegExp(placeholder, 'g'), formattedValue);
  }
  return result;
}
