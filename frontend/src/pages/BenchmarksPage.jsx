import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, X, ChevronRight } from 'lucide-react';
import CountUp from '../components/landing/CountUp';
import SpotlightCard from '../components/landing/SpotlightCard';
import data from '../data/benchmarkResults.json';

const EVALUATOR_COLORS = {
    council: '#d99058',
    'single-openai': '#10A37F',
    'single-gemini': '#4285F4',
};

const DOMAIN_COLUMNS = [
    { key: 'singleGemini', label: 'Gemini Flash' },
    { key: 'council', label: 'Council' },
    { key: 'singleOpenai', label: 'GPT-4o-mini' },
];

const SECTION_H2 = {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '0.75rem',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '1.25rem',
};

function AccuracyBar({ evaluator, visible, index }) {
    const color = EVALUATOR_COLORS[evaluator.id] ?? '#d99058';
    return (
        <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {evaluator.label}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color }}>
                    {evaluator.accuracy}%
                </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#EEEBE4', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: visible ? `${evaluator.accuracy}%` : '0%',
                    background: color,
                    borderRadius: 4,
                    transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1)',
                    transitionDelay: `${index * 150}ms`,
                }} />
            </div>
        </div>
    );
}

function DomainModal({ domain, onClose }) {
    const closeRef = useRef(null);

    useEffect(() => {
        closeRef.current?.focus();
        const handler = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const delta = (domain.singleGemini - domain.council).toFixed(1);

    const bars = [
        { label: 'Gemini Flash', value: domain.singleGemini, color: '#4285F4' },
        { label: 'Council', value: domain.council, color: '#d99058' },
        { label: 'GPT-4o-mini', value: domain.singleOpenai, color: '#10A37F' },
    ];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${domain.label} domain breakdown`}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(59,60,54,0.45)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 16, padding: '2rem',
                    width: '100%', maxWidth: 480,
                    boxShadow: '0 20px 60px rgba(59,60,54,0.18)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{domain.label}</span>
                    <button
                        ref={closeRef}
                        onClick={onClose}
                        aria-label="Close"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-ter)', padding: 4, lineHeight: 1 }}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                {bars.map(bar => (
                    <div key={bar.label} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{bar.label}</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: bar.color }}>{bar.value}%</span>
                        </div>
                        <div style={{ height: 7, borderRadius: 4, background: '#EEEBE4', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${bar.value}%`,
                                background: bar.color,
                                borderRadius: 4,
                                transition: 'width 0.8s ease',
                            }} />
                        </div>
                    </div>
                ))}

                <div style={{
                    marginTop: '1.25rem',
                    background: 'rgba(66,133,244,0.06)',
                    border: '1px solid rgba(66,133,244,0.18)',
                    borderRadius: 8,
                    padding: '0.875rem 1rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-sec)',
                    lineHeight: 1.5,
                }}>
                    Gemini Flash leads by <strong style={{ color: '#4285F4' }}>+{delta}pp</strong> over Council in {domain.label}.
                </div>
            </div>
        </div>
    );
}

export default function BenchmarksPage() {
    const [activeDomain, setActiveDomain] = useState(null);
    const [barsVisible, setBarsVisible] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const barsRef = useRef(null);

    useEffect(() => {
        document.title = 'Benchmarks — Quorum';
        const metas = [
            { property: 'og:title', content: 'Quorum Benchmarks — RAG Evaluator Comparison' },
            { property: 'og:description', content: 'Gemini Flash achieves 82% accuracy at $0.000402/case — the Pareto-dominant RAG evaluator. Compare council vs. single-judge strategies across 5,000 human-labeled test cases.' },
            { property: 'og:type', content: 'website' },
        ];
        const added = metas.map(attrs => {
            const el = document.createElement('meta');
            Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
            document.head.appendChild(el);
            return el;
        });
        return () => added.forEach(el => el.remove());
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setBarsVisible(true); },
            { threshold: 0.2 }
        );
        if (barsRef.current) observer.observe(barsRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handler = () => setShowBackToTop(window.scrollY > 400);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'New York', ui-serif, Georgia, serif" }}>
            <style>{`
                @media (max-width: 640px) {
                    .kf-grid { grid-template-columns: 1fr !important; }
                    .ev-stats-row { flex-direction: column; gap: 0.75rem; }
                }
                .domain-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            `}</style>

            {/* Nav */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(245,243,239,0.92)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--card-border)',
                padding: '0 2rem', height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>Quorum</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent)', background: 'rgba(217,144,88,0.1)', border: '1px solid rgba(217,144,88,0.2)', borderRadius: 4, padding: '1px 6px' }}>Beta</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to="/paper" style={{
                        fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-sec)',
                        textDecoration: 'none',
                    }}>
                        Research Paper
                    </Link>
                    <Link to="/app" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        fontSize: '0.8125rem', fontWeight: 600, color: '#fff',
                        background: 'var(--accent)', borderRadius: 8, padding: '0.4375rem 0.875rem',
                        textDecoration: 'none',
                    }}>
                        Run your own <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                </div>
            </nav>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '4rem 2rem' }}>

                {/* Header */}
                <section style={{ marginBottom: '4rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                        Benchmark Results
                    </p>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '1rem' }}>
                        RAG Evaluator Benchmarks:<br />Choosing the Right Strategy
                    </h1>
                    <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.7, maxWidth: 640, marginBottom: '1.5rem' }}>
                        We evaluated three strategies across 5,000 human-labeled RAG test cases spanning 3 domains — general, technical, and financial. The best choice depends on your error tolerance.
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Test Cases', value: 'N = 5,000' },
                            { label: 'Domains', value: String(data.meta.domains) },
                            { label: 'Labeling', value: 'Human-labeled' },
                            { label: 'Published', value: data.meta.date },
                        ].map(item => (
                            <div key={item.label} style={{ fontSize: '0.8125rem', color: 'var(--text-ter)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-sec)' }}>{item.label}:</span> {item.value}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Key Findings */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={SECTION_H2}>Key Findings</h2>
                    <div className="kf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {[
                            {
                                from: 78, to: 82, duration: 1.5, suffix: '%',
                                label: 'Gemini Flash accuracy',
                                sub: 'Best accuracy + lowest cost — Pareto-dominant',
                                accent: true,
                            },
                            {
                                from: 0, to: 8, duration: 1.2, suffix: '%',
                                label: 'GPT-4o-mini unsafe pass rate',
                                sub: 'Safest choice for high-stakes domains',
                                accent: false,
                            },
                            {
                                from: 1, to: 5, duration: 1.5, suffix: '×',
                                label: 'Council cost premium',
                                sub: '$0.002025 vs $0.000402 per case',
                                accent: false,
                            },
                        ].map(item => (
                            <SpotlightCard
                                key={item.label}
                                spotlightColor="rgba(217,144,88,0.15)"
                                className=""
                                style={{}}
                            >
                                <div style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 12,
                                    padding: '1.5rem',
                                    borderTop: item.accent ? '3px solid var(--accent)' : '1px solid var(--card-border)',
                                }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                                        <CountUp from={item.from} to={item.to} duration={item.duration} />
                                        {item.suffix}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-ter)', marginTop: '0.25rem' }}>
                                        {item.sub}
                                    </div>
                                </div>
                            </SpotlightCard>
                        ))}
                    </div>
                </section>

                {/* Accuracy Comparison */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={SECTION_H2}>Accuracy Comparison</h2>
                    <div ref={barsRef} style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '2rem' }}>
                        {data.evaluators.map((ev, i) => (
                            <AccuracyBar key={ev.id} evaluator={ev} visible={barsVisible} index={i} />
                        ))}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #EEEBE4' }}>
                            <div className="ev-stats-row" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                {data.evaluators.map(ev => (
                                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-sec)' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: EVALUATOR_COLORS[ev.id], flexShrink: 0 }} />
                                        F1: <strong style={{ color: 'var(--text-primary)' }}>{ev.f1.toFixed(2)}</strong>
                                        &nbsp;&middot; UPR: <strong style={{ color: 'var(--text-primary)' }}>{ev.fnr}%</strong>
                                        &nbsp;&middot; κ: <strong style={{ color: 'var(--text-primary)' }}>{ev.kappa}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Per-domain table */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={SECTION_H2}>Accuracy by Domain</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-ter)', marginBottom: '0.875rem' }}>
                        Click a row to see a detailed breakdown.
                    </p>
                    <div className="domain-table-wrap" style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--card-border)' }}>
                                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-sec)' }}>Domain</th>
                                    {DOMAIN_COLUMNS.map(col => (
                                        <th key={col.key} style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-sec)' }}>
                                            {col.label}
                                        </th>
                                    ))}
                                    <th style={{ padding: '0.875rem 1rem', width: 32 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {data.domains.map((domain, i) => (
                                    <tr
                                        key={domain.id}
                                        onClick={() => setActiveDomain(domain)}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDomain(domain); } }}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`View ${domain.label} domain breakdown`}
                                        style={{
                                            borderBottom: i < data.domains.length - 1 ? '1px solid #EEEBE4' : 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                    >
                                        <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {domain.label}
                                        </td>
                                        {DOMAIN_COLUMNS.map(col => {
                                            const val = domain[col.key];
                                            const isWinner = col.key === 'singleGemini';
                                            return (
                                                <td key={col.key} style={{
                                                    padding: '0.875rem 1.25rem', textAlign: 'right',
                                                    fontWeight: isWinner ? 700 : 400,
                                                    color: isWinner ? '#4285F4' : 'var(--text-sec)',
                                                }}>
                                                    {val}%
                                                </td>
                                            );
                                        })}
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: 'var(--text-ter)' }}>
                                            <ChevronRight size={14} aria-hidden="true" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Methodology */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={SECTION_H2}>Methodology</h2>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '1.5rem 2rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', lineHeight: 1.7, marginBottom: '0.875rem' }}>
                            Test cases were sourced from <strong style={{ color: 'var(--text-primary)' }}>RAGTruth</strong> and <strong style={{ color: 'var(--text-primary)' }}>HaluBench</strong>, two publicly available benchmarks with human-verified ground truth labels. Each test case consists of a question, retrieved context, and an LLM-generated answer.
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', lineHeight: 1.7, marginBottom: '0.875rem' }}>
                            Statistical significance was assessed using <strong style={{ color: 'var(--text-primary)' }}>McNemar's test</strong> (χ²(1) &gt; 3.84, p = 0.01). UPR (Unsafe Pass Rate) measures the fraction of human-labeled FAIL cases that an evaluator marks as PASS — a key metric for high-stakes deployments.
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', lineHeight: 1.7 }}>
                            Council strategy runs <strong style={{ color: 'var(--text-primary)' }}>GPT-4o-mini</strong> (faithfulness), <strong style={{ color: 'var(--text-primary)' }}>Claude Haiku</strong> (groundedness), and <strong style={{ color: 'var(--text-primary)' }}>Gemini 2.0 Flash</strong> (context relevancy) in parallel, then aggregates via Claude Sonnet deliberation. Single-judge baselines use the same models with a single rubric.
                        </p>
                    </div>
                </section>

                {/* CTA */}
                <section style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 16 }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                        Run your own evaluation
                    </h2>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-sec)', marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem' }}>
                        Upload your RAG test cases and compare council vs. single-judge strategies with cost and latency analytics.
                    </p>
                    <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/app" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            background: 'var(--accent)', color: '#fff',
                            padding: '0.625rem 1.25rem', borderRadius: 8,
                            fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                        }}>
                            Go to App <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                        <Link to="/paper" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            background: 'transparent', color: 'var(--text-primary)',
                            border: '1px solid var(--card-border)',
                            padding: '0.625rem 1.25rem', borderRadius: 8,
                            fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                        }}>
                            Read the Paper <ExternalLink size={14} aria-hidden="true" />
                        </Link>
                    </div>
                </section>
            </div>

            {activeDomain && <DomainModal domain={activeDomain} onClose={() => setActiveDomain(null)} />}

            {showBackToTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    aria-label="Back to top"
                    style={{
                        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 10,
                        background: 'var(--bg-surface)', border: '1px solid var(--card-border)',
                        borderRadius: 8, padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-sec)',
                        cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,60,54,0.1)',
                        fontFamily: "'New York', ui-serif, Georgia, serif",
                    }}
                >
                    ↑ Top
                </button>
            )}
        </div>
    );
}
