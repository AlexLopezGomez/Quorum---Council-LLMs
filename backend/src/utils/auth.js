import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'quorum-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'quorum-client';
export const COOKIE_NAME = 'quorum_token';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE
  || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax');

export function signToken(userId, tokenVersion) {
  return jwt.sign({ sub: userId, tokenVersion }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: COOKIE_SAME_SITE,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: COOKIE_SAME_SITE,
    path: '/',
  });
}
