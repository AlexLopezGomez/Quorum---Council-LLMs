import { describe, expect, it } from 'vitest';
import { requestContext } from '../../src/middleware/requestContext.js';

function createRes() {
  return {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
  };
}

describe('requestContext middleware', () => {
  it('uses incoming X-Correlation-ID when provided', () => {
    const req = { headers: { 'x-correlation-id': 'incoming-id' }, query: {} };
    const res = createRes();
    let called = false;

    requestContext(req, res, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(req.requestId).toBe('incoming-id');
    expect(res.headers['X-Correlation-ID']).toBe('incoming-id');
    expect(typeof req.startedAt).toBe('number');
  });

  it('falls back to query correlationId for SSE requests', () => {
    const req = { headers: {}, query: { correlationId: 'query-id' } };
    const res = createRes();

    requestContext(req, res, () => {});

    expect(req.requestId).toBe('query-id');
    expect(res.headers['X-Correlation-ID']).toBe('query-id');
  });

  it('generates a correlation id when none is provided', () => {
    const req = { headers: {}, query: {} };
    const res = createRes();

    requestContext(req, res, () => {});

    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(10);
    expect(res.headers['X-Correlation-ID']).toBe(req.requestId);
  });
});
