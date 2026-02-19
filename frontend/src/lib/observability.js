let currentCorrelationId = null;

function randomSegment() {
  return Math.random().toString(16).slice(2, 10);
}

export function createCorrelationId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${randomSegment()}-${randomSegment()}`;
}

export function getCorrelationId() {
  return currentCorrelationId;
}

export function setCorrelationId(value) {
  if (!value || typeof value !== 'string') return;
  currentCorrelationId = value.trim().slice(0, 128);
}

export function ensureCorrelationId() {
  if (!currentCorrelationId) {
    currentCorrelationId = createCorrelationId();
  }
  return currentCorrelationId;
}

export function correlationHeaders(extra = {}) {
  return {
    ...extra,
    'X-Correlation-ID': ensureCorrelationId(),
  };
}

export function captureCorrelationFromResponse(response) {
  const responseCorrelation = response.headers?.get?.('x-correlation-id');
  if (responseCorrelation) {
    setCorrelationId(responseCorrelation);
  }
  return getCorrelationId();
}

export function clientLog(level, event, context = {}) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    correlationId: getCorrelationId(),
    ...context,
  });
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}
