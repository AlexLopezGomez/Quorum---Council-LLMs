import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified || dismissed || user.provider !== 'local') return null;

  async function handleResend() {
    setSending(true);
    try {
      await authApi.resendVerification();
      setSent(true);
    } catch {
      // silent — user can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border border-surface-border text-sm">
      <Mail size={15} className="text-accent shrink-0" />
      <p className="flex-1 text-text-secondary">
        Please verify your email address.{' '}
        {sent ? (
          <span className="text-verdict-pass">Verification email sent!</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1 disabled:opacity-50"
          >
            {sending && <Loader2 size={12} className="animate-spin" />}
            Resend email
          </button>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
