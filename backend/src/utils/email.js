import { Resend } from 'resend';
import { logger } from './logger.js';

const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function send(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    // Dev fallback: log to console instead of sending
    logger.warn('email.send.skipped', {
      metadata: { reason: 'RESEND_API_KEY or RESEND_FROM_EMAIL not configured', to: payload.to, subject: payload.subject },
    });
    return;
  }

  const client = new Resend(apiKey);
  const { error } = await client.emails.send({ from, ...payload });

  if (error) {
    logger.error('email.send.failed', { metadata: { to: payload.to, subject: payload.subject, error: error.message } });
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(to, rawToken) {
  const link = `${APP_URL}/reset-password?token=${rawToken}`;
  await send({
    to,
    subject: 'Reset your Quorum password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Reset your password</h2>
        <p style="color:#6e6e66;margin-bottom:24px">Click the button below to reset your Quorum password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:#d99058;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:600">Reset password</a>
        <p style="color:#9e9d97;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to, rawToken) {
  const link = `${APP_URL}/verify-email?token=${rawToken}`;
  await send({
    to,
    subject: 'Verify your Quorum email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Verify your email</h2>
        <p style="color:#6e6e66;margin-bottom:24px">Click the button below to verify your Quorum account. This link expires in 24 hours.</p>
        <a href="${link}" style="display:inline-block;background:#d99058;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:600">Verify email</a>
        <p style="color:#9e9d97;font-size:12px;margin-top:24px">If you didn't create a Quorum account, you can safely ignore this email.</p>
      </div>
    `,
  });
}
