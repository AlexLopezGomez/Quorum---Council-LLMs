import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken, setTokenCookie, clearTokenCookie } from '../utils/auth.js';
import { createValidationMiddleware } from '../utils/validation.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const authRateLimitWindowMs = 15 * 60 * 1000;
const authRateLimitMessage = { error: 'Too many authentication attempts. Please try again later.' };

const registerLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitMessage,
});

const loginLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitMessage,
});

const registerSchema = z.object({
  email: z.string().email().max(255),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', registerLimiter, createValidationMiddleware(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.validatedBody;
    logger.info('auth.register.attempt', logger.withReq(req, { metadata: { email, username } }));

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      logger.audit(
        'auth.register.failed',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 409,
          metadata: { reason: 'email_in_use', email },
        })
      );
      return res.status(409).json({ error: 'Email already in use' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      logger.audit(
        'auth.register.failed',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 409,
          metadata: { reason: 'username_taken', username },
        })
      );
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = new User({ email, username, passwordHash: password });
    await user.save();

    const token = signToken(user._id);
    setTokenCookie(res, token);

    logger.audit(
      'auth.register.success',
      logger.withReq(req, {
        actor: 'user',
        userId: user._id,
        statusCode: 201,
        metadata: { username },
      })
    );
    res.status(201).json({ user: user.toPublicJSON() });
  } catch (err) {
    logger.error(
      'auth.register.error',
      logger.withReq(req, {
        statusCode: 500,
        metadata: { message: err.message },
      })
    );
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', loginLimiter, createValidationMiddleware(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    logger.info('auth.login.attempt', logger.withReq(req, { metadata: { email } }));

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      logger.audit(
        'auth.login.failed',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 401,
          metadata: { reason: 'invalid_credentials', email },
        })
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    setTokenCookie(res, token);

    logger.audit(
      'auth.login.success',
      logger.withReq(req, {
        actor: 'user',
        userId: user._id,
        statusCode: 200,
        metadata: { username: user.username },
      })
    );
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    logger.error(
      'auth.login.error',
      logger.withReq(req, {
        statusCode: 500,
        metadata: { message: err.message },
      })
    );
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  logger.audit(
    'auth.logout.success',
    logger.withReq(req, {
      actor: req.user?._id ? 'user' : 'unknown',
      userId: req.user?._id,
      statusCode: 200,
    })
  );
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
  logger.info('auth.me.fetched', logger.withReq(req, { userId: req.user._id, statusCode: 200 }));
  res.json({ user: req.user.toPublicJSON() });
});

export default router;
