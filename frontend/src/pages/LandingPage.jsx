import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Brain, BarChart3, Zap, Menu, X, Upload, Users, TrendingDown,
    Shield, DollarSign, Activity, GitBranch, FileJson, ArrowRight,
    ArrowUpRight,
} from 'lucide-react';
import Prism from '../components/landing/Prism';
import BlurText from '../components/landing/BlurText';
import SpotlightCard from '../components/landing/SpotlightCard';
import WaitlistForm from '../components/landing/WaitlistForm';
import WaitlistModal from '../components/landing/WaitlistModal';
import RotatingText from '../components/landing/RotatingText';
import ReflectiveCard from '../components/landing/ReflectiveCard';
import MagicBento from '../components/landing/MagicBento';
import TerminalDemo from '../components/landing/TerminalDemo';
import './LandingPage.css';

const FEATURES = [
    {
        icon: <Brain size={22} />,
        color: '#8B5CF6',
        colorBg: 'rgba(139,92,246,0.08)',
        colorBorder: 'rgba(139,92,246,0.18)',
        label: 'Multi-Judge',
        title: 'Council of LLMs',
        desc: 'Three AI judges — OpenAI, Anthropic, and Gemini — evaluate independently. Claude Sonnet synthesizes a final verdict. Multi-model consensus eliminates single-model blind spots.',
    },
    {
        icon: <Zap size={22} />,
        color: '#d99058',
        colorBg: 'rgba(217,144,88,0.08)',
        colorBorder: 'rgba(217,144,88,0.2)',
        label: 'Smart Router',
        title: 'Adaptive Routing',
        desc: 'Risk-scores each test case and routes to the optimal strategy — saving up to 70% on evaluation costs without sacrificing verdict quality.',
    },
    {
        icon: <BarChart3 size={22} />,
        color: '#10A37F',
        colorBg: 'rgba(16,163,127,0.08)',
        colorBorder: 'rgba(16,163,127,0.18)',
        label: 'Analytics',
        title: 'Cost Intelligence',
        desc: 'Real-time cost tracking, per-strategy breakdowns, and savings estimates versus brute-force evaluation. Know exactly what every verdict costs.',
    },
    {
        icon: <Activity size={22} />,
        color: '#4285F4',
        colorBg: 'rgba(66,133,244,0.08)',
        colorBorder: 'rgba(66,133,244,0.18)',
        label: 'Real-Time',
        title: 'Live Streaming',
        desc: 'SSE streaming shows every judge decision as it happens. Full transparency into the evaluation process — no black boxes.',
    },
    {
        icon: <GitBranch size={22} />,
        color: '#F59E0B',
        colorBg: 'rgba(245,158,11,0.08)',
        colorBorder: 'rgba(245,158,11,0.18)',
        label: 'DevOps',
        title: 'CI/CD Integration',
        desc: 'Trigger evaluations from your pipeline. Get pass/fail verdicts with detailed breakdowns on every deployment.',
    },
    {
        icon: <FileJson size={22} />,
        color: '#EC4899',
        colorBg: 'rgba(236,72,153,0.08)',
        colorBorder: 'rgba(236,72,153,0.18)',
        label: 'Batch Testing',
        title: 'Structured Test Cases',
        desc: 'Upload JSON test suites with question, context, and answer triples. Batch-evaluate hundreds of cases in one run.',
    },
];

const HOW_IT_WORKS = [
    {
        number: '01',
        icon: <Upload size={20} />,
        title: 'Upload test cases',
        desc: 'Provide your RAG outputs as JSON — question, context, and answer triples. Batch hundreds of cases in a single run.',
    },
    {
        number: '02',
        icon: <Users size={20} />,
        title: 'Council evaluates',
        desc: 'Multiple AI judges score each case independently. The adaptive router selects the optimal strategy per test case.',
    },
    {
        number: '03',
        icon: <TrendingDown size={20} />,
        title: 'Get verdicts & savings',
        desc: 'Aggregated verdicts with per-judge breakdowns, cost analytics, and savings vs. brute-force evaluation.',
    },
];

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('');

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const ids = ['demo', 'features', 'how-it-works'];
        const observers = ids.map(id => {
            const el = document.getElementById(id);
            if (!el) return null;
            const obs = new IntersectionObserver(
                ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
                { rootMargin: '-40% 0px -55% 0px' }
            );
            obs.observe(el);
            return obs;
        });
        return () => observers.forEach(obs => obs?.disconnect());
    }, []);

    return (
        <div className="landing-root">


            {/* ─── Navigation ────────────────────────────────────── */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="nav-inner">

                    {/* Logo — clicks scroll to top */}
                    <button
                        className="nav-logo-area"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <img src="/favicon.svg" alt="" aria-hidden="true" className="nav-logo-icon" style={{ width: 110, height: 110 }} />
                        <span className="landing-logo">Quorum</span>
                        <span className="landing-logo-badge">Beta</span>
                    </button>

                    {/* Center pill island */}
                    <div className="nav-links-pill">
                        <a href="#demo" className={`nav-link ${activeSection === 'demo' ? 'active' : ''}`}>
                            Demo
                            <span className="nav-active-dot" />
                        </a>
                        <a href="#how-it-works" className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}>
                            How it works
                            <span className="nav-active-dot" />
                        </a>
                        <a href="#features" className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}>
                            Features
                            <span className="nav-active-dot" />
                        </a>
                    </div>

                    {/* CTA — split pill */}
                    <div className="nav-cta-wrap">
                        <button onClick={() => setIsModalOpen(true)} className="nav-cta-pill">
                            <span className="nav-cta-label">Join Waitlist</span>
                            <span className="nav-cta-badge">
                                <ArrowUpRight size={13} />
                            </span>
                        </button>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="nav-mobile-btn"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="mobile-menu">
                        <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="nav-link nav-link--mobile">Demo</a>
                        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="nav-link nav-link--mobile">How it works</a>
                        <a href="#features" onClick={() => setMobileMenuOpen(false)} className="nav-link nav-link--mobile">Features</a>
                        <button
                            onClick={() => { setMobileMenuOpen(false); setIsModalOpen(true); }}
                            className="nav-pill-btn nav-pill-btn--full"
                        >
                            <ArrowUpRight size={14} />
                            Join Waitlist
                        </button>
                    </div>
                )}
            </nav>

            {/* ─── Hero ──────────────────────────────────────────── */}
            <section id="waitlist" className="hero-section">
                <div className="threads-bg">
                    {/* Prism WebGL background — hueShift ≈ -0.5 rad pulls spectrum toward warm amber/copper */}
                    <Prism
                        animationType="rotate"
                        hueShift={-0.4}
                        colorFrequency={0.55}
                        glow={1.8}
                        bloom={1.4}
                        noise={0.06}
                        scale={4.0}
                        transparent={false}
                        timeScale={0.25}
                        suspendWhenOffscreen={true}
                    />
                </div>
                <div className="hero-radial" />

                <div className="hero-content max-w-5xl mx-auto px-6 text-center relative z-10">
                    <div className="hero-badge mb-8">
                        Open Source · RAG Evaluation Platform
                    </div>

                    <h1 className="hero-title mb-4">
                        The open-source way to{' '}
                        <span className="rotating-wrapper">
                            <RotatingText
                                texts={[
                                    'evaluate your RAG',
                                    'score faithfulness',
                                    'reduce costs',
                                    'trust your AI outputs',
                                ]}
                                rotationInterval={2500}
                                splitBy="words"
                                staggerDuration={0.04}
                            />
                        </span>
                    </h1>

                    <p className="hero-sub mt-6">
                        Orchestrate multiple AI judges to score faithfulness, groundedness, and relevance —
                        then adaptively route each test case to cut evaluation costs by up to 70%.
                    </p>

                    <div className="mt-10">
                        <WaitlistForm />
                    </div>

                    <p className="mt-5 text-xs" style={{ color: 'var(--text-ter)' }}>
                        No credit card required · Deploy in minutes · MIT licensed
                    </p>
                </div>

                <div className="hero-scroll-hint">
                    <div className="scroll-dot" />
                </div>
            </section>

            {/* ─── Terminal Demo ─────────────────────────────────── */}
            <section id="demo" className="terminal-section">
                <div className="section-container">
                    <SectionLabel>Live Demo</SectionLabel>
                    <BlurText
                        text="Watch evaluations stream in real time"
                        animateBy="words"
                        direction="bottom"
                        delay={80}
                        threshold={0.8}
                        className="section-heading mt-3 mb-12 justify-center"
                    />
                    <TerminalDemo />
                </div>
            </section>

            {/* ─── How It Works ──────────────────────────────────── */}
            <section id="how-it-works" className="steps-section">
                <div className="max-w-6xl mx-auto px-6">
                    <SectionLabel>How It Works</SectionLabel>
                    <h2 className="section-heading mt-3">Three steps to reliable evaluation</h2>

                    <div className="reflective-cards-row">
                        {HOW_IT_WORKS.map((step, i) => (
                            <ReflectiveCard key={step.number}>
                                <span className="reflective-step-number">{step.number}</span>
                                <div className="reflective-icon">{step.icon}</div>
                                <div className="reflective-title">{step.title}</div>
                                <div className="reflective-desc">{step.desc}</div>
                            </ReflectiveCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Features (MagicBento) ─────────────────────────── */}
            <section id="features" className="features-section">
                <div className="max-w-4xl mx-auto px-6 text-center mb-10">
                    <SectionLabel>Features</SectionLabel>
                    <h2 className="section-heading mt-3">Built for teams shipping RAG to production</h2>
                </div>

                <div className="max-w-5xl mx-auto px-6">
                    <MagicBento
                        cardData={FEATURES.map(f => ({
                            title: f.title,
                            description: f.desc,
                            label: f.label,
                            icon: f.icon,
                            accentColor: f.color,
                            colorBg: f.colorBg,
                            colorBorder: f.colorBorder,
                            color: 'var(--card-bg)',
                        }))}
                        textAutoHide
                        enableStars
                        enableSpotlight
                        enableBorderGlow
                        enableTilt={false}
                        enableMagnetism={false}
                        clickEffect
                        spotlightRadius={400}
                        particleCount={10}
                        glowColor="217, 144, 88"
                    />
                </div>
            </section>

            {/* ─── Why Quorum ────────────────────────────────────── */}
            <section className="pillars-section">
                <div className="max-w-6xl mx-auto px-6">
                    <SectionLabel>Why Quorum</SectionLabel>
                    <h2 className="section-heading mt-3">The foundation for trustworthy evaluation</h2>

                    <div className="pillars-grid mt-14">
                        <SpotlightCard
                            className="pillar-card"
                            spotlightColor="rgba(217, 144, 88, 0.1)"
                        >
                            <div className="pillar-icon"><Shield size={22} /></div>
                            <h3 className="pillar-title mt-5">Reliability</h3>
                            <p className="pillar-desc mt-2">Multi-judge consensus reduces hallucination risk. No single model decides your evaluation outcome.</p>
                        </SpotlightCard>
                        <SpotlightCard
                            className="pillar-card"
                            spotlightColor="rgba(217, 144, 88, 0.1)"
                        >
                            <div className="pillar-icon"><DollarSign size={22} /></div>
                            <h3 className="pillar-title mt-5">Cost Efficiency</h3>
                            <p className="pillar-desc mt-2">Adaptive routing sends simple cases to lightweight judges, reserving the full council for high-risk evaluations.</p>
                        </SpotlightCard>
                        <SpotlightCard
                            className="pillar-card"
                            spotlightColor="rgba(217, 144, 88, 0.1)"
                        >
                            <div className="pillar-icon"><Activity size={22} /></div>
                            <h3 className="pillar-title mt-5">Observability</h3>
                            <p className="pillar-desc mt-2">SSE live streaming shows every judge decision as it happens. Full transparency into the evaluation process.</p>
                        </SpotlightCard>
                    </div>
                </div>
            </section>

            {/* ─── CTA ───────────────────────────────────────────── */}
            <section className="cta-section">
                <div className="cta-glow" />
                <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
                    <h2 className="cta-heading">
                        Start evaluating your RAG pipeline today
                    </h2>
                    <p className="cta-sub mt-4">
                        Join the waitlist and be among the first to ship reliable, cost-efficient RAG evaluations.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="cta-waitlist-btn mt-10"
                    >
                        Join Waitlist <ArrowRight size={16} className="inline ml-1.5" />
                    </button>
                </div>
            </section>

            {/* ─── Footer ────────────────────────────────────────── */}
            <footer className="landing-footer">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="footer-row">
                        <div className="flex items-center gap-3">
                            <span className="landing-logo">Quorum</span>
                            <span className="text-sm" style={{ color: 'var(--text-ter)' }}>&copy; 2026 Quorum</span>
                        </div>
                        <div className="flex items-center gap-5">
                        <Link to="/privacy" className="footer-icon-link" style={{ fontSize: '0.8125rem' }}>
                            Privacy Policy
                        </Link>
                        <Link to="/terms" className="footer-icon-link" style={{ fontSize: '0.8125rem' }}>
                            Terms
                        </Link>
                    </div>
                    </div>
                </div>
            </footer>

            <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}

/* ─── Sub-components ──────────────────────────────────────── */

function SectionLabel({ children }) {
    return <p className="section-label">{children}</p>;
}

/* ─── Brand SVGs ──────────────────────────────────────────── */

