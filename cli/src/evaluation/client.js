export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

export async function postEvaluation(endpoint, testCases, strategy, cookie) {
  let res;
  try {
    res = await fetch(`${endpoint}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ testCases, options: { strategy } }),
    });
  } catch (err) {
    throw Object.assign(
      new Error(`Cannot reach ${endpoint}. Is the backend running? (${err.message})`),
      { code: 'ECONNREFUSED' }
    );
  }
  if (res.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  if (!res.ok) throw new Error(`Evaluate request failed (${res.status})`);
  const { jobId } = await res.json();
  return jobId;
}

export async function pollResults(endpoint, jobId, cookie, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await fetch(`${endpoint}/api/results/${jobId}`, { headers: { Cookie: cookie } });
    if (res.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 });
    if (res.status === 200) return res.json();
    if (res.status !== 202) throw new Error(`Polling failed (${res.status}) for job ${jobId}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for job ${jobId}`);
}

function makeErrorResults(chunk, offset) {
  return chunk.map((_, k) => ({
    testCaseIndex: offset + k,
    overallVerdict: 'ERROR',
    strategy: 'unknown',
    judges: {},
    aggregator: { verdict: 'ERROR', finalScore: null },
    metricVerdicts: [],
  }));
}

export async function runChunks(endpoint, testCases, strategy, cookie, options = {}) {
  const { timeout = 120000, onReauth, onChunkError } = options;
  const chunks = chunkArray(testCases, 10);
  const globalDeadline = Date.now() + timeout * chunks.length * 1.5;
  let activeCookie = cookie;
  const results = [];
  const errors = [];

  for (let i = 0; i < chunks.length; i++) {
    const offset = i * 10;

    if (Date.now() > globalDeadline) {
      errors.push({ chunk: i, error: 'Global timeout reached' });
      for (let j = i; j < chunks.length; j++) results.push(...makeErrorResults(chunks[j], j * 10));
      break;
    }

    const chunkTimeout = Math.min(timeout, Math.max(1000, globalDeadline - Date.now()));

    const tryEval = async (cookieToUse) => {
      const jobId = await postEvaluation(endpoint, chunks[i], strategy, cookieToUse);
      const data = await pollResults(endpoint, jobId, cookieToUse, chunkTimeout);
      return (data.results || []).map((r, k) => ({ ...r, testCaseIndex: offset + (r.testCaseIndex ?? k) }));
    };

    try {
      results.push(...(await tryEval(activeCookie)));
    } catch (err) {
      if (err.status === 401 && onReauth) {
        try {
          activeCookie = await onReauth();
          results.push(...(await tryEval(activeCookie)));
          continue;
        } catch (retryErr) {
          if (retryErr.status === 401) {
            throw new Error('Session expired and re-authentication failed. Please check your credentials.');
          }
          onChunkError?.(i, retryErr);
          errors.push({ chunk: i, error: retryErr.message });
          results.push(...makeErrorResults(chunks[i], offset));
          continue;
        }
      }
      onChunkError?.(i, err);
      errors.push({ chunk: i, error: err.message });
      results.push(...makeErrorResults(chunks[i], offset));
    }
  }

  return { results, errors };
}
