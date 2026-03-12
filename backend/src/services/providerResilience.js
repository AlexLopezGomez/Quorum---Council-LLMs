const DEFAULT_CONCURRENCY_LIMITS = {
  openai: Number(process.env.OPENAI_MAX_CONCURRENCY) || 2,
  anthropic: Number(process.env.ANTHROPIC_MAX_CONCURRENCY) || 2,
  gemini: Number(process.env.GEMINI_MAX_CONCURRENCY) || 2,
};

const DEFAULT_MAX_RETRIES = Number(process.env.PROVIDER_MAX_RETRIES) || 3;
const DEFAULT_BASE_DELAY_MS = Number(process.env.PROVIDER_RETRY_BASE_DELAY_MS) || 500;
const DEFAULT_MAX_DELAY_MS = Number(process.env.PROVIDER_RETRY_MAX_DELAY_MS) || 10000;
const DEFAULT_JITTER_MS = Number(process.env.PROVIDER_RETRY_JITTER_MS) || 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHeader(headers, key) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(key);
  const lower = key.toLowerCase();
  return headers[key] || headers[lower] || null;
}

function parseRetryAfterMs(error) {
  const retryAfterValue =
    getHeader(error?.headers, 'retry-after') ||
    getHeader(error?.response?.headers, 'retry-after') ||
    error?.retryAfter;

  if (!retryAfterValue) return null;

  const asNumber = Number(retryAfterValue);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return asNumber * 1000;
  }

  const parsedDate = Date.parse(retryAfterValue);
  if (!Number.isNaN(parsedDate)) {
    const diff = parsedDate - Date.now();
    return diff > 0 ? diff : 0;
  }

  return null;
}

function isRateLimitedError(error) {
  if (!error) return false;
  if (Number(error.status) === 429) return true;
  if (Number(error.statusCode) === 429) return true;
  if (Number(error?.response?.status) === 429) return true;

  const code = String(error.code || '').toLowerCase();
  if (code.includes('rate')) return true;

  const message = String(error.message || '').toLowerCase();
  return message.includes('429') || message.includes('rate limit');
}

function computeBackoffDelayMs(attempt, { baseDelayMs, maxDelayMs, jitterMs, retryAfterMs }) {
  if (retryAfterMs !== null && retryAfterMs !== undefined) {
    return Math.min(maxDelayMs, Math.max(0, retryAfterMs));
  }

  const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
  const jitter = Math.floor(Math.random() * (jitterMs + 1));
  return Math.min(maxDelayMs, exponential + jitter);
}

class ConcurrencyLimiter {
  constructor(maxConcurrent) {
    this.maxConcurrent = Math.max(1, Number(maxConcurrent) || 1);
    this.activeCount = 0;
    this.queue = [];
  }

  async run(task) {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise((resolve) => this.queue.push(resolve));
    }

    this.activeCount += 1;
    try {
      return await task();
    } finally {
      this.activeCount -= 1;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const providerLimiters = new Map();

function getProviderLimiter(provider) {
  if (!providerLimiters.has(provider)) {
    providerLimiters.set(
      provider,
      new ConcurrencyLimiter(DEFAULT_CONCURRENCY_LIMITS[provider] || 1)
    );
  }
  return providerLimiters.get(provider);
}

function annotateRateLimitError(error, provider, retriesAttempted) {
  const wrapped = new Error(
    `Provider ${provider} rate-limited after ${retriesAttempted} retries: ${error.message}`
  );
  wrapped.cause = error;
  wrapped.status = error.status || error.statusCode || error?.response?.status;
  wrapped.isRateLimited = true;
  wrapped.provider = provider;
  wrapped.retriesAttempted = retriesAttempted;
  return wrapped;
}

export async function executeWithProviderResilience({
  provider,
  operation,
  run,
  maxRetries = DEFAULT_MAX_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  jitterMs = DEFAULT_JITTER_MS,
  emitEvent,
  context = {},
}) {
  const limiter = getProviderLimiter(provider);
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt += 1;

    try {
      return await limiter.run(run);
    } catch (error) {
      // #region agent log
      try { const {appendFileSync:_a}=await import('fs');const {fileURLToPath:_f}=await import('url');const {dirname:_d,join:_j}=await import('path');_a(_j(_d(_f(import.meta.url)),'../../../debug-b43e2f.log'),JSON.stringify({sessionId:'b43e2f',location:'providerResilience:catch',message:'provider_error',data:{provider,operation,attempt,errorMsg:error?.message?.substring(0,200),errorStatus:error?.status||error?.statusCode,isRateLimit:isRateLimitedError(error)},timestamp:Date.now()})+'\n');} catch(e){}
      // #endregion
      const canRetry = isRateLimitedError(error) && attempt <= maxRetries;
      const retryAfterMs = parseRetryAfterMs(error);

      if (isRateLimitedError(error)) {
        emitEvent?.('rate_limited', {
          provider,
          operation,
          attempt,
          maxRetries,
          retryAfterMs,
          timestamp: new Date().toISOString(),
          ...context,
        });
      }

      if (!canRetry) {
        if (isRateLimitedError(error)) {
          emitEvent?.('retry_exhausted', {
            provider,
            operation,
            attempts: attempt,
            maxRetries,
            timestamp: new Date().toISOString(),
            ...context,
          });
          throw annotateRateLimitError(error, provider, attempt - 1);
        }
        throw error;
      }

      const delayMs = computeBackoffDelayMs(attempt, {
        baseDelayMs,
        maxDelayMs,
        jitterMs,
        retryAfterMs,
      });

      emitEvent?.('retry_scheduled', {
        provider,
        operation,
        attempt,
        maxRetries,
        delayMs,
        retryAfterMs,
        timestamp: new Date().toISOString(),
        ...context,
      });

      await sleep(delayMs);
    }
  }

  throw new Error(`Provider resilience loop exited unexpectedly for ${provider}/${operation}`);
}
