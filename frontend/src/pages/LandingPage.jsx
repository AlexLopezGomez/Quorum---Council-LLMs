import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Brain, BarChart3, Zap, Menu, X, Upload, Users, TrendingDown,
    Shield, DollarSign, Activity, GitBranch, FileJson, ArrowRight,
    ArrowUpRight, Github,
} from 'lucide-react';
import Prism from '../components/landing/Prism';
import BlurText from '../components/landing/BlurText';
import SpotlightCard from '../components/landing/SpotlightCard';
import RotatingText from '../components/landing/RotatingText';
import ReflectiveCard from '../components/landing/ReflectiveCard';
import MagicBento from '../components/landing/MagicBento';
import TerminalDemo from '../components/landing/TerminalDemo';
import ResearchPaperSection from '../components/landing/ResearchPaperSection';
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

const SCRAMBLING_ROWS = [
    { before: 'Trusting a single model\'s verdict', after: 'Consensus from three independent judges' },
    { before: 'Hallucinations slipping into production', after: 'Caught before every deployment' },
    { before: 'Paying full cost on every test case', after: 'Up to 70% saved with adaptive routing' },
    { before: 'Black-box evaluation results', after: 'Every judge decision, live and transparent' },
    { before: 'Manual quality checks per release', after: 'Batch hundreds of cases in one run' },
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
                        <div className="nav-dropdown">
                            <button className="nav-link nav-dropdown-trigger">
                                Research
                                <svg width="10" height="6" viewBox="0 0 10 6" className="nav-dropdown-chevron">
                                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <div className="nav-dropdown-menu">
                                <Link to="/paper" className="nav-dropdown-item">Paper</Link>
                                <Link to="/benchmarks" className="nav-dropdown-item">Benchmarks</Link>
                            </div>
                        </div>
                        <a href="https://docs.testquorum.com" className="nav-link" target="_blank" rel="noopener noreferrer">
                            Docs
                        </a>
                    </div>

                    {/* CTA — split pill */}
                    <div className="nav-cta-wrap" style={{ gap: '0.75rem' }}>
                        <a
                            href="https://github.com/AlexLopezGomez/Quorum---Council-LLMs"
                            className="nav-github-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View Quorum on GitHub"
                        >
                            <Github size={17} />
                        </a>
                        <Link to="/login" className="nav-link" style={{ textDecoration: 'none' }}>
                            Sign In
                        </Link>
                        <Link to="/register" className="nav-cta-pill" style={{ textDecoration: 'none' }}>
                            <span className="nav-cta-label">Register</span>
                            <span className="nav-cta-badge">
                                <ArrowUpRight size={13} />
                            </span>
                        </Link>
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
                        <a href="https://docs.testquorum.com" onClick={() => setMobileMenuOpen(false)} className="nav-link nav-link--mobile" target="_blank" rel="noopener noreferrer">Docs</a>
                        <div style={{ paddingLeft: '0.25rem', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-ter)', padding: '0.35rem 0.5rem 0.1rem' }}>Research</div>
                        <Link
                            to="/paper"
                            className="nav-link nav-link--mobile"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ textDecoration: 'none', paddingLeft: '1rem' }}
                        >
                            Paper
                        </Link>
                        <Link
                            to="/benchmarks"
                            className="nav-link nav-link--mobile"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ textDecoration: 'none', paddingLeft: '1rem' }}
                        >
                            Benchmarks
                        </Link>
                        <Link
                            to="/login"
                            className="nav-link nav-link--mobile"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ textDecoration: 'none' }}
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="nav-pill-btn nav-pill-btn--full"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ textDecoration: 'none' }}
                        >
                            <ArrowUpRight size={14} />
                            Register
                        </Link>
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
                        Open Source - RAG Evaluation Platform
                    </div>

                    <h1 className="hero-title mb-4">
                        The open source way to{' '}
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

                    <div className="hero-cta-row mt-10">
                        <Link to="/register" className="cta-waitlist-btn">
                            Get Started <ArrowRight size={16} className="inline ml-1.5" />
                        </Link>
                        <a href="#demo" className="hero-secondary-btn">Watch Demo</a>
                    </div>

                    <p className="mt-5 text-xs" style={{ color: 'var(--text-ter)' }}>
                        Free to self-host · MIT licensed
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

            {/* ─── Research Paper ────────────────────────────────── */}
            <ResearchPaperSection />

            {/* ─── Scrambling Section ────────────────────────────── */}
            <section className="scrambling-section">
                <div className="section-container">
                    <h2 className="scrambling-heading">
                        Stop flying blind.<br />Start shipping confidently.
                    </h2>
                    <div className="scrambling-rows">
                        {SCRAMBLING_ROWS.map((row, i) => (
                            <div key={i} className="scrambling-row">
                                <span className="scrambling-before">{row.before}</span>
                                <span className="scrambling-arrow">→</span>
                                <span className="scrambling-after">{row.after}</span>
                            </div>
                        ))}
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
                        Deploy in minutes. Self-host for free. No credit card required.
                    </p>
                    <Link to="/register" className="cta-waitlist-btn mt-10">
                        Get Started <ArrowRight size={16} className="inline ml-1.5" />
                    </Link>
                </div>
            </section>

            {/* ─── Footer ────────────────────────────────────────── */}
            <footer className="landing-footer">
                <div className="footer-nav-row max-w-6xl mx-auto px-6">
                    <div className="flex items-center gap-3">
                        <span className="landing-logo">Quorum</span>
                        <span className="footer-tagline">· Built for RAG teams</span>
                    </div>
                    <div className="flex items-center gap-5">
                        <Link to="/privacy" className="footer-icon-link" style={{ fontSize: '0.8125rem' }}>Privacy</Link>
                        <Link to="/terms" className="footer-icon-link" style={{ fontSize: '0.8125rem' }}>Terms</Link>
                        <a href="https://github.com/AlexLopezGomez/Quorum---Council-LLMs" className="footer-icon-link" style={{ fontSize: '0.8125rem' }} target="_blank" rel="noopener noreferrer">GitHub</a>
                    </div>
                </div>
                <span className="footer-wordmark">QUORUM</span>
            </footer>
        </div>
    );
}

/* ─── Sub-components ──────────────────────────────────────── */

function SectionLabel({ children }) {
    return <p className="section-label">{children}</p>;
}

/* ─── Brand SVGs ──────────────────────────────────────────── */

