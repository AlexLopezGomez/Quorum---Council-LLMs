import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Resend } from 'resend';
import WaitlistEntry from '../models/WaitlistEntry.js';
import { createValidationMiddleware } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Please try again later.' },
});

const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
});

const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/', waitlistLimiter, createValidationMiddleware(waitlistSchema), async (req, res) => {
  try {
    const { email } = req.validatedBody;

    const existing = await WaitlistEntry.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'This email is already on the waitlist.' });
    }

    await WaitlistEntry.create({ email });

    logger.audit('waitlist.signup.created', { actor: 'system', metadata: { email } });

    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: email,
        subject: "🎉 You're on the list! Welcome to Quorum",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <p>Hi there,</p>
            <p>Thank you so much for your interest in Quorum! We're absolutely thrilled to have you on our waitlist.</p>
            <p>We're working hard on getting things ready, and we'll reach out to you as soon as it's your turn to join.</p>
            <p>Warmly,<br><strong>The Quorum Team</strong></p>
          </div>
        `,
        text: "Hi there,\n\nThank you so much for your interest in Quorum! We're absolutely thrilled to have you on our waitlist.\n\nWe're working hard on getting things ready, and we'll reach out to you as soon as it's your turn to join.\n\nWarmly,\nThe Quorum Team",
      }).catch((err) => {
        logger.error('waitlist.email.failed', { metadata: { email, message: err.message } });
      });
    }

    return res.status(201).json({ message: 'You have been added to the waitlist.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This email is already on the waitlist.' });
    }
    logger.error('waitlist.signup.failed', { metadata: { message: error.message } });
    return res.status(500).json({ error: 'Failed to join the waitlist. Please try again.' });
  }
});

export default router;
