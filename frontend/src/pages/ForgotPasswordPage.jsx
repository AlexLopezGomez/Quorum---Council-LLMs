import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { authApi } from '../lib/api';

const INPUT_CLASS = 'w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      {submitted ? (
        <>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Check your inbox</h1>
          <p className="text-sm text-text-secondary mb-7">
            If an account exists for <span className="text-text-primary font-medium">{email}</span>, you'll receive a reset link shortly.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Reset your password</h1>
          <p className="text-sm text-text-secondary mb-7">
            Enter your email and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={INPUT_CLASS}
              placeholder="you@example.com"
              autoFocus
            />

            {error && <p className="text-sm text-verdict-fail">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Send reset link
            </button>
          </form>

          <p className="mt-6 text-sm text-text-secondary">
            Remember your password?{' '}
            <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
