import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 36px',
  background: 'linear-gradient(135deg, #d99058, #c47d45)',
  color: '#fff',
  fontSize: '0.9375rem',
  fontWeight: 600,
  borderRadius: '10px',
  textDecoration: 'none',
  transition: 'opacity 0.15s ease',
  minWidth: '220px',
};

export default function NotFoundPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const loggedIn = !isLoading && isAuthenticated;
  const primaryTo = loggedIn ? '/app' : '/';
  const primaryLabel = loggedIn ? 'Back to dashboard' : 'Back to Quorum';
  const secondaryTo = loggedIn ? '/' : '/login';
  const secondaryLabel = loggedIn ? 'Back to home' : 'Sign in';

  return (
    <div
      className="landing-root"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
    >
      <main style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>
        <p
          aria-hidden="true"
          style={{
            fontSize: 'clamp(5rem, 20vw, 9rem)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1,
            margin: 0,
            letterSpacing: '-0.04em',
          }}
        >
          404
        </p>

        <div
          style={{
            width: '80px',
            height: '1px',
            background: 'var(--accent)',
            margin: '24px auto 0',
          }}
        />

        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginTop: '32px',
            marginBottom: '8px',
          }}
        >
          This page doesn't exist.
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--text-sec)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          The URL may have been moved or mistyped.
        </p>

        <div style={{ marginTop: '40px' }}>
          <Link to={primaryTo} style={btnStyle}>
            {primaryLabel}
          </Link>
        </div>

        <div style={{ marginTop: '16px' }}>
          <Link
            to={secondaryTo}
            aria-label={secondaryLabel}
            style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none' }}
          >
            ← {secondaryLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
