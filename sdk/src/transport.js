const RETRY_DELAYS = [1000, 2000, 4000];
const REQUEST_TIMEOUT = 5000;

export class Transport {
  constructor(endpoint, apiKey, onError) {
    this._endpoint = endpoint.replace(/\/$/, '');
    this._apiKey = apiKey;
    this._onError = onError;
  }

  async send(captures, strategy) {
    const url = `${this._endpoint}/api/ingest`;
    const body = JSON.stringify({ captures, options: { strategy } });
    const correlationId = captures?.[0]?.metadata?.correlationId || null;

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const headers = { 'Content-Type': 'application/json' };
        if (this._apiKey) headers['Authorization'] = `Bearer ${this._apiKey}`;
        if (correlationId) headers['X-Correlation-ID'] = correlationId;

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        if (attempt < RETRY_DELAYS.length) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        if (this._onError) this._onError(err);
        else {
          console.warn(`[@ragscope/sdk] Failed to send captures: ${err.message}`);
          console.warn(
            JSON.stringify({
              level: 'warn',
              event: 'sdk.transport.send_failed',
              correlationId,
              strategy,
              timestamp: new Date().toISOString(),
            })
          );
        }
        return null;
      }
    }
  }
}
