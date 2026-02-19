import { COOKIE_NAME, verifyToken } from '../utils/auth.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    logger.audit('auth.token.missing', logger.withReq(req, { actor: 'unknown', statusCode: 401 }));
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');

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
