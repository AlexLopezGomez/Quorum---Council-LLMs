import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Brain,
    BarChart3,
    Zap,
    ArrowRight,
    CheckCircle2,
    Upload,
    Eye,
    TrendingDown,
    Menu,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

/* ═══════════════════════════════════════════════════════════════
   RAGScope — B2B SaaS Landing Page
   Design: DESIGN_SYSTEM.md palette (light) + dark auth section
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="min-h-screen bg-surface-secondary" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

            {/* ─── Navigation ─────────────────────────────────────── */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <span className="text-lg font-semibold text-text-primary tracking-tight">RAGScope</span>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm text-text-secondary hover:text-text-primary transition-colors">How it works</a>
                        <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Pricing</a>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated ? (
                            <button
                                onClick={() => navigate('/app')}
                                className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Sign in
                                </button>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                                >
                                    Get Started
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        className="md:hidden p-2 text-text-secondary"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-surface-border bg-surface px-6 py-4 space-y-3">
                        <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-text-secondary py-1">Features</a>
                        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-text-secondary py-1">How it works</a>
                        <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-text-secondary py-1">Pricing</a>
                        <button
                            onClick={() => navigate(isAuthenticated ? '/app' : '/auth')}
                            className="w-full mt-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                        >
                            {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                        </button>
                    </div>
                )}
            </nav>

            {/* ─── Hero Section ───────────────────────────────────── */}
            <section className="hero-section">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="hero-badge">
                        <span className="dot" />
                        Now with Adaptive Routing
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight leading-tight max-w-3xl mx-auto">
                        Evaluate your RAG pipeline with a&nbsp;
                        <span style={{ color: '#10B981' }}>Council of LLMs</span>
                    </h1>

                    <p className="text-lg text-text-secondary mt-5 max-w-2xl mx-auto leading-relaxed">
                        RAGScope orchestrates multiple AI judges to score faithfulness, groundedness, and relevance — then adaptively routes each test case to minimize cost without sacrificing accuracy.
                    </p>

                    <div className="flex items-center justify-center gap-4 mt-8">
                        <button
                            onClick={() => navigate('/auth')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                        >
                            Get Started Free
                            <ArrowRight size={16} />
                        </button>
                        <a
                            href="#how-it-works"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-surface text-text-primary text-sm font-medium rounded-lg border border-surface-border hover:bg-surface-secondary transition-colors"
                        >
                            See How it Works
                        </a>
                    </div>

                    {/* Dashboard Preview */}
                    <div className="dashboard-preview mt-16">
                        <div className="dashboard-preview-bar">
                            <div className="dot red" />
                            <div className="dot yellow" />
                            <div className="dot green" />
                            <span className="ml-4 text-xs text-text-tertiary">RAGScope — Evaluation Dashboard</span>
                        </div>
                        <div className="dashboard-preview-content">
                            <DashboardMockup />
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Features Section ───────────────────────────────── */}
            <section id="features" className="py-20 bg-surface">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">Core Capabilities</p>
                        <h2 className="text-3xl font-semibold text-text-primary tracking-tight">Everything you need to evaluate RAG outputs</h2>
                        <p className="text-text-secondary mt-3 max-w-xl mx-auto text-sm">
                            Three powerful capabilities working together to give you confident, cost-efficient evaluation at scale.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<Brain size={22} />}
                            color="green"
                            title="Council of LLMs"
                            description="Three AI judges (OpenAI, Anthropic, Gemini) evaluate independently, then Claude synthesizes a final verdict. Eliminates single-model bias."
                        />
                        <FeatureCard
                            icon={<Zap size={22} />}
                            color="purple"
                            title="Adaptive Routing"
                            description="Each test case is risk-scored and routed to the optimal strategy — council, hybrid, or single judge — saving up to 70% on evaluation costs."
                        />
                        <FeatureCard
                            icon={<BarChart3 size={22} />}
                            color="amber"
                            title="Cost Intelligence"
                            description="Real-time cost tracking, per-strategy breakdowns, and savings estimates versus brute-force evaluation. Know exactly what you spend."
                        />
                    </div>
                </div>
            </section>

            {/* ─── How It Works ───────────────────────────────────── */}
            <section id="how-it-works" className="py-20 bg-surface-secondary">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">Workflow</p>
                        <h2 className="text-3xl font-semibold text-text-primary tracking-tight">Three steps to confident RAG evaluation</h2>
                    </div>

                    <div className="max-w-2xl mx-auto space-y-0">
                        <StepItem
                            number="1"
                            icon={<Upload size={20} />}
                            title="Upload test cases"
                            description="Submit your RAG outputs with questions, contexts, and expected answers as JSON. Each case is analyzed for risk level."
                            showConnector
                        />
                        <StepItem
                            number="2"
                            icon={<Eye size={20} />}
                            title="Watch the council evaluate"
                            description="Stream live SSE events as judges score each test case. See risk assessments, strategy selections, and individual judge reasoning in real-time."
                            showConnector
                        />
                        <StepItem
                            number="3"
                            icon={<TrendingDown size={20} />}
                            title="Review results & cost savings"
                            description="Get aggregated verdicts (PASS / WARN / FAIL), cost breakdowns by strategy, and savings estimates versus running every case through the full council."
                        />
                    </div>
                </div>
            </section>

            {/* ─── Stats Section ──────────────────────────────────── */}
            <section className="stats-section">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-gray-700">
                    <StatItem value="10,000" accent="+" label="Evaluations run" />
                    <StatItem value="67" accent="%" label="Average cost saved" />
                    <StatItem value="3" label="AI judge providers" />
                    <StatItem value="17" label="Real-time SSE events" />
                </div>
            </section>

            {/* ─── Pricing Section ────────────────────────────────── */}
            <section id="pricing" className="py-20 bg-surface-secondary">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">Pricing</p>
                        <h2 className="text-3xl font-semibold text-text-primary tracking-tight">Simple, transparent pricing</h2>
                        <p className="text-text-secondary mt-3 text-sm">Start free. Scale as you grow. Pay only for what you use.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <PricingCard
                            tier="Starter"
                            price="Free"
                            period=""
                            description="For individuals exploring RAG evaluation"
                            features={[
                                '100 evaluations / month',
                                'Single judge strategy',
                                'Basic cost tracking',
                                'JSON upload',
                                'Community support',
                            ]}
                            cta="Get Started"
                            onCta={() => navigate('/auth')}
                        />
                        <PricingCard
                            tier="Pro"
                            price="$49"
                            period="/mo"
                            description="For teams shipping production RAG systems"
                            features={[
                                'Unlimited evaluations',
                                'All strategies (council, hybrid, single)',
                                'Adaptive routing',
                                'Webhook integrations',
                                'Cost analytics & savings reports',
                                'Priority support',
                            ]}
                            cta="Start Free Trial"
                            featured
                            onCta={() => navigate('/auth')}
                        />
                        <PricingCard
                            tier="Enterprise"
                            price="Custom"
                            period=""
                            description="For organizations with compliance needs"
                            features={[
                                'Everything in Pro',
                                'Custom judge models',
                                'SSO & RBAC',
                                'Dedicated infrastructure',
                                'SLA guarantees',
                                '24/7 support',
                            ]}
                            cta="Contact Sales"
                            onCta={() => navigate('/auth')}
                        />
                    </div>
                </div>
            </section>

            {/* ─── CTA Section ──────────────────────────────────── */}
            <section className="py-20 bg-surface">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-semibold text-text-primary tracking-tight">Ready to evaluate your RAG pipeline?</h2>
                    <p className="text-text-secondary mt-3 text-sm">Create your free account and start running evaluations in under a minute.</p>
                    <button
                        onClick={() => navigate('/auth')}
                        className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
                    >
                        Get Started Free
                        <ArrowRight size={16} />
                    </button>
                </div>
            </section>

            {/* ─── Footer ─────────────────────────────────────────── */}
            <LandingFooter />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Footer
   ═══════════════════════════════════════════════════════════════ */

const FOOTER_LINK_CLASS = 'text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer text-sm';

function LandingFooter() {
    return (
        <footer className="landing-footer">
            <div className="max-w-6xl mx-auto px-6">
                <div className="footer-grid">
                    <div>
                        <span className="text-lg font-semibold text-text-primary">RAGScope</span>
                        <p className="text-sm text-text-secondary mt-3 leading-relaxed max-w-xs">
                            The intelligent RAG evaluation platform powered by a council of AI judges and adaptive cost routing.
                        </p>
                    </div>

                    <div className="footer-section">
                        <h4>Product</h4>
                        <a href="#features">Features</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#how-it-works">How it works</a>
                        <a href="/auth">Get started</a>
                    </div>

                    <div className="footer-section">
                        <h4>Resources</h4>
                        <span className={FOOTER_LINK_CLASS}>Documentation</span>
                        <span className={FOOTER_LINK_CLASS}>API Reference</span>
                        <span className={FOOTER_LINK_CLASS}>SDK</span>
                        <span className={FOOTER_LINK_CLASS}>Changelog</span>
                    </div>

                    <div className="footer-section">
                        <h4>Company</h4>
                        <span className={FOOTER_LINK_CLASS}>About</span>
                        <span className={FOOTER_LINK_CLASS}>Blog</span>
                        <span className={FOOTER_LINK_CLASS}>Careers</span>
                        <span className={FOOTER_LINK_CLASS}>Contact</span>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>&copy; 2026 RAGScope. All rights reserved.</span>
                    <div className="flex items-center gap-6">
                        <span className={FOOTER_LINK_CLASS}>Privacy</span>
                        <span className={FOOTER_LINK_CLASS}>Terms</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components (co-located for simplicity)
   ═══════════════════════════════════════════════════════════════ */

function FeatureCard({ icon, color, title, description }) {
    return (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6 hover:border-surface-border-strong transition-colors">
            <div className={`feature-icon-wrapper ${color}`}>
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
        </div>
    );
}

function StepItem({ number, icon, title, description, showConnector }) {
    return (
        <>
            <div className="flex items-start gap-5 py-4">
                <div className="flex flex-col items-center">
                    <div className="step-number">{number}</div>
                </div>
                <div className="pt-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-text-tertiary">{icon}</span>
                        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
                </div>
            </div>
            {showConnector && (
                <div className="flex">
                    <div className="step-connector" style={{ marginLeft: '17px' }} />
                </div>
            )}
        </>
    );
}

function StatItem({ value, accent, label }) {
    return (
        <div className="stat-item">
            <div className="stat-value">
                {value}<span className="accent">{accent}</span>
            </div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function PricingCard({ tier, price, period, description, features, cta, featured, onCta }) {
    return (
        <div className={`pricing-card ${featured ? 'featured' : ''}`}>
            {featured && <div className="popular-badge">Most popular</div>}
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">{tier}</p>
            <div className="pricing-price mb-1">
                {price}<span className="period">{period}</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">{description}</p>

            <ul className="pricing-feature-list mb-8 flex-1">
                {features.map((f) => (
                    <li key={f}>
                        <CheckCircle2 className="check" size={16} />
                        {f}
                    </li>
                ))}
            </ul>

            <button
                onClick={onCta}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${featured
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-surface border border-surface-border text-text-primary hover:bg-surface-secondary'
                    }`}
            >
                {cta}
            </button>
        </div>
    );
}

/* ─── Dashboard Mockup (SVG-like representation) ──────────────── */
function DashboardMockup() {
    return (
        <div className="grid grid-cols-4 gap-3">
            {/* Stat cards row */}
            {[
                { label: 'Total Evaluations', value: '158', change: '+3.2%' },
                { label: 'Avg. Score', value: '0.84', change: '+1.1%' },
                { label: 'Total Cost', value: '$2.34', change: '-12%' },
                { label: 'Pass Rate', value: '93%', change: '+2.4%' },
            ].map((stat) => (
                <div key={stat.label} className="bg-surface rounded-lg border border-surface-border p-4">
                    <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wide">{stat.label}</p>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-lg font-semibold text-text-primary">{stat.value}</span>
                        <span className="text-[10px] font-medium text-emerald-600">{stat.change}</span>
                    </div>
                </div>
            ))}

            {/* Judge cards row */}
            <div className="col-span-4 grid grid-cols-3 gap-3 mt-1">
                {[
                    { judge: 'OpenAI', model: 'gpt-4o-mini', score: '0.87', color: '#10A37F', width: '87%' },
                    { judge: 'Anthropic', model: 'claude-3-haiku', score: '0.91', color: '#D97706', width: '91%' },
                    { judge: 'Gemini', model: 'gemini-1.5-flash', score: '0.79', color: '#4285F4', width: '79%' },
                ].map((j) => (
                    <div key={j.judge} className="bg-surface rounded-lg border border-surface-border overflow-hidden">
                        <div className="h-0.5" style={{ background: j.color }} />
                        <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} />
                                <span className="text-xs font-semibold text-text-primary">{j.judge}</span>
                                <span className="text-[10px] text-text-tertiary ml-auto">{j.model}</span>
                            </div>
                            <span className="text-xl font-semibold text-text-primary">{j.score}</span>
                            <div className="w-full h-1 bg-surface-tertiary rounded-full mt-2">
                                <div className="h-full rounded-full" style={{ background: j.color, width: j.width }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
