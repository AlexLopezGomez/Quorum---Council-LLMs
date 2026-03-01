import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import { nanoid } from 'nanoid';
import { ServiceKey } from '../models/ServiceKey.js';
import { logger } from '../utils/logger.js';

const router = Router();

const VALID_SCOPES = ['ingest', 'evaluate'];
const KEY_PREFIX = 'qk_';

function generateRawKey() {
  return KEY_PREFIX + randomBytes(24).toString('base64url');
}

function hashKey(rawKey) {
  return createHash('sha256').update(rawKey).digest('hex');
}

function toPublic(key) {
  return {
    id: key._id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
  };
}

// POST /api/service-keys — create a new service key
router.post('/', async (req, res) => {
  const { name, scopes = ['ingest'] } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s));
  if (invalidScopes.length > 0) {
    return res.status(400).json({ error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid: ${VALID_SCOPES.join(', ')}` });
  }

  try {
    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 14) + '...';

    const serviceKey = new ServiceKey({
      keyHash,
      keyPrefix,
      name: name.trim(),
      userId: req.user._id,
      scopes,
    });

    await serviceKey.save();

    logger.audit('service_key.created', logger.withReq(req, {
      actor: 'user',
      userId: req.user._id,
      metadata: { keyPrefix, scopes },
    }));

    res.status(201).json({ ...toPublic(serviceKey), key: rawKey });
  } catch (err) {
    logger.error('service_key.create_failed', logger.withReq(req, { metadata: { message: err.message } }));
    res.status(500).json({ error: 'Failed to create service key' });
  }
});

// GET /api/service-keys — list keys for current user
router.get('/', async (req, res) => {
  try {
    const keys = await ServiceKey.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ keys: keys.map(toPublic) });
  } catch (err) {
    logger.error('service_key.list_failed', logger.withReq(req, { metadata: { message: err.message } }));
    res.status(500).json({ error: 'Failed to list service keys' });
  }
});

// DELETE /api/service-keys/:keyId — revoke a key
router.delete('/:keyId', async (req, res) => {
  try {
    const serviceKey = await ServiceKey.findOne({ _id: req.params.keyId, userId: req.user._id });

    if (!serviceKey) {
      return res.status(404).json({ error: 'Service key not found' });
    }

    if (serviceKey.revokedAt) {
      return res.status(409).json({ error: 'Service key already revoked' });
    }

    serviceKey.revokedAt = new Date();
    await serviceKey.save();

    logger.audit('service_key.revoked', logger.withReq(req, {
      actor: 'user',
      userId: req.user._id,
      metadata: { keyPrefix: serviceKey.keyPrefix },
    }));

    res.json({ revoked: true, id: serviceKey._id });
  } catch (err) {
    logger.error('service_key.revoke_failed', logger.withReq(req, { metadata: { message: err.message } }));
    res.status(500).json({ error: 'Failed to revoke service key' });
  }
});

export default router;
