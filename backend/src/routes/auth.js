import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken, setTokenCookie, clearTokenCookie } from '../utils/auth.js';
import { createValidationMiddleware } from '../utils/validation.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { logger } from '../utils/logger.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email.js';
import { getFirebaseAuth } from '../config/firebaseAdmin.js';

const router = Router();
const authRateLimitWindowMs = 15 * 60 * 1000;
const authRateLimitMessage = { error: 'Too many authentication attempts. Please try again later.' };

const BCRYPT_ROUNDS = 12;
const LOGIN_MAX_FAILURES = 10;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
const VERIFICATION_TOKEN_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24 hours

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

const forgotPasswordLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitMessage,
});

const resetPasswordLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: 10,
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

const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// Lazy-initialized dummy hash used to keep login response time constant
// when a user account does not exist (prevents timing-based enumeration).
let _dummyHash = null;
async function getDummyHash() {
  if (!_dummyHash) _dummyHash = await bcrypt.hash('__dummy_timing_prevention__', BCRYPT_ROUNDS);
  return _dummyHash;
}

function generateToken() {
  const raw = randomBytes(32).toString('hex');
  const hashed = createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
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
      logger.audit(
        'auth.register.failed',
        logger.withReq(req, {
          actor: 'unknown',
          statusCode: 400,
          metadata: {
            reason: existingEmail ? 'email_in_use' : 'username_taken',
            email,
          },
        })
      );
      return res.status(400).json({ error: 'An account with these details already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { raw: verificationRaw, hashed: verificationHashed } = generateToken();

    const user = new User({
      email,
      username,
      passwordHash,
      emailVerificationToken: verificationHashed,
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MS),
    });
    await user.save();

    // Send verification email — non-blocking, registration succeeds regardless
    sendVerificationEmail(email, verificationRaw).catch(() => {});

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

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  createValidationMiddleware(forgotPasswordSchema),
  async (req, res) => {
    try {
      const { email } = req.validatedBody;
      logger.info('auth.forgot_password.attempt', logger.withReq(req, { metadata: { email } }));

      const user = await User.findOne({ email });

      // Always return 200 to prevent email enumeration
      if (!user) {
        return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
      }

      const { raw, hashed } = generateToken();
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            resetPasswordToken: hashed,
            resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_EXPIRES_MS),
          },
        }
      );

      await sendPasswordResetEmail(email, raw);

      logger.audit('auth.forgot_password.sent', logger.withReq(req, {
        actor: 'user',
        userId: user._id,
        statusCode: 200,
      }));
      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (err) {
      logger.error('auth.forgot_password.error', logger.withReq(req, {
        statusCode: 500,
        metadata: { message: err.message },
      }));
      res.status(500).json({ error: 'Failed to send reset email' });
    }
  }
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  createValidationMiddleware(resetPasswordSchema),
  async (req, res) => {
    try {
      const { token, password } = req.validatedBody;
      const hashed = createHash('sha256').update(token).digest('hex');

      // select:false only affects output projections, not query predicates — can query by hashed token directly
      const targetUser = await User.findOne({
        resetPasswordToken: hashed,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!targetUser) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const newPasswordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await User.updateOne(
        { _id: targetUser._id },
        {
          $set: { passwordHash: newPasswordHash },
          $inc: { tokenVersion: 1 },
          $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
        }
      );

      logger.audit('auth.reset_password.success', logger.withReq(req, {
        actor: 'user',
        userId: targetUser._id,
        statusCode: 200,
      }));
      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      logger.error('auth.reset_password.error', logger.withReq(req, {
        statusCode: 500,
        metadata: { message: err.message },
      }));
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
);

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const hashed = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: true },
        $unset: { emailVerificationToken: '', emailVerificationExpires: '' },
      }
    );

    logger.audit('auth.email_verified', logger.withReq(req, {
      actor: 'user',
      userId: user._id,
      statusCode: 200,
    }));
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    logger.error('auth.verify_email.error', logger.withReq(req, {
      statusCode: 500,
      metadata: { message: err.message },
    }));
    res.status(500).json({ error: 'Email verification failed' });
  }
});

router.post('/google', loginLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken is required' });
    }

    let decoded;
    try {
      decoded = await getFirebaseAuth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }

    const { uid, email, name, picture, email_verified } = decoded;

    if (!email) {
      return res.status(400).json({ error: 'Google account must have an email address' });
    }

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        await User.updateOne({ _id: user._id }, { $set: { firebaseUid: uid, provider: 'google' } });
        user.firebaseUid = uid;
        user.provider = 'google';
      }
    }

    if (!user) {
      const base = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 26) || 'user';
      let username;
      let attempts = 0;
      while (attempts < 10) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const candidate = `${base}${suffix}`;
        const exists = await User.findOne({ username: candidate });
        if (!exists) { username = candidate; break; }
        attempts++;
      }
      if (!username) username = `user${Date.now()}`;

      user = new User({
        email,
        username,
        passwordHash: undefined,
        emailVerified: email_verified ?? true,
        provider: 'google',
        firebaseUid: uid,
      });
      await user.save();

      logger.audit('auth.google.register', logger.withReq(req, {
        actor: 'user',
        userId: user._id,
        statusCode: 201,
        metadata: { username },
      }));
    } else {
      logger.audit('auth.google.login', logger.withReq(req, {
        actor: 'user',
        userId: user._id,
        statusCode: 200,
      }));
    }

    const token = signToken(user._id, user.tokenVersion);
    setTokenCookie(res, token);
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    logger.error('auth.google.error', logger.withReq(req, {
      statusCode: 500,
      metadata: { message: err.message },
    }));
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

router.post('/resend-verification', requireAuth, forgotPasswordLimiter, async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const { raw, hashed } = generateToken();
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          emailVerificationToken: hashed,
          emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MS),
        },
      }
    );

    await sendVerificationEmail(req.user.email, raw);

    logger.audit('auth.verification_resent', logger.withReq(req, {
      actor: 'user',
      userId: req.user._id,
      statusCode: 200,
    }));
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    logger.error('auth.resend_verification.error', logger.withReq(req, {
      statusCode: 500,
      metadata: { message: err.message },
    }));
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

export default router;
