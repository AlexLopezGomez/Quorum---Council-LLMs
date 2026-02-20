import { describe, it, expect } from 'vitest';
import { parseJsonlContent, parseJsonContent, validateExtension } from '../../src/dataset/parser.js';

describe('parseJsonlContent', () => {
  it('parses 3 valid JSONL lines into 3 objects', () => {
    const result = parseJsonlContent('{"a":1}\n{"a":2}\n{"a":3}');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ a: 1 });
    expect(result[2]).toEqual({ a: 3 });
  });

  it('skips empty and whitespace-only lines', () => {
    const result = parseJsonlContent('{"a":1}\n\n   \n{"a":2}');
    expect(result).toHaveLength(2);
  });

  it('throws with line number on malformed JSON', () => {
    expect(() => parseJsonlContent('{"a":1}\nnot valid json\n{"a":3}')).toThrow('line 2');
  });

  it('strips UTF-8 BOM prefix', () => {
    const result = parseJsonlContent('\uFEFF{"a":1}\n{"a":2}');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ a: 1 });
  });

  it('preserves UTF-8 accents and emojis', () => {
    const result = parseJsonlContent('{"name":"Ángel 🏠"}');
    expect(result[0].name).toBe('Ángel 🏠');
  });
});

describe('parseJsonContent', () => {
  it('parses JSON array format', () => {
    const result = parseJsonContent('[{"a":1},{"a":2}]');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ a: 1 });
  });

  it('parses { testCases: [...] } wrapped format', () => {
    const result = parseJsonContent('{"testCases":[{"a":1},{"a":2}]}');
    expect(result).toHaveLength(2);
  });

  it('throws for unsupported JSON format', () => {
    expect(() => parseJsonContent('{"other":true}')).toThrow(/Unsupported/);
  });
});

describe('validateExtension', () => {
  it('accepts .jsonl extension', () => {
    expect(validateExtension('data.jsonl')).toBe('.jsonl');
  });

  it('accepts .json extension', () => {
    expect(validateExtension('data.json')).toBe('.json');
  });

  it('throws descriptive error for .csv extension', () => {
    expect(() => validateExtension('data.csv')).toThrow(/Unsupported/);
    expect(() => validateExtension('data.csv')).toThrow('.csv');
  });

  it('is case-insensitive for extension check', () => {
    expect(validateExtension('data.JSONL')).toBe('.jsonl');
  });
});
