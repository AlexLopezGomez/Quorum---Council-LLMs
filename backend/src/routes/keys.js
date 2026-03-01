import { Router } from 'express';
import { User } from '../models/User.js';
import { encrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

const router = Router();
const VALID_PROVIDERS = ['openai', 'anthropic', 'google'];

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('apiKeys');
    const configured = {
      openai: !!user.apiKeys?.openai,
      anthropic: !!user.apiKeys?.anthropic,
      google: !!user.apiKeys?.google,
    };
    res.json({ configured });
  } catch (err) {
    logger.error('keys.get.failed', logger.withReq(req, { metadata: { message: err.message } }));
    res.status(500).json({ error: 'Failed to retrieve key configuration' });
  }
});

router.put('/:provider', async (req, res) => {
  const { provider } = req.params;
  if (!VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` });
  }

  const { key } = req.body;
  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ error: 'key is required' });
  }

  try {
    const encrypted = encrypt(key.trim());
    await User.updateOne(
      { _id: req.user._id },
      { $set: { [`apiKeys.${provider}`]: encrypted } }
    );
    logger.audit('keys.stored', logger.withReq(req, { actor: 'user', userId: req.user._id, metadata: { provider } }));
    res.json({ configured: true, provider });
  } catch (err) {
    logger.error('keys.put.failed', logger.withReq(req, { metadata: { provider, message: err.message } }));
    res.status(500).json({ error: 'Failed to store key' });
  }
});

router.delete('/:provider', async (req, res) => {
  const { provider } = req.params;
  if (!VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` });
  }

  try {
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { [`apiKeys.${provider}`]: '' } }
    );
    logger.audit('keys.deleted', logger.withReq(req, { actor: 'user', userId: req.user._id, metadata: { provider } }));
    res.json({ configured: false, provider });
  } catch (err) {
    logger.error('keys.delete.failed', logger.withReq(req, { metadata: { provider, message: err.message } }));
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

export default router;
