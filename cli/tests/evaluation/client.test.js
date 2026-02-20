import { describe, it, expect, vi, afterEach } from 'vitest';
import { chunkArray, postEvaluation, runChunks } from '../../src/evaluation/client.js';

afterEach(() => vi.unstubAllGlobals());

describe('chunkArray', () => {
  it('splits into chunks of given size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('handles empty array', () => {
    expect(chunkArray([], 10)).toEqual([]);
  });
});

describe('postEvaluation', () => {
  it('throws with endpoint URL and "backend running" hint on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(postEvaluation('http://localhost:3000', [], 'auto', 'tok'))
      .rejects.toThrow(/backend running/i);
  });

  it('throws with status 401 property on unauthorized response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const err = await postEvaluation('http://localhost:3000', [], 'auto', 'tok').catch((e) => e);
    expect(err.status).toBe(401);
  });
});

describe('runChunks', () => {
  it('marks failed chunk cases as ERROR and continues with remaining chunks', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ jobId: 'j1' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ testCaseIndex: 0 }] }) })
      .mockResolvedValueOnce({ ok: false, status: 500 })
    );
    const cases = Array.from({ length: 11 }, (_, i) => ({ id: `tc-${i}` }));
    const { results, errors } = await runChunks('http://localhost:3000', cases, 'auto', 'tok');
    expect(errors).toHaveLength(1);
    expect(results.some((r) => r.overallVerdict === 'ERROR')).toBe(true);
  });

  it('triggers re-auth callback on 401 during postEvaluation', async () => {
    const onReauth = vi.fn().mockResolvedValue('new-cookie');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ jobId: 'j2' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ testCaseIndex: 0 }] }) })
    );
    const cases = [{ id: 'tc-1' }];
    const { results } = await runChunks('http://localhost:3000', cases, 'auto', 'tok', { onReauth });
    expect(onReauth).toHaveBeenCalledOnce();
    expect(results).toHaveLength(1);
  });

  it('throws "session expired" when re-auth itself returns 401', async () => {
    const onReauth = vi.fn().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const cases = [{ id: 'tc-1' }];
    await expect(runChunks('http://localhost:3000', cases, 'auto', 'tok', { onReauth }))
      .rejects.toThrow(/session expired/i);
  });
});
