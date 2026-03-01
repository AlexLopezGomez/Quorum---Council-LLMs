import { describe, it, expect } from 'vitest';
import { sanitizePayload } from '../src/sanitizer.js';

const base = { input: '', actualOutput: '', retrievalContext: [] };

describe('sanitizePayload – PII patterns', () => {
  it('replaces email in input', () => {
    const result = sanitizePayload({ ...base, input: 'Email me at user@example.com please' });
    expect(result.input).toBe('Email me at [EMAIL] please');
  });

  it('replaces phone in actualOutput', () => {
    const result = sanitizePayload({ ...base, actualOutput: 'Call me at 555-867-5309' });
    expect(result.actualOutput).toBe('Call me at [PHONE]');
  });

  it('replaces credit card in input', () => {
    const result = sanitizePayload({ ...base, input: 'Card: 4111 1111 1111 1111' });
    expect(result.input).toBe('Card: [CREDIT_CARD]');
  });

  it('replaces SSN in actualOutput', () => {
    const result = sanitizePayload({ ...base, actualOutput: 'SSN is 123-45-6789' });
    expect(result.actualOutput).toBe('SSN is [SSN]');
  });

  it('replaces IPv4 in input', () => {
    const result = sanitizePayload({ ...base, input: 'Server at 192.168.1.100' });
    expect(result.input).toBe('Server at [IP_ADDRESS]');
  });

  it('passes clean string through unchanged', () => {
    const result = sanitizePayload({ ...base, input: 'This is clean text.' });
    expect(result.input).toBe('This is clean text.');
  });

  it('sanitizes each element of retrievalContext independently', () => {
    const result = sanitizePayload({
      ...base,
      retrievalContext: ['Contact user@test.com', 'No PII here', 'IP: 10.0.0.1'],
    });
    expect(result.retrievalContext).toEqual([
      'Contact [EMAIL]',
      'No PII here',
      'IP: [IP_ADDRESS]',
    ]);
  });

  it('handles missing expectedOutput without error', () => {
    const payload = { input: 'hi', actualOutput: 'hello', retrievalContext: [] };
    expect(() => sanitizePayload(payload)).not.toThrow();
    const result = sanitizePayload(payload);
    expect(result.expectedOutput).toBeUndefined();
  });

  it('sanitizes expectedOutput when present', () => {
    const result = sanitizePayload({
      ...base,
      expectedOutput: 'Reach us at support@corp.io',
    });
    expect(result.expectedOutput).toBe('Reach us at [EMAIL]');
  });

  it('returns a new object without mutating input', () => {
    const original = { ...base, input: 'user@example.com' };
    const result = sanitizePayload(original);
    expect(result).not.toBe(original);
    expect(original.input).toBe('user@example.com');
  });

  it('replaces multiple PII types in the same string', () => {
    const result = sanitizePayload({
      ...base,
      input: 'Email user@x.com, SSN 111-22-3333, IP 8.8.8.8',
    });
    expect(result.input).toBe('Email [EMAIL], SSN [SSN], IP [IP_ADDRESS]');
  });
});
