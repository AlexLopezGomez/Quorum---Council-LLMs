import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function TermsPage() {
    return (
        <div className="landing-root" style={{ minHeight: '100vh', padding: '0 0 80px' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 0' }}>
                <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '40px' }}>
                    &larr; Back to Quorum
                </Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '8px' }}>Terms of Service</h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-ter)', marginBottom: '48px' }}>Last updated: March 2026</p>

                <Section title="Pre-Launch Notice">
                    Quorum is in pre-launch. These terms apply to use of the waitlist and this website.
                    Full terms will be published prior to general availability.
                </Section>
                <Section title="Use of This Website">
                    You may only use this website for lawful purposes. You may not attempt to circumvent
                    security measures, submit false information, or interfere with site operation.
                </Section>
                <Section title="Waitlist">
                    Submitting your email does not guarantee access. We reserve the right to determine
                    eligibility and timing of access at our sole discretion.
                </Section>
                <Section title="Intellectual Property">
                    All content on this website is the property of Quorum and protected by applicable
                    intellectual property laws.
                </Section>
                <Section title="Disclaimer">
                    This website is provided "as is" without warranties of any kind. We disclaim all
                    liability for damages arising from use of this website.
                </Section>
                <Section title="Contact">
                    For questions about these terms:{' '}
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
