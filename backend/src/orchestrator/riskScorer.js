const HIGH_RISK_KEYWORDS = [
  'medical', 'diagnosis', 'treatment', 'prescription', 'dosage', 'symptom',
  'legal', 'lawsuit', 'regulation', 'compliance', 'liability', 'contract',
  'financial', 'investment', 'tax', 'audit', 'fiduciary', 'securities',
  'safety', 'hazard', 'emergency', 'toxic', 'lethal', 'warning',
  'classified', 'confidential', 'hipaa', 'gdpr', 'pii',
];

const LOW_RISK_KEYWORDS = [
  'what is', 'define', 'who is', 'capital of', 'when was', 'where is',
  'how many', 'list of', 'name of', 'color of', 'meaning of',
];

const NEGATION_PATTERNS = [
  /\bnot\b/i, /\bnever\b/i, /\bno\b/i, /\bwithout\b/i,
  /\bexcept\b/i, /\bhowever\b/i, /\bbut\b/i, /\balthough\b/i,
];

const NUMBER_PATTERN = /\b\d+\.?\d*\s*(%|percent|million|billion|thousand|mg|ml|kg|lb|USD|\$|EUR)\b/i;

export function scoreRisk(testCase) {
  const factors = [];
  let score = 0.5;

  const allText = `${testCase.input} ${testCase.actualOutput} ${testCase.expectedOutput || ''}`.toLowerCase();
  const contextText = (testCase.retrievalContext || []).join(' ').toLowerCase();

  // High-risk keyword detection
  const highRiskMatches = HIGH_RISK_KEYWORDS.filter(kw => allText.includes(kw) || contextText.includes(kw));
  if (highRiskMatches.length > 0) {
    score += Math.min(highRiskMatches.length * 0.1, 0.3);
    factors.push(`high_risk_keywords: ${highRiskMatches.join(', ')}`);
  }

  // Low-risk keyword detection
  const lowRiskMatches = LOW_RISK_KEYWORDS.filter(kw => testCase.input.toLowerCase().includes(kw));
  if (lowRiskMatches.length > 0) {
    score -= Math.min(lowRiskMatches.length * 0.15, 0.3);
    factors.push(`low_risk_keywords: ${lowRiskMatches.join(', ')}`);
  }

  // ExpectedOutput presence — enables comparison, reduces risk
  if (testCase.expectedOutput) {
    score -= 0.05;
    factors.push('has_expected_output');
  }

  // Context count — more context = more to verify = higher risk
  const contextCount = testCase.retrievalContext?.length || 0;
  if (contextCount >= 5) {
    score += 0.1;
    factors.push(`high_context_count: ${contextCount}`);
  } else if (contextCount <= 1) {
    score -= 0.05;
    factors.push(`low_context_count: ${contextCount}`);
  }

  // Long output — more claims to verify
  if (testCase.actualOutput.length > 500) {
    score += 0.1;
    factors.push('long_output');
  } else if (testCase.actualOutput.length < 100) {
    score -= 0.05;
    factors.push('short_output');
  }

  // Numerical claims — harder to verify, higher risk
  const numericalMatches = testCase.actualOutput.match(NUMBER_PATTERN);
  if (numericalMatches) {
    score += 0.1;
    factors.push('numerical_claims');
  }

  // Negation patterns — nuanced logic, higher risk
  const negationCount = NEGATION_PATTERNS.filter(p => p.test(testCase.actualOutput)).length;
  if (negationCount >= 2) {
    score += 0.1;
    factors.push(`negation_patterns: ${negationCount}`);
  }

  const riskScore = Math.max(0, Math.min(1, Math.round(score * 100) / 100));

  return { riskScore, factors };
}
