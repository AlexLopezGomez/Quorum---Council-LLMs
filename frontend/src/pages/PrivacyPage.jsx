import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function PrivacyPage() {
    return (
        <div className="landing-root" style={{ minHeight: '100vh', padding: '0 0 80px' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 0' }}>
                <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '40px' }}>
                    &larr; Back to Quorum
                </Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '8px' }}>Privacy Policy</h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-ter)', marginBottom: '48px' }}>Last updated: March 2026</p>

                <Section title="Overview">
                    Quorum is currently in pre-launch. This policy describes how we handle information
                    submitted through our waitlist. A full privacy policy will be published prior to
                    general availability.
                </Section>
                <Section title="Information We Collect">
                    We collect your email address when you submit it through our waitlist form. We do not
                    collect any other personal information and do not use tracking cookies or third-party
                    analytics scripts.
                </Section>
                <Section title="How We Use Your Information">
                    Your email is used solely to notify you when Quorum becomes available. We will not
                    sell, share, or transfer your email to third parties.
                </Section>
                <Section title="Data Storage">
                    Waitlist entries are stored in a secured database. We retain your email until you
                    request deletion or until the waitlist is closed.
                </Section>
                <Section title="Your Rights">
                    If you are in the EEA, you have the right to access, correct, or delete your personal
                    data. Contact us at the address below.
                </Section>
                <Section title="Contact">
                    For privacy questions:{' '}
                    <a href="mailto:alex@testquorum.com" style={{ color: 'var(--accent)' }}>alex@testquorum.com</a>
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>{title}</h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-sec)', lineHeight: 1.7 }}>{children}</p>
        </div>
    );
}
