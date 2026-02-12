function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}

function extractEntities(text) {
  const words = text.split(/\s+/);
  const entities = new Set();
  for (const word of words) {
    if (word.length > 1 && /^[A-Z]/.test(word) && !/^(The|A|An|In|On|At|For|And|But|Or|Is|It|This|That|With|From|By|To|Of|As)$/.test(word)) {
      entities.add(word.toLowerCase());
    }
  }
  return entities;
}

function checkEntityMatch(testCase) {
  const queryEntities = extractEntities(testCase.input);
  const contextText = (testCase.retrievalContext || []).join(' ');
  const contextEntities = extractEntities(contextText);
  const outputEntities = extractEntities(testCase.actualOutput);

  if (outputEntities.size === 0) return { score: 0.5, detail: 'no_entities_in_output' };

  let matchedInContext = 0;
  for (const entity of outputEntities) {
    if (contextEntities.has(entity) || queryEntities.has(entity)) {
      matchedInContext++;
    }
  }

  const score = matchedInContext / outputEntities.size;
  return {
    score: Math.round(score * 100) / 100,
    detail: `${matchedInContext}/${outputEntities.size} output entities found in context/query`,
  };
}

function checkFreshness(testCase) {
  const currentYear = new Date().getFullYear();
  const contextText = (testCase.retrievalContext || []).join(' ');
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const contextYears = (contextText.match(yearPattern) || []).map(Number);

  if (contextYears.length === 0) return { score: 0.7, detail: 'no_year_references' };

  const maxYear = Math.max(...contextYears);
  const age = currentYear - maxYear;

  let score;
  if (age <= 1) {
    score = 1.0;
  } else if (age <= 3) {
    score = 0.8;
  } else if (age <= 5) {
    score = 0.6;
  } else {
    score = 0.3;
  }

  return {
    score,
    detail: `most_recent_year: ${maxYear}, age: ${age}yr`,
  };
}

function checkContextOverlap(testCase) {
  const outputTokens = new Set(tokenize(testCase.actualOutput));
  const contextTokens = new Set(tokenize((testCase.retrievalContext || []).join(' ')));

  if (outputTokens.size === 0 || contextTokens.size === 0) {
    return { score: 0, detail: 'empty_tokens' };
  }

  // Jaccard similarity
  let intersection = 0;
  for (const token of outputTokens) {
    if (contextTokens.has(token)) intersection++;
  }

  const union = new Set([...outputTokens, ...contextTokens]).size;
  const score = union > 0 ? intersection / union : 0;

  return {
    score: Math.round(score * 100) / 100,
    detail: `jaccard: ${intersection} shared / ${union} total tokens`,
  };
}

function checkCompleteness(testCase) {
  const stopWords = new Set(['what', 'is', 'the', 'a', 'an', 'how', 'does', 'do', 'are', 'was', 'were', 'of', 'in', 'to', 'and', 'for', 'can', 'you', 'explain', 'describe', 'tell', 'me', 'about', 'why']);
  const queryTokens = tokenize(testCase.input).filter(t => !stopWords.has(t));
  const outputTokensSet = new Set(tokenize(testCase.actualOutput));

  if (queryTokens.length === 0) return { score: 1.0, detail: 'no_query_terms' };

  let addressed = 0;
  for (const token of queryTokens) {
    if (outputTokensSet.has(token)) addressed++;
  }

  const score = addressed / queryTokens.length;
  return {
    score: Math.round(score * 100) / 100,
    detail: `${addressed}/${queryTokens.length} query terms in output`,
  };
}

export function runDeterministicChecks(testCase) {
  const startTime = Date.now();

  const results = {
    entityMatch: checkEntityMatch(testCase),
    freshness: checkFreshness(testCase),
    contextOverlap: checkContextOverlap(testCase),
    completeness: checkCompleteness(testCase),
  };

  const scores = Object.values(results).map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  return {
    checks: results,
    avgScore: Math.round(avgScore * 100) / 100,
    latency: Date.now() - startTime,
  };
}
