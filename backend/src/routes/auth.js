import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken, setTokenCookie, clearTokenCookie } from '../utils/auth.js';
import { createValidationMiddleware } from '../utils/validation.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const authRateLimitWindowMs = 15 * 60 * 1000;
const authRateLimitMessage = { error: 'Too many authentication attempts. Please try again later.' };

const BCRYPT_ROUNDS = 12;
const LOGIN_MAX_FAILURES = 10;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

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

// Lazy-initialized dummy hash used to keep login response time constant
// when a user account does not exist (prevents timing-based enumeration).
let _dummyHash = null;
async function getDummyHash() {
  if (!_dummyHash) _dummyHash = await bcrypt.hash('__dummy_timing_prevention__', BCRYPT_ROUNDS);
  return _dummyHash;
}

router.post('/register', registerLimiter, createValidationMiddleware(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.validatedBody;
    logger.info('auth.register.attempt', logger.withReq(req, { metadata: { email, username } }));

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
    ]);

    if (existingEmail || existingUsername) {
      // Return a single generic error regardless of which field conflicts
      // to prevent enumeration of registered emails or usernames.
      // TODO: For full protection, return 200 here and send a confirmation
      // email to the address — only create the account after verification.
      logger.audit(
        'auth.register.failed',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 409,
          metadata: {
            reason: existingEmail ? 'email_in_use' : 'username_taken',
            email,
          },
        })
      );
      return res.status(409).json({ error: 'An account with these details already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = new User({ email, username, passwordHash });
    await user.save();

    const token = signToken(user._id, user.tokenVersion);
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

    // Always run bcrypt regardless of whether the user exists to prevent
    // timing-based email enumeration.
    const candidateHash = user ? user.passwordHash : await getDummyHash();
    const isValid = await bcrypt.compare(password, candidateHash);

    if (!user || !isValid) {
      if (user) {
        const now = new Date();
        const failures = (user.loginFailures || 0) + 1;
        const update = { loginFailures: failures };

        if (failures >= LOGIN_MAX_FAILURES) {
          update.loginLockedUntil = new Date(now.getTime() + LOGIN_LOCKOUT_MS);
        }

        await User.updateOne({ _id: user._id }, { $set: update });
      }

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

    // Check per-account lockout after confirming password is correct to avoid
    // leaking whether an account is locked to unauthenticated callers.
    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      logger.audit(
        'auth.login.locked',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 429,
          metadata: { reason: 'account_locked', email },
        })
      );
      return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Please try again later.' });
    }

    await User.updateOne({ _id: user._id }, { $set: { loginFailures: 0, loginLockedUntil: null } });

    const token = signToken(user._id, user.tokenVersion);
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
