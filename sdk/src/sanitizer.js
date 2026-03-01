const PATTERNS = [
  { regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL]' },
  { regex: /(\+1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { regex: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g, replacement: '[CREDIT_CARD]' },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: '[IP_ADDRESS]' },
];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const { regex, replacement } of PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

export function sanitizePayload(payload) {
  const sanitized = { ...payload };

  sanitized.input = sanitizeString(payload.input);
  sanitized.actualOutput = sanitizeString(payload.actualOutput);

  if (payload.expectedOutput !== undefined) {
    sanitized.expectedOutput = sanitizeString(payload.expectedOutput);
  }

  if (Array.isArray(payload.retrievalContext)) {
    sanitized.retrievalContext = payload.retrievalContext.map(sanitizeString);
  }

  return sanitized;
}
