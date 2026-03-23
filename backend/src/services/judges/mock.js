// Deterministic hash for reproducible scores from test case content
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function deterministicScore(text, seed) {
  const h = simpleHash(text + seed);
  return 0.55 + (h % 4000) / 10000; // 0.55–0.95
}

function randomDelay(min, max) {
  return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

const FAITHFULNESS_REASONS = {
  high: "The response is well-supported by the provided context. All key claims can be traced back to the retrieval passages with strong alignment between the answer and source material.",
  medium: "The response is partially supported by context. Some claims are directly grounded in the passages, but a few statements extend beyond what the sources explicitly state.",
  low: "The response contains significant claims that cannot be verified against the provided context. Several assertions appear to be fabricated or drawn from external knowledge not present in the retrieval passages.",
};

const GROUNDEDNESS_REASONS = {
  high: "The response demonstrates strong grounding in the source material. Claims are directly attributable to the provided context passages with accurate representation of the source information.",
  medium: "The response shows moderate grounding. While the core answer is supported by context, some details are inferred rather than directly stated in the source passages.",
  low: "The response lacks adequate grounding in the provided context. Multiple claims are either unsupported or contradict the information available in the retrieval passages.",
};

const RELEVANCY_REASONS = {
  high: "The retrieved context is highly relevant to the query. All passages contain information directly applicable to answering the question, with minimal noise or off-topic content.",
  medium: "The retrieved context is moderately relevant. Some passages directly address the query while others provide tangential information that doesn't fully support the answer.",
  low: "The retrieved context has limited relevance to the query. The passages contain mostly tangential information, and the key details needed to answer the question are largely absent.",
};

function getReasonBucket(score) {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function computeTokens(text) {
  const inputTokens = Math.floor(text.length / 4) + 150;
  const outputTokens = 150 + simpleHash(text) % 200;
  return { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens };
}

export async function mockFaithfulness(testCase) {
  const startTime = Date.now();
  await randomDelay(800, 2200);

  const text = testCase.input + testCase.actualOutput;
  const score = Math.round(deterministicScore(text, 'faithfulness') * 100) / 100;
  const tokens = computeTokens(text);
  const cost = Math.round(((tokens.input / 1000) * 0.00015 + (tokens.output / 1000) * 0.0006) * 1000000) / 1000000;

  return {
    judge: 'openai',
    metric: 'faithfulness',
    model: 'gpt-4o-mini',
    score,
    reason: FAITHFULNESS_REASONS[getReasonBucket(score)],
    details: { claimsVerified: Math.round(score * 8), totalClaims: 8 },
    tokens,
    cost,
    latency: Date.now() - startTime,
  };
}

export async function mockGroundedness(testCase) {
  const startTime = Date.now();
  await randomDelay(1200, 3000);

  const text = testCase.input + testCase.actualOutput;
  const score = Math.round(deterministicScore(text, 'groundedness') * 100) / 100;
  const tokens = computeTokens(text);
  const cost = Math.round(((tokens.input / 1000) * 0.00025 + (tokens.output / 1000) * 0.00125) * 1000000) / 1000000;

  return {
    judge: 'anthropic',
    metric: 'groundedness',
    model: 'claude-3-haiku-20240307',
    score,
    reason: GROUNDEDNESS_REASONS[getReasonBucket(score)],
    details: { groundedStatements: Math.round(score * 6), totalStatements: 6 },
    tokens,
    cost,
    latency: Date.now() - startTime,
  };
}

export async function mockContextRelevancy(testCase) {
  const startTime = Date.now();
  await randomDelay(600, 1800);

  const text = testCase.input + testCase.actualOutput;
  const score = Math.round(deterministicScore(text, 'contextRelevancy') * 100) / 100;
  const tokens = computeTokens(text);
  const cost = Math.round(((tokens.input / 1000) * 0.0001 + (tokens.output / 1000) * 0.0004) * 1000000) / 1000000;

  return {
    judge: 'gemini',
    metric: 'contextRelevancy',
    model: 'gemini-2.5-flash',
    score,
    reason: RELEVANCY_REASONS[getReasonBucket(score)],
    details: { relevantPassages: Math.round(score * (testCase.retrievalContext?.length || 3)), totalPassages: testCase.retrievalContext?.length || 3 },
    tokens,
    cost,
    latency: Date.now() - startTime,
  };
}

export async function mockAggregate(testCase, judgeResults) {
  const startTime = Date.now();
  await randomDelay(1500, 4000);

  const scores = [];
  const judges = [];
  for (const [name, result] of Object.entries(judgeResults)) {
    if (result?.score !== null && result?.score !== undefined) {
      scores.push(result.score);
      judges.push({ name, score: result.score, metric: result.metric });
    }
  }

  const finalScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
    : 0;

  const verdict = finalScore >= 0.7 ? 'PASS' : finalScore >= 0.4 ? 'WARN' : 'FAIL';

  const scoreRange = Math.max(...scores) - Math.min(...scores);
  const agreement = scoreRange < 0.15 ? 'strong agreement' : scoreRange < 0.3 ? 'moderate agreement' : 'notable disagreement';
  const disagreements = scoreRange >= 0.15
    ? [`Score spread of ${scoreRange.toFixed(2)} across judges indicates ${agreement}`]
    : [];

  const text = testCase.input;
  const tokens = computeTokens(text);
  const cost = Math.round(((tokens.input / 1000) * 0.003 + (tokens.output / 1000) * 0.015) * 1000000) / 1000000;

  const judgeBreakdown = judges.map(j => `${j.metric}: ${j.score}`).join(', ');

  return {
    model: 'claude-sonnet-4-20250514',
    finalScore,
    verdict,
    synthesis: `Council evaluation with ${agreement} (${judgeBreakdown}). The response ${verdict === 'PASS' ? 'meets quality thresholds across all metrics' : verdict === 'WARN' ? 'shows areas for improvement in some metrics' : 'falls below acceptable quality thresholds'}.`,
    disagreements,
    recommendation: verdict === 'PASS'
      ? 'Response quality is satisfactory across all evaluated dimensions.'
      : `Review areas scoring below threshold. Focus on improving ${judges.filter(j => j.score < 0.7).map(j => j.metric).join(', ') || 'overall quality'}.`,
    tokens,
    cost,
    latency: Date.now() - startTime,
  };
}
