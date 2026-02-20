import { describe, it, expect, vi, afterEach } from 'vitest';
import { authenticate, extractCookie, resolveCredentials } from '../src/auth.js';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.QUORUM_EMAIL;
  delete process.env.QUORUM_PASSWORD;
});

describe('authenticate', () => {
  it('returns cookie on successful login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'quorum_token=tok123; Path=/; HttpOnly' },
    }));
    const cookie = await authenticate('http://localhost:3000', 'a@b.com', 'pass');
    expect(cookie).toBe('quorum_token=tok123');
  });

  it('throws descriptive error on 401 with "401" in message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(authenticate('http://localhost:3000', 'a@b.com', 'wrong')).rejects.toThrow('401');
  });

  it('throws with endpoint URL and backend hint on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(authenticate('http://localhost:3000', 'a@b.com', 'p')).rejects.toThrow('http://localhost:3000');
  });

  it('throws when no cookie in response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
    }));
    await expect(authenticate('http://localhost:3000', 'a@b.com', 'p')).rejects.toThrow(/token/i);
  });
});

describe('extractCookie', () => {
  it('extracts quorum_token from string header', () => {
    expect(extractCookie('quorum_token=abc123; Path=/; HttpOnly')).toBe('quorum_token=abc123');
  });

  it('extracts from array of set-cookie headers', () => {
    expect(extractCookie(['session=xyz; Path=/', 'quorum_token=abc123; HttpOnly'])).toBe('quorum_token=abc123');
  });

  it('returns null when header is null', () => {
    expect(extractCookie(null)).toBeNull();
  });

  it('returns null when quorum_token is absent', () => {
    expect(extractCookie('session=xyz; Path=/')).toBeNull();
  });
});

describe('resolveCredentials', () => {
  it('uses options.email and options.password when provided', () => {
    const c = resolveCredentials({ email: 'a@b.com', password: 'pass' });
    expect(c).toEqual({ email: 'a@b.com', password: 'pass' });
  });

  it('falls back to QUORUM_EMAIL and QUORUM_PASSWORD env vars', () => {
    process.env.QUORUM_EMAIL = 'env@b.com';
    process.env.QUORUM_PASSWORD = 'envpass';
    const c = resolveCredentials({});
    expect(c.email).toBe('env@b.com');
    expect(c.password).toBe('envpass');
  });

  it('throws mentioning env var names when credentials are missing', () => {
    expect(() => resolveCredentials({})).toThrow(/QUORUM_EMAIL/);
  });
});
