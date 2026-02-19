import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../src/utils/logger.js';

describe('logger utility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts sensitive keys recursively', () => {
    const payload = {
      password: 'secret',
      nested: {
        token: 'abc',
        authorization: 'Bearer xxx',
      },
      array: [{ apiKey: '123' }],
    };

    const result = logger.redactValue(payload);

    expect(result.password).toBe('[REDACTED]');
    expect(result.nested.token).toBe('[REDACTED]');
    expect(result.nested.authorization).toBe('[REDACTED]');
    expect(result.array[0].apiKey).toBe('[REDACTED]');
  });

  it('extracts request context with withReq', () => {
    const req = {
      requestId: 'req-1',
      originalUrl: '/api/test',
      method: 'POST',
      user: { _id: 'user-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'vitest' },
      startedAt: Date.now() - 25,
    };

    const context = logger.withReq(req, { statusCode: 201 });

    expect(context.requestId).toBe('req-1');
    expect(context.path).toBe('/api/test');
    expect(context.method).toBe('POST');
    expect(context.userId).toBe('user-1');
    expect(context.statusCode).toBe(201);
    expect(typeof context.durationMs).toBe('number');
  });

  it('writes structured JSON logs', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('test.event', {
      requestId: 'req-123',
      metadata: { key: 'value' },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const raw = spy.mock.calls[0][0];
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe('info');
    expect(parsed.event).toBe('test.event');
    expect(parsed.requestId).toBe('req-123');
    expect(parsed.metadata.key).toBe('value');
  });
});
