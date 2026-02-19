import crypto from 'crypto';

const CORRELATION_HEADER = 'x-correlation-id';

function sanitizeCorrelationId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 128);
}

export function requestContext(req, res, next) {
  const headerValue = req.headers[CORRELATION_HEADER];
  const incoming = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const requestId = sanitizeCorrelationId(incoming)
    || sanitizeCorrelationId(req.query?.correlationId)
    || crypto.randomUUID();

  req.requestId = requestId;
  req.startedAt = Date.now();

  res.setHeader('X-Correlation-ID', requestId);
  next();
}
