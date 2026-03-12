import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SocialAuth from './SocialAuth';

export default function SignInForm() {
  const navigate = useNavigate();
  const { isLoading, error, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState(null);

  const displayError = validationError || error;

  async function handleSubmit(e) {
    e.preventDefault();
    setValidationError(null);

    if (!email) {
      setValidationError('Please enter your email address');
      return;
    }
    if (!password || password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    await login(email, password);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Welcome back</h1>
      <p className="text-sm text-text-secondary mb-7">Sign in to your Quorum account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          placeholder="you@example.com"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          placeholder="Min. 8 characters"
        />

        <Link to="/forgot-password" className="text-xs text-text-secondary hover:text-text-primary transition-colors">
          Forgot password?
        </Link>

        {displayError && (
          <p className="text-sm text-verdict-fail">{displayError}</p>
        )}

        <SocialAuth />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </button>
      </form>
    </>
  );
}
