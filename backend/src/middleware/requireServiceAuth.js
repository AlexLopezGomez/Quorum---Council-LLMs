import { createHash } from 'crypto';
import { ServiceKey } from '../models/ServiceKey.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

function hashKey(rawKey) {
  return createHash('sha256').update(rawKey).digest('hex');
}

function extractBearer(req) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function hasAnyScope(serviceKey, requiredScopes) {
  const scopes = Array.isArray(serviceKey?.scopes) ? serviceKey.scopes : [];
  return requiredScopes.some((scope) => scopes.includes(scope));
}

export async function requireServiceAuth(req, res, next) {
  const rawKey = extractBearer(req);

  if (!rawKey) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const keyHash = hashKey(rawKey);
    const serviceKey = await ServiceKey.findOne({ keyHash });

    if (!serviceKey || serviceKey.revokedAt) {
      logger.audit('auth.service_key.invalid', logger.withReq(req, { actor: 'unknown', statusCode: 401 }));
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(serviceKey.userId).select('-passwordHash -apiKeys');
    if (!user) {
      logger.audit('auth.service_key.user_missing', logger.withReq(req, { actor: 'unknown', statusCode: 401 }));
      return res.status(401).json({ error: 'Authentication required' });
    }

    ServiceKey.updateOne({ _id: serviceKey._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

    logger.audit('auth.service_key.valid', logger.withReq(req, { actor: 'service', userId: user._id, metadata: { keyPrefix: serviceKey.keyPrefix } }));

    req.user = user;
    req.serviceKey = serviceKey;
    next();
  } catch (error) {
    logger.audit('auth.service_key.error', logger.withReq(req, { actor: 'unknown', statusCode: 401, metadata: { message: error.message } }));
    return res.status(401).json({ error: 'Authentication required' });
  }
}

export function requireServiceScope(scopes) {
  const requiredScopes = Array.isArray(scopes) ? scopes : [scopes];

  return (req, res, next) => {
    if (!req.serviceKey) return next();

    if (!hasAnyScope(req.serviceKey, requiredScopes)) {
      logger.audit(
        'auth.service_key.scope_denied',
        logger.withReq(req, {
          actor: 'service',
          statusCode: 403,
          userId: req.user?._id,
          metadata: {
            keyPrefix: req.serviceKey.keyPrefix,
            requiredScopes,
            grantedScopes: req.serviceKey.scopes || [],
          },
        })
      );
      return res.status(403).json({ error: 'Insufficient service key scope' });
    }

    return next();
  };
}
