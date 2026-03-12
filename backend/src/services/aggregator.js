import Anthropic from '@anthropic-ai/sdk';
import { AGGREGATOR_PROMPT, formatPrompt } from '../utils/prompts.js';

const SYNTHESIS_MODEL = 'claude-sonnet-4-20250514';
const INPUT_COST_PER_1K = 0.003;
const OUTPUT_COST_PER_1K = 0.015;

function scoreToVerdict(score) {
  if (score >= 0.7) return 'PASS';
  if (score >= 0.4) return 'WARN';
  return 'FAIL';
}

function collectJudgeData(judgeResults) {
  const judges = [];
  for (const name of ['openai', 'anthropic', 'gemini']) {
    const j = judgeResults[name];
    if (j?.score != null) {
      judges.push({
        name,
        score: j.score,
        confidence: j.confidence,
        reason: j.reason || j.reasoning,
        metric: j.metric,
      });
    }
  }
  return judges;
}

// Statistical aggregation — replaces LLM-based deliberation
// Literature: PoLL (Cohere 2024), CARE (UW-Madison 2026)
function statisticalAggregate(judges) {
  if (judges.length === 0) return null;

  const scores = judges.map(j => j.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Individual verdicts via score thresholds
  const verdicts = scores.map(scoreToVerdict);
  const passCt = verdicts.filter(v => v === 'PASS').length;
  const failCt = verdicts.filter(v => v === 'FAIL').length;
  const majority = Math.ceil(judges.length / 2);

  // Majority vote
  let verdict;
  if (failCt >= majority) {
    verdict = 'FAIL';
  } else if (passCt >= majority) {
    // Safety floor: strong failure signal from any judge caps at WARN
    const hasStrongFail = scores.some(s => s < 0.25);
    verdict = hasStrongFail ? 'WARN' : 'PASS';
  } else {
    verdict = 'WARN';
  }

  // Disagreement detection
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const range = maxScore - minScore;

  return { avgScore, verdict, verdicts, range };
}

function buildSynthesis(judges, stats) {
  const { avgScore, verdict, range } = stats;
  const judgeList = judges.map(j => `${j.name} (${j.metric}): ${j.score.toFixed(2)}`).join(', ');
  const rangeNote = range > 0.3 ? ` Notable judge disagreement (range: ${range.toFixed(2)}).` : '';
  return `Statistical aggregation of ${judges.length} judges. Scores: ${judgeList}. Average: ${avgScore.toFixed(2)}.${rangeNote}`;
}

function buildDisagreements(judges, range) {
  if (range <= 0.3) return [];
  const sorted = [...judges].sort((a, b) => b.score - a.score);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  return [
    `${highest.name} scored ${highest.score.toFixed(2)} (${highest.metric}) while ${lowest.name} scored ${lowest.score.toFixed(2)} (${lowest.metric}) — range ${range.toFixed(2)}`
  ];
}

function buildRecommendation(verdict, judges, range) {
  if (verdict === 'PASS') {
    return 'Response meets quality standards across judge perspectives.';
  }
  if (verdict === 'FAIL') {
    const failJudges = judges.filter(j => j.score < 0.4);
    const names = failJudges.map(j => j.name).join(', ');
    return `Response flagged by ${names}. Review individual judge analyses for specific concerns.`;
  }
  if (range > 0.3) {
    return 'Judges disagree on this response. Review individual analyses to understand where quality diverges.';
  }
  return 'Response shows mixed signals. Review individual judge analyses for areas to improve.';
}

// Default: statistical aggregation (no LLM call, ~0ms, $0)
export async function aggregateResults(testCase, judgeResults, apiKey) {
  const startTime = Date.now();
  const judges = collectJudgeData(judgeResults);

  if (judges.length === 0) {
    throw new Error('No successful judge evaluations to aggregate');
  }

  const stats = statisticalAggregate(judges);
  const finalScore = Math.round(stats.avgScore * 1000000) / 1000000;

  return {
    model: 'statistical-v1',
    finalScore,
    verdict: stats.verdict,
    synthesis: buildSynthesis(judges, stats),
    disagreements: buildDisagreements(judges, stats.range),
    recommendation: buildRecommendation(stats.verdict, judges, stats.range),
    tokens: { input: 0, output: 0, total: 0 },
    cost: 0,
    latency: Date.now() - startTime,
  };
}

// Optional: LLM-enhanced synthesis for explainability (adds ~$0.005 + ~5s)
// Uses statistical verdict/score but adds rich Sonnet-generated narrative
export async function aggregateResultsWithSynthesis(testCase, judgeResults, apiKey) {
  const judges = collectJudgeData(judgeResults);
  if (judges.length === 0) {
    throw new Error('No successful judge evaluations to aggregate');
  }

  const stats = statisticalAggregate(judges);
  const finalScore = Math.round(stats.avgScore * 1000000) / 1000000;

  // Only call Sonnet when judges disagree significantly
  if (stats.range <= 0.3) {
    return {
      model: 'statistical-v1',
      finalScore,
      verdict: stats.verdict,
      synthesis: buildSynthesis(judges, stats),
      disagreements: [],
      recommendation: buildRecommendation(stats.verdict, judges, stats.range),
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      latency: 0,
    };
  }

  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const startTime = Date.now();

  const formatJudgeResult = (result) => {
    if (!result || result.error) return `Error: ${result?.error || 'Judge failed'}`;
    return JSON.stringify(
      { score: result.score, reasoning: result.reasoning, hallucinations: result.hallucinations, confidence: result.confidence, reason: result.reason, details: result.details },
      null, 2
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

  const response = await client.messages.create({
    model: SYNTHESIS_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    system: 'You are an expert RAG evaluation aggregator. Analyze the judge disagreements and provide actionable synthesis. Always respond with valid JSON only.',
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
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback to template synthesis if LLM fails
    return {
      model: 'statistical-v1',
      finalScore,
      verdict: stats.verdict,
      synthesis: buildSynthesis(judges, stats),
      disagreements: buildDisagreements(judges, stats.range),
      recommendation: buildRecommendation(stats.verdict, judges, stats.range),
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      latency: 0,
    };
  }

  // Verdict and score always come from statistical method — Sonnet provides text only
  return {
    model: 'statistical-v1+synthesis',
    finalScore,
    verdict: stats.verdict,
    synthesis: parsed.synthesis || buildSynthesis(judges, stats),
    disagreements: parsed.disagreements || buildDisagreements(judges, stats.range),
    recommendation: parsed.recommendation || buildRecommendation(stats.verdict, judges, stats.range),
    tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
    cost: Math.round(cost * 1000000) / 1000000,
    latency,
  };
}
