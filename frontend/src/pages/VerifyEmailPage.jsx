import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { authApi } from '../lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed');
      });
  }, [token]);

  return (
    <AuthLayout>
      <div className="flex flex-col items-start gap-4">
        {status === 'loading' && (
          <>
            <Loader2 size={32} className="animate-spin text-accent" />
            <h1 className="text-2xl font-semibold text-text-primary">Verifying your email...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={36} className="text-verdict-pass" />
            <h1 className="text-2xl font-semibold text-text-primary">Email verified</h1>
            <p className="text-sm text-text-secondary">{message}</p>
            <Link
              to="/login"
              className="mt-2 py-2.5 px-6 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors"
            >
              Sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={36} className="text-verdict-fail" />
            <h1 className="text-2xl font-semibold text-text-primary">Verification failed</h1>
            <p className="text-sm text-text-secondary">{message}</p>
            <p className="text-sm text-text-secondary">
              <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
