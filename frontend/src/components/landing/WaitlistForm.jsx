import { useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();

        if (!email.trim()) {
            setStatus('error');
            setErrorMessage('Email is required');
            return;
        }

        if (!EMAIL_RE.test(email)) {
            setStatus('error');
            setErrorMessage('Please enter a valid email');
            return;
        }

        setStatus('loading');

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            if (res.ok) {
                setStatus('success');
                return;
            }

            if (res.status === 409) {
                setStatus('error');
                setErrorMessage("You're already on the list.");
                return;
            }

            setStatus('error');
            setErrorMessage('Something went wrong. Please try again.');
        } catch {
            setStatus('error');
            setErrorMessage('Network error. Please check your connection.');
        }
    }

    if (status === 'success') {
        return (
            <div className="max-w-md mx-auto text-center animate-fadeInUp">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    You're on the list
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>
                    We'll reach out when it's your turn.
                </p>
            </div>
        );
    }

    const isLoading = status === 'loading';

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === 'error') setStatus('idle');
                    }}
                    placeholder="you@company.com"
                    className="waitlist-input flex-1"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'var(--accent)' }}
                    onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                    onMouseLeave={e => { if (!isLoading) e.currentTarget.style.background = 'var(--accent)'; }}
                >
                    {isLoading ? 'Joining...' : 'Join Waitlist'}
                </button>
            </div>
            {status === 'error' && (
                <p className="text-xs text-red-500 mt-2 text-center">{errorMessage}</p>
            )}
        </form>
    );
}
