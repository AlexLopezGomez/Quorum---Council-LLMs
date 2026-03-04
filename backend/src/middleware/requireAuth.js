import { COOKIE_NAME, verifyToken } from '../utils/auth.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';
import { requireServiceAuth } from './requireServiceAuth.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    logger.audit('auth.token.missing', logger.withReq(req, { actor: 'unknown', statusCode: 401 }));
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash -apiKeys');

    if (!user) {
      logger.audit(
        'auth.token.invalid',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 401,
          metadata: { reason: 'user_not_found' },
        })
      );
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Reject tokens issued before a password change or forced logout
    // by checking the tokenVersion embedded in the JWT payload.
    if (payload.tokenVersion !== user.tokenVersion) {
      logger.audit(
        'auth.token.revoked',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 401,
          metadata: { reason: 'token_version_mismatch' },
        })
      );
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = user;
    logger.info('auth.token.valid', logger.withReq(req, { userId: user._id }));
    next();
  } catch (error) {
    logger.audit(
      'auth.token.invalid',
      logger.withReq(req, {
        actor: 'unknown',
        statusCode: 401,
        metadata: { reason: 'verification_failed', message: error.message },
      })
    );
    return res.status(401).json({ error: 'Authentication required' });
  }
}

export async function requireAnyAuth(req, res, next) {
  const hasCookie = !!req.cookies?.[COOKIE_NAME];
  const hasBearer = req.headers['authorization']?.startsWith('Bearer ');

  if (hasCookie) return requireAuth(req, res, next);
  if (hasBearer) return requireServiceAuth(req, res, next);

  logger.audit('auth.missing', logger.withReq(req, { actor: 'unknown', statusCode: 401 }));
  return res.status(401).json({ error: 'Authentication required' });
}
