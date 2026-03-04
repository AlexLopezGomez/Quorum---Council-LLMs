import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import SignInForm from '../components/auth/SignInForm';
import SignUpFlow from '../components/auth/SignUpFlow';
import ProfilePreview from '../components/auth/ProfilePreview';

const TABS = [
  { key: 'login', label: 'Sign in' },
  { key: 'register', label: 'Create account' },
];

const LINK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

function SignInHero() {
  return (
    <div className="hidden md:flex flex-col items-center justify-center p-10 md:p-12 bg-surface-secondary">
      <div className="max-w-[240px] text-center">
        <div className="w-10 h-10 mx-auto mb-6 text-text-primary">
          {LINK_ICON}
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Evaluate your RAG pipeline with confidence
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Council-of-LLMs evaluation, adaptive routing, and real-time cost tracking — all in one platform.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage({ defaultTab = 'login' }) {
  const navigate = useNavigate();
  const { isAuthenticated, clearError } = useAuth();

  const [tab, setTab] = useState(defaultTab);
  const [previewUsername, setPreviewUsername] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  function switchTab(key) {
    setTab(key);
    setPreviewUsername('');
    clearError();
  }

  const rightPanel = tab === 'register'
    ? <ProfilePreview username={previewUsername} />
    : <SignInHero />;

  return (
    <AuthLayout rightPanel={rightPanel}>
      <div className="w-10 h-10 mb-7 text-text-primary">
        {LINK_ICON}
      </div>

      <div className="flex border-b border-surface-border mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'login'
        ? <SignInForm />
        : <SignUpFlow onUsernameChange={setPreviewUsername} />
      }
    </AuthLayout>
  );
}
