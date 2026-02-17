import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken, setTokenCookie, clearTokenCookie } from '../utils/auth.js';
import { createValidationMiddleware } from '../utils/validation.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

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

router.post('/register', createValidationMiddleware(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.validatedBody;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = new User({ email, username, passwordHash: password });
    await user.save();

    const token = signToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({ user: user.toPublicJSON() });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', createValidationMiddleware(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    setTokenCookie(res, token);

    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

export default router;
