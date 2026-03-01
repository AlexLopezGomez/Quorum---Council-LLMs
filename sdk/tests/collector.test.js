import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Quorum } from '../src/collector.js';

vi.mock('../src/transport.js', () => ({
  Transport: vi.fn().mockImplementation(function () {
    this.send = vi.fn().mockResolvedValue({});
  }),
}));

vi.mock('../src/observability.js', () => ({
  createCorrelationId: () => 'test-correlation-id',
}));

function makeClient(opts = {}) {
  return new Quorum({ endpoint: 'http://localhost:3000', flushInterval: 0, ...opts });
}

const piiPayload = {
  input: 'Email me at pii@example.com',
  actualOutput: 'Your SSN is 123-45-6789',
  retrievalContext: ['IP: 192.168.0.1'],
};

describe('Quorum.capture – sanitizer integration', () => {
  it('sanitizes payload before buffering by default', () => {
    const client = makeClient();
    client.capture({ ...piiPayload });
    const buffered = client._buffer[0];
    expect(buffered.input).toBe('Email me at [EMAIL]');
    expect(buffered.actualOutput).toBe('Your SSN is [SSN]');
    expect(buffered.retrievalContext).toEqual(['IP: [IP_ADDRESS]']);
  });

  it('skips sanitization when sanitize: false', () => {
    const client = makeClient({ sanitize: false });
    client.capture({ ...piiPayload });
    const buffered = client._buffer[0];
    expect(buffered.input).toBe('Email me at pii@example.com');
    expect(buffered.actualOutput).toBe('Your SSN is 123-45-6789');
  });

  it('preserves metadata.correlationId after sanitization', () => {
    const client = makeClient();
    client.capture({ ...piiPayload, metadata: { correlationId: 'custom-id' } });
    expect(client._buffer[0].metadata.correlationId).toBe('custom-id');
  });

  it('accumulates multiple sanitized captures in the buffer', () => {
    const client = makeClient({ batchSize: 100 });
    client.capture({ ...piiPayload });
    client.capture({ ...piiPayload, input: 'Call 555-123-4567' });
    expect(client._buffer).toHaveLength(2);
    expect(client._buffer[1].input).toBe('Call [PHONE]');
  });
});
