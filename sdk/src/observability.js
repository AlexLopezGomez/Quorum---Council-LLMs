function randomSegment() {
  return Math.random().toString(16).slice(2, 10);
}

export function createCorrelationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(16)}-${randomSegment()}-${randomSegment()}`;
}
