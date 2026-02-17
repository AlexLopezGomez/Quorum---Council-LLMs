import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
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

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Please enter a valid email address');
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
      <p className="text-sm text-text-secondary mb-7">Sign in to your RAGScope account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          placeholder="you@example.com"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          placeholder="Min. 8 characters"
        />

        <button type="button" className="text-xs text-text-secondary hover:text-text-primary transition-colors">
          Forgot password?
        </button>

        {displayError && (
          <p className="text-sm text-verdict-fail">{displayError}</p>
        )}

        <SocialAuth />

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-11 h-11 rounded-full border border-surface-border bg-surface flex items-center justify-center text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </div>
      </form>
    </>
  );
}
