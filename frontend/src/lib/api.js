import { ApiError } from './ApiError';
import {
  captureCorrelationFromResponse,
  clientLog,
  correlationHeaders,
  getCorrelationId,
} from './observability';

const API_BASE = '/api';

/**
 * Shared fetch helper. Sends a request, parses JSON,
 * and throws a structured ApiError on non-2xx responses.
 */
async function fetchJson(url, options = {}, signal) {
  const response = await fetch(url, {
    ...options,
    headers: correlationHeaders(options.headers || {}),
    signal,
    credentials: 'include',
  });
  const correlationId = captureCorrelationFromResponse(response);

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      /* response may not be JSON */
    }
    throw new ApiError(
      data?.error || `Request failed (${response.status})`,
      response.status,
      data,
      correlationId,
    );
  }

  clientLog('info', 'frontend.api.request.success', {
    path: url,
    statusCode: response.status,
    correlationId,
  });
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

// ─── Evaluation ──────────────────────────────────────────────

export async function startEvaluation(testCases, options = {}, signal) {
  const { name, ...evalOptions } = options;
  return fetchJson(
    `${API_BASE}/evaluate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testCases, name: name || '', options: evalOptions }),
    },
    signal,
  );
}

export async function getActiveEvaluation(signal) {
  return fetchJson(`${API_BASE}/evaluate/active`, {}, signal);
}

export async function getResults(jobId, signal) {
  return fetchJson(`${API_BASE}/results/${jobId}`, {}, signal);
}

export function getStreamUrl(jobId) {
  const correlationId = getCorrelationId();
  if (!correlationId) return `${API_BASE}/stream/${jobId}`;
  return `${API_BASE}/stream/${jobId}?correlationId=${encodeURIComponent(correlationId)}`;
}

// ─── History ─────────────────────────────────────────────────

export async function getHistory(params = {}, signal) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.strategy) searchParams.set('strategy', params.strategy);
  if (params.verdict) searchParams.set('verdict', params.verdict);
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);

  return fetchJson(`${API_BASE}/history?${searchParams}`, {}, signal);
}

export async function getCostBreakdown(jobId, signal) {
  return fetchJson(`${API_BASE}/history/${jobId}/cost`, {}, signal);
}

export async function updateEvaluationName(jobId, name) {
  return fetchJson(`${API_BASE}/history/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}


// ─── Webhooks ────────────────────────────────────────────────

export async function getWebhooks(signal) {
  return fetchJson(`${API_BASE}/webhooks`, {}, signal);
}

export async function createWebhook(data, signal) {
  return fetchJson(
    `${API_BASE}/webhooks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    signal,
  );
}

export async function updateWebhook(id, data, signal) {
  return fetchJson(
    `${API_BASE}/webhooks/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    signal,
  );
}

export async function deleteWebhook(id, signal) {
  return fetchJson(`${API_BASE}/webhooks/${id}`, { method: 'DELETE' }, signal);
}

export async function testWebhook(id, signal) {
  return fetchJson(`${API_BASE}/webhooks/${id}/test`, { method: 'POST' }, signal);
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function getKeys(signal) {
  return fetchJson(`${API_BASE}/keys`, {}, signal);
}

export async function setKey(provider, key) {
  return fetchJson(`${API_BASE}/keys/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
}

export async function deleteKey(provider) {
  return fetchJson(`${API_BASE}/keys/${provider}`, { method: 'DELETE' });
}

// ─── Auth ───────────────────────────────────────────────────

export const authApi = {
  register({ email, username, password }) {
    return fetchJson(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
  },
  login({ email, password }) {
    return fetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },
  logout() {
    return fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' });
  },
  me(signal) {
    return fetchJson(`${API_BASE}/auth/me`, {}, signal);
  },
};
