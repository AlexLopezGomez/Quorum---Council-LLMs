const API_BASE = '/api';

export async function startEvaluation(testCases, options = {}) {
  const response = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ testCases, options }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start evaluation');
  }

  return response.json();
}

export async function getResults(jobId) {
  const response = await fetch(`${API_BASE}/results/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch results');
  }

  return response.json();
}

export function getStreamUrl(jobId) {
  return `${API_BASE}/stream/${jobId}`;
}

export async function getHistory(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.strategy) searchParams.set('strategy', params.strategy);
  if (params.verdict) searchParams.set('verdict', params.verdict);
  if (params.status) searchParams.set('status', params.status);

  const response = await fetch(`${API_BASE}/history?${searchParams}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch history');
  }
  return response.json();
}

export async function getCostBreakdown(jobId) {
  const response = await fetch(`${API_BASE}/history/${jobId}/cost`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch cost breakdown');
  }
  return response.json();
}

export async function getStats() {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch stats');
  }
  return response.json();
}

export async function getWebhooks() {
  const response = await fetch(`${API_BASE}/webhooks`);
  if (!response.ok) throw new Error('Failed to fetch webhooks');
  return response.json();
}

export async function createWebhook(data) {
  const response = await fetch(`${API_BASE}/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create webhook');
  }
  return response.json();
}

export async function updateWebhook(id, data) {
  const response = await fetch(`${API_BASE}/webhooks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update webhook');
  return response.json();
}

export async function deleteWebhook(id) {
  const response = await fetch(`${API_BASE}/webhooks/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete webhook');
  return response.json();
}

export async function testWebhook(id) {
  const response = await fetch(`${API_BASE}/webhooks/${id}/test`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to test webhook');
  return response.json();
}
