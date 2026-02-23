import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadProviderResilience(overrides = {}) {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, ...overrides };
  return import('../../src/services/providerResilience.js');
}

describe('executeWithProviderResilience', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('retries on 429 and succeeds on next attempt', async () => {
    const { executeWithProviderResilience } = await loadProviderResilience({
      OPENAI_MAX_CONCURRENCY: '2',
      PROVIDER_MAX_RETRIES: '2',
      PROVIDER_RETRY_BASE_DELAY_MS: '1',
      PROVIDER_RETRY_JITTER_MS: '0',
      PROVIDER_RETRY_MAX_DELAY_MS: '10',
    });

    const events = [];
    const run = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockResolvedValueOnce('ok');

    const out = await executeWithProviderResilience({
      provider: 'openai',
      operation: 'faithfulness',
      run,
      emitEvent: (type, data) => events.push({ type, data }),
      context: { testCaseIndex: 0 },
    });

    expect(out).toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
    expect(events.map((e) => e.type)).toEqual(['rate_limited', 'retry_scheduled']);
  });

  it('honors Retry-After header when scheduling retries', async () => {
    vi.useFakeTimers();
    const { executeWithProviderResilience } = await loadProviderResilience({
      OPENAI_MAX_CONCURRENCY: '2',
      PROVIDER_MAX_RETRIES: '1',
      PROVIDER_RETRY_BASE_DELAY_MS: '1',
      PROVIDER_RETRY_JITTER_MS: '0',
      PROVIDER_RETRY_MAX_DELAY_MS: '5000',
    });

    const events = [];
    const run = vi
      .fn()
      .mockRejectedValueOnce({
        message: 'throttled',
        status: 429,
        response: { headers: { 'retry-after': '1' } },
      })
      .mockResolvedValueOnce('ok');

    const promise = executeWithProviderResilience({
      provider: 'openai',
      operation: 'faithfulness',
      run,
      emitEvent: (type, data) => events.push({ type, data }),
    });

    await vi.advanceTimersByTimeAsync(1000);
    const out = await promise;

    expect(out).toBe('ok');
    const retryScheduled = events.find((e) => e.type === 'retry_scheduled');
    expect(retryScheduled?.data?.delayMs).toBe(1000);
    expect(retryScheduled?.data?.retryAfterMs).toBe(1000);
  });

  it('emits retry_exhausted and throws annotated error when retries are exhausted', async () => {
    const { executeWithProviderResilience } = await loadProviderResilience({
      OPENAI_MAX_CONCURRENCY: '2',
      PROVIDER_MAX_RETRIES: '1',
      PROVIDER_RETRY_BASE_DELAY_MS: '1',
      PROVIDER_RETRY_JITTER_MS: '0',
      PROVIDER_RETRY_MAX_DELAY_MS: '10',
    });

    const events = [];
    const run = vi.fn().mockRejectedValue(Object.assign(new Error('still throttled'), { status: 429 }));

    await expect(
      executeWithProviderResilience({
        provider: 'openai',
        operation: 'faithfulness',
        run,
        emitEvent: (type, data) => events.push({ type, data }),
      })
    ).rejects.toThrow('Provider openai rate-limited after 1 retries');

    expect(events.map((e) => e.type)).toContain('retry_exhausted');
  });

  it('does not retry non-429 errors', async () => {
    const { executeWithProviderResilience } = await loadProviderResilience({
      OPENAI_MAX_CONCURRENCY: '2',
      PROVIDER_MAX_RETRIES: '3',
    });

    const run = vi.fn().mockRejectedValue(new Error('bad request'));
    await expect(
      executeWithProviderResilience({
        provider: 'openai',
        operation: 'faithfulness',
        run,
      })
    ).rejects.toThrow('bad request');

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('enforces shared provider concurrency limits', async () => {
    const { executeWithProviderResilience } = await loadProviderResilience({
      OPENAI_MAX_CONCURRENCY: '1',
      PROVIDER_MAX_RETRIES: '0',
    });

    let active = 0;
    let maxActive = 0;
    const slowRun = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
      return 'done';
    };

    await Promise.all([
      executeWithProviderResilience({ provider: 'openai', operation: 'faithfulness', run: slowRun }),
      executeWithProviderResilience({ provider: 'openai', operation: 'faithfulness', run: slowRun }),
    ]);

    expect(maxActive).toBe(1);
  });
});
