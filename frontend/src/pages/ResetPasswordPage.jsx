import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { authApi } from '../lib/api';

const INPUT_CLASS = 'w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) return null;

  return (
    <AuthLayout>
      {success ? (
        <div className="flex flex-col items-start gap-4">
          <CheckCircle size={36} className="text-verdict-pass" />
          <h1 className="text-2xl font-semibold text-text-primary">Password updated</h1>
          <p className="text-sm text-text-secondary">Redirecting you to sign in...</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Set a new password</h1>
          <p className="text-sm text-text-secondary mb-7">Choose a password with at least 8 characters.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={INPUT_CLASS}
              placeholder="New password (min. 8 characters)"
              autoFocus
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={INPUT_CLASS}
              placeholder="Confirm new password"
            />

            {error && <p className="text-sm text-verdict-fail">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !password || !confirm}
              className="w-full py-3 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Update password
            </button>
          </form>

          <p className="mt-6 text-sm text-text-secondary">
            <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
