import { describe, it, expect } from 'vitest';
import {
  parseJsonlContent,
  extractCookie,
  chunkArray,
  isInRange,
  checkScoresAgainstRanges,
  detectBorderline,
} from '../../../tests/meta-eval/runMetaEval.js';

describe('parseJsonlContent', () => {
  it('parses valid JSONL into array of objects', () => {
    const content = '{"id":"a","val":1}\n{"id":"b","val":2}\n{"id":"c","val":3}';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'a', val: 1 });
    expect(result[2]).toEqual({ id: 'c', val: 3 });
  });

  it('skips empty and whitespace-only lines', () => {
    const content = '{"a":1}\n\n   \n{"a":2}';
    expect(parseJsonlContent(content)).toHaveLength(2);
  });

  it('strips UTF-8 BOM prefix', () => {
    const content = '\uFEFF{"a":1}\n{"a":2}';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ a: 1 });
  });

  it('throws with line number when JSON is invalid', () => {
    const content = '{"a":1}\nnot valid json\n{"a":3}';
    expect(() => parseJsonlContent(content)).toThrow('line 2');
  });

  it('parses single-line content', () => {
    const result = parseJsonlContent('{"x":42}');
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(42);
  });
});

describe('extractCookie', () => {
  it('extracts quorum_token from a single set-cookie string', () => {
    expect(extractCookie('quorum_token=abc123; Path=/; HttpOnly')).toBe('quorum_token=abc123');
  });

  it('extracts quorum_token from an array of set-cookie headers', () => {
    const headers = ['session=xyz; Path=/', 'quorum_token=tok456; HttpOnly; Secure'];
    expect(extractCookie(headers)).toBe('quorum_token=tok456');
  });

  it('returns null when header is null', () => {
    expect(extractCookie(null)).toBeNull();
  });

  it('returns null when no quorum_token cookie is present', () => {
    expect(extractCookie('session=xyz; Path=/')).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(extractCookie([])).toBeNull();
  });
});

describe('chunkArray', () => {
  it('splits array into chunks of the given size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns single chunk when array is smaller than chunk size', () => {
    expect(chunkArray([1, 2], 10)).toEqual([[1, 2]]);
  });

  it('returns empty array for empty input', () => {
    expect(chunkArray([], 10)).toEqual([]);
  });

  it('returns chunks of exactly chunk size when array divides evenly', () => {
    const chunks = chunkArray([1, 2, 3, 4, 5, 6], 3);
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6]]);
  });
});

describe('isInRange', () => {
  it('returns true when score is between min and max', () => {
    expect(isInRange(0.7, { min: 0.5, max: 0.9 })).toBe(true);
  });

  it('returns true at exact min boundary', () => {
    expect(isInRange(0.5, { min: 0.5 })).toBe(true);
  });

  it('returns true at exact max boundary', () => {
    expect(isInRange(0.9, { max: 0.9 })).toBe(true);
  });

  it('returns false when score is below min', () => {
    expect(isInRange(0.4, { min: 0.5 })).toBe(false);
  });

  it('returns false when score is above max', () => {
    expect(isInRange(0.6, { max: 0.5 })).toBe(false);
  });

  it('returns false for null score', () => {
    expect(isInRange(null, { min: 0.5 })).toBe(false);
  });

  it('returns false for undefined score', () => {
    expect(isInRange(undefined, { min: 0.5 })).toBe(false);
  });

  it('returns true for min-only range when score exceeds min', () => {
    expect(isInRange(0.95, { min: 0.8 })).toBe(true);
  });

  it('returns true for max-only range when score is below max', () => {
    expect(isInRange(0.3, { max: 0.5 })).toBe(true);
  });
});

describe('checkScoresAgainstRanges', () => {
  const goldenCase = {
    metadata: {
      expectedScoreRange: {
        faithfulness: { min: 0.85 },
        groundedness: { min: 0.80 },
      },
    },
  };

  it('returns allInRange true when all scores meet expectations', () => {
    const result = { judges: { openai: { score: 0.9 }, anthropic: { score: 0.85 } } };
    const { allInRange, checks } = checkScoresAgainstRanges(result, goldenCase);
    expect(allInRange).toBe(true);
    expect(checks.faithfulness.inRange).toBe(true);
    expect(checks.groundedness.inRange).toBe(true);
  });

  it('returns allInRange false when any score is out of range', () => {
    const result = { judges: { openai: { score: 0.5 }, anthropic: { score: 0.9 } } };
    const { allInRange, checks } = checkScoresAgainstRanges(result, goldenCase);
    expect(allInRange).toBe(false);
    expect(checks.faithfulness.inRange).toBe(false);
    expect(checks.groundedness.inRange).toBe(true);
  });

  it('marks missing judge scores as out of range', () => {
    const result = { judges: {} };
    const { allInRange } = checkScoresAgainstRanges(result, goldenCase);
    expect(allInRange).toBe(false);
  });

  it('maps contextRelevancy from gemini judge', () => {
    const golden = { metadata: { expectedScoreRange: { contextRelevancy: { min: 0.8 } } } };
    const result = { judges: { gemini: { score: 0.85 } } };
    const { checks } = checkScoresAgainstRanges(result, golden);
    expect(checks.contextRelevancy.score).toBe(0.85);
    expect(checks.contextRelevancy.inRange).toBe(true);
  });

  it('maps finalScore from aggregator', () => {
    const golden = { metadata: { expectedScoreRange: { finalScore: { min: 0.6 } } } };
    const result = { aggregator: { finalScore: 0.75 } };
    const { checks } = checkScoresAgainstRanges(result, golden);
    expect(checks.finalScore.score).toBe(0.75);
    expect(checks.finalScore.inRange).toBe(true);
  });

  it('handles missing metadata gracefully with empty checks', () => {
    const golden = { metadata: {} };
    const result = { judges: { openai: { score: 0.9 } } };
    const { checks, allInRange } = checkScoresAgainstRanges(result, golden);
    expect(Object.keys(checks)).toHaveLength(0);
    expect(allInRange).toBe(true);
  });
});

describe('detectBorderline', () => {
  it('returns true when score is within default tolerance (0.1) of min boundary', () => {
    expect(detectBorderline(0.82, { min: 0.9 })).toBe(true);
  });

  it('returns true when score is within default tolerance of max boundary', () => {
    expect(detectBorderline(0.58, { max: 0.5 })).toBe(true);
  });

  it('returns false when score is far from both boundaries', () => {
    expect(detectBorderline(0.3, { min: 0.8 })).toBe(false);
  });

  it('returns false for null score', () => {
    expect(detectBorderline(null, { min: 0.8 })).toBe(false);
  });

  it('returns false for undefined score', () => {
    expect(detectBorderline(undefined, { min: 0.8 })).toBe(false);
  });

  it('respects custom tolerance', () => {
    expect(detectBorderline(0.85, { min: 0.9 }, 0.04)).toBe(false);
    expect(detectBorderline(0.87, { min: 0.9 }, 0.04)).toBe(true);
  });

  it('returns true at exact boundary (distance of 0)', () => {
    expect(detectBorderline(0.9, { min: 0.9 })).toBe(true);
    expect(detectBorderline(0.5, { max: 0.5 })).toBe(true);
  });
});
