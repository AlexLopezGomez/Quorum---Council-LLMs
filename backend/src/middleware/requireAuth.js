import { COOKIE_NAME, verifyToken } from '../utils/auth.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication required' });
  }
}
