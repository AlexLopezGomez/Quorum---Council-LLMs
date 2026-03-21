import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'cookie-consent';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const acceptRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      acceptRef.current?.focus();
    }
  }, [visible]);

  if (!visible) return null;

  const dismiss = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    if (prefersReducedMotion()) {
      setVisible(false);
      return;
    }
    setExiting(true);
    setTimeout(() => setVisible(false), 320);
  };

  const animationStyle = prefersReducedMotion()
    ? {}
    : exiting
    ? { animation: 'cookieBannerOut 0.3s ease-in forwards' }
    : { animation: 'cookieBannerIn 0.35s ease-out forwards' };

  return (
    <>
      <style>{`
        @keyframes cookieBannerIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cookieBannerOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(12px); }
        }
      `}</style>

      <div
        role="dialog"
        aria-label="Cookie consent"
        aria-modal="false"
        style={{ position: 'fixed', right: '1.5rem', bottom: '1.5rem', zIndex: 50, ...animationStyle }}
      >
        <div
          style={{
            width: '20rem',
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDD9D1',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 4px 24px 0 rgba(59,60,54,0.10)',
            fontFamily: "'New York', ui-serif, Georgia, serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d99058"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: '1px' }}
              aria-hidden="true"
            >
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" />
              <path d="M16 15.5v.01" />
              <path d="M12 12v.01" />
            </svg>

            <div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#3b3c36', lineHeight: 1.4 }}>
                We use cookies
              </p>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#6e6e66', lineHeight: 1.6 }}>
                We use cookies to improve your experience and analyse site usage. See our{' '}
                <Link
                  to="/privacy"
                  style={{ color: '#d99058', textDecoration: 'underline', textDecorationColor: 'rgba(217,144,88,0.4)' }}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => dismiss('declined')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                color: '#6e6e66',
                cursor: 'pointer',
                borderRadius: '0.5rem',
                fontFamily: 'inherit',
                transition: 'color 0.15s ease',
                minHeight: '44px',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#3b3c36'}
              onMouseLeave={e => e.currentTarget.style.color = '#6e6e66'}
            >
              Decline
            </button>

            <button
              ref={acceptRef}
              onClick={() => dismiss('accepted')}
              style={{
                backgroundColor: '#d99058',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.5rem 1.125rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.15s ease',
                minHeight: '44px',
                outline: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c47d45'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#d99058'}
              onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px #d99058, 0 0 0 4px rgba(217,144,88,0.25)'; }}
              onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
