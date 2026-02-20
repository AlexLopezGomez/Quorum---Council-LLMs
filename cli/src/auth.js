export async function authenticate(endpoint, email, password) {
  let res;
  try {
    res = await fetch(`${endpoint}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    throw new Error(`Cannot reach ${endpoint}. Is the backend running? (${err.message})`);
  }
  if (res.status === 401) throw new Error(`Login failed (401). Check your email and password.`);
  if (!res.ok) throw new Error(`Login failed (${res.status}).`);
  const cookie = extractCookie(res.headers.get('set-cookie'));
  if (!cookie) throw new Error('No authentication token received after login.');
  return cookie;
}

export function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const h of headers) {
    const match = h.match(/quorum_token=([^;]+)/);
    if (match) return `quorum_token=${match[1]}`;
  }
  return null;
}

export function resolveCredentials(options) {
  const email = options.email || process.env.QUORUM_EMAIL;
  const password = options.password || process.env.QUORUM_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Email and password are required. Use --email/--password or set QUORUM_EMAIL/QUORUM_PASSWORD env vars.'
    );
  }
  return { email, password };
}
