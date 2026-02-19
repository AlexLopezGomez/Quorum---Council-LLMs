import { Transport } from './transport.js';
import { createCorrelationId } from './observability.js';

export class RAGScope {
  /**
   * @param {import('./types.js').SDKConfig} config
   */
  constructor(config) {
    if (!config?.endpoint) throw new Error('RAGScope: endpoint is required');

    this._transport = new Transport(config.endpoint, config.apiKey, config.onError);
    this._strategy = config.defaultStrategy || 'auto';
    this._batchSize = config.batchSize || 10;
    this._flushInterval = config.flushInterval ?? 5000;
    this._buffer = [];
    this._flushing = false;
    this._timer = null;
    this._correlationId = config.correlationId || createCorrelationId();

    if (this._flushInterval > 0) {
      this._timer = setInterval(() => this.flush(), this._flushInterval);
      if (this._timer.unref) this._timer.unref();
    }
  }

  /**
   * @param {import('./types.js').CapturePayload} payload
   */
  capture(payload) {
    const metadata = payload.metadata || {};
    this._buffer.push({
      ...payload,
      metadata: {
        ...metadata,
        correlationId: metadata.correlationId || this._correlationId,
      },
      capturedAt: payload.capturedAt || new Date().toISOString(),
    });

    if (this._buffer.length >= this._batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this._flushing || this._buffer.length === 0) return;

    this._flushing = true;
    const batch = this._buffer.splice(0);

    try {
      return await this._transport.send(batch, this._strategy);
    } finally {
      this._flushing = false;
    }
  }

  async close() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._buffer.length > 0) {
      await this.flush();
    }
  }
}
