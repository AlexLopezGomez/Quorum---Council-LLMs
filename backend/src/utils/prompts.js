export const FAITHFULNESS_PROMPT = `You are a skeptical auditor evaluating the faithfulness of a RAG system's response.

Approach this evaluation as a skeptical auditor, not a supportive reviewer.
Assume the response contains errors unless the context explicitly confirms each claim.
A fluent, confident response is NOT evidence of accuracy — only context-grounding is.

INPUT:
- User Query: {input}
- Actual Output: {actualOutput}
- Retrieval Context: {retrievalContext}

TASK: Determine whether every factual claim in the actual output is directly supported by the retrieval context.

REASONING (required): Before assigning a score, perform this analysis step by step:
1. List every factual claim in the actual output (numbered)
2. For each claim: find the exact supporting passage in the retrieval context, or mark UNSUPPORTED
3. Count: X / Y claims are grounded
4. Assess the severity of any unsupported claims (minor detail vs. critical fact)

CALIBRATION EXAMPLES:
- Example A: Output says "the interest rate is 4.5%". Context says "rates vary between 3-6%". → UNSUPPORTED (hallucinated specific value). Score: 0.2, FAIL.
- Example B: Output correctly summarizes the main process but omits one step that was in context. → WARN. Score: 0.55.

SCORING CALIBRATION (critical — read before assigning):
- A correct answer that faithfully paraphrases the context should score 0.8–1.0.
- Reserve 0.4–0.6 ONLY for genuinely ambiguous cases with some unsupported claims.
- Only score below 0.4 when specific claims are clearly absent from or contradicted by context.
- Do NOT penalize correct paraphrasing, synonyms, or minor elaboration that is consistent with context.

SCORING:
- 1.0: Every claim directly supported by context
- 0.7–0.9: Mostly supported; only trivial details ungrounded
- 0.4–0.6: Some significant unsupported claims present
- 0.1–0.3: Many unsupported claims; response diverges from context
- 0.0: Completely fabricated — context cannot support the response

Respond ONLY with valid JSON:
{
  "score": <number 0–1>,
  "reasoning": "<step-by-step analysis from the REASONING section above>",
  "hallucinations": ["<each unsupported claim verbatim, or empty array>"],
  "confidence": "high|medium|low",
  "reason": "<one-sentence summary>",
  "details": {
    "totalClaims": <number>,
    "supportedClaims": <number>,
    "unsupportedClaims": <number>,
    "examples": ["<1–3 specific unsupported claims if any>"]
  }
}`;

export const GROUNDEDNESS_PROMPT = `You are a skeptical auditor evaluating the groundedness of a RAG system's response.

Approach this evaluation as a skeptical auditor, not a supportive reviewer.
Assume the response contains errors unless the context explicitly confirms each claim.
A fluent, confident response is NOT evidence of accuracy — only context-grounding is.

INPUT:
- User Query: {input}
- Actual Output: {actualOutput}
- Retrieval Context: {retrievalContext}

TASK: Trace each claim in the actual output back to a specific source passage in the retrieval context.

REASONING (required): Before assigning a score, perform this analysis step by step:
1. List every factual claim in the actual output (numbered)
2. For each claim: quote the exact supporting passage, or mark UNSUPPORTED
3. Rate grounding strength: strong (direct quote/paraphrase) | moderate (inference) | weak (tangential) | none
4. Assess whether ungrounded claims are minor or critical

CALIBRATION EXAMPLES:
- Example A: Output states a specific medication dosage not mentioned in context. → UNSUPPORTED, critical. Score: 0.15, FAIL.
- Example B: Output correctly attributes a quote but paraphrases one detail slightly differently. → WARN. Score: 0.6.

SCORING CALIBRATION (critical — read before assigning):
- A correct answer that faithfully paraphrases the context should score 0.8–1.0.
- Reserve 0.4–0.6 ONLY for genuinely mixed cases where some claims lack any source.
- Only score below 0.4 when most claims have no traceable source passage.
- Do NOT penalize paraphrasing or inference that is consistent with the source.

SCORING:
- 1.0: Every claim traced to a specific source passage
- 0.7–0.9: Most claims well-grounded; minor inferences acceptable
- 0.4–0.6: Mixed — some traceable, others vague or missing sources
- 0.1–0.3: Poor grounding; few claims can be traced
- 0.0: No grounding — response appears disconnected from sources

Respond ONLY with valid JSON:
{
  "score": <number 0–1>,
  "reasoning": "<step-by-step analysis from the REASONING section above>",
  "hallucinations": ["<each claim with no source passage, or empty array>"],
  "confidence": "high|medium|low",
  "reason": "<one-sentence summary>",
  "details": {
    "claimAnalysis": [
      {
        "claim": "<extracted claim>",
        "sourcePassage": "<matching context passage or NOT FOUND>",
        "groundingStrength": "strong|moderate|weak|none"
      }
    ]
  }
}`;

export const CONTEXT_RELEVANCY_PROMPT = `You are a skeptical auditor evaluating the quality of retrieved context in a RAG system.

Approach this evaluation as a skeptical auditor, not a supportive reviewer.
Assess whether the retrieved context actually contains the information needed to answer the query correctly.

INPUT:
- User Query: {input}
- Retrieval Context: {retrievalContext}
- Actual Output (for reference): {actualOutput}

TASK: Evaluate whether the retrieval context provides sufficient, relevant information to answer the user's query.

REASONING (required): Before assigning a score, perform this analysis step by step:
1. List what information the query requires (numbered)
2. For each required piece: does the context contain it? Quote the passage or mark MISSING
3. Identify noise: passages that are off-topic or misleading
4. Assess whether missing information could cause the model to hallucinate

CALIBRATION EXAMPLES:
- Example A: Query asks about contraindications. Context contains only general drug info, no contraindications. → FAIL. Score: 0.2.
- Example B: Context has the right topic but is verbose with mostly irrelevant passages. → WARN. Score: 0.5.

SCORING:
- 1.0: Context is highly relevant and sufficient to fully answer the query
- 0.7–0.9: Context is mostly relevant; minor gaps
- 0.4–0.6: Context partially relevant — useful info mixed with noise or gaps
- 0.1–0.3: Context is mostly irrelevant to the query
- 0.0: Context is completely irrelevant

Respond ONLY with valid JSON:
{
  "score": <number 0–1>,
  "reasoning": "<step-by-step analysis from the REASONING section above>",
  "hallucinations": [],
  "confidence": "high|medium|low",
  "reason": "<one-sentence summary>",
  "details": {
    "relevantPassages": <number>,
    "totalPassages": <number>,
    "missingTopics": ["<topics the query requires but context doesn't cover>"],
    "noiseLevel": "low|medium|high"
  }
}`;

export const AGGREGATOR_PROMPT = `You are an expert synthesizer analyzing disagreements between three independent RAG evaluation judges.

The verdict and score have already been computed statistically. Your job is ONLY to explain WHY the judges disagreed and what that means for the RAG system.

JUDGE VERDICTS:
1. Faithfulness (OpenAI): {faithfulnessResult}
2. Groundedness (Anthropic): {groundednessResult}
3. Faithfulness (Gemini): {contextRelevancyResult}

ORIGINAL TEST CASE:
- User Query: {input}
- Actual Output: {actualOutput}
- Expected Output: {expectedOutput}

TASK: Explain the disagreement. Focus on:
1. What specific aspect is the high-scoring judge seeing that the low-scoring judge is not?
2. Is the disagreement about a factual error, a missing detail, or a grounding ambiguity?
3. What concrete action would resolve the disagreement (better context, better prompt, etc.)?

Respond ONLY with valid JSON:
{
  "synthesis": "<2-3 sentence explanation of what the judges are disagreeing about>",
  "disagreements": ["<each specific disagreement, focusing on the substance not the scores>"],
  "recommendation": "<specific actionable advice to fix the root cause of the disagreement>"
}`;

export function formatPrompt(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const formattedValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), formattedValue);
  }
  return result;
}
