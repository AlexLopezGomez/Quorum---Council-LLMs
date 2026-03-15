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
    { key: 'council', label: 'Council' },
    { key: 'singleOpenai', label: 'Single — OpenAI' },
    { key: 'singleGemini', label: 'Single — Gemini' },
];

const SECTION_H2 = {
    borderLeft: '3px solid #d99058',
    paddingLeft: '0.75rem',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#3b3c36',
    marginBottom: '1.25rem',
};

function AccuracyBar({ evaluator, visible, index }) {
    const color = EVALUATOR_COLORS[evaluator.id] ?? '#d99058';
    return (
        <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b3c36' }}>
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
    useEffect(() => {
        const handler = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const bestSingle = Math.max(domain.singleOpenai, domain.singleGemini);
    const delta = (domain.council - bestSingle).toFixed(1);

    const bars = [
        { label: 'Council', value: domain.council, color: '#d99058' },
        { label: 'Single — OpenAI', value: domain.singleOpenai, color: '#10A37F' },
        { label: 'Single — Gemini', value: domain.singleGemini, color: '#4285F4' },
    ];

    return (
        <div
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
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#3b3c36' }}>{domain.label}</span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9d97', padding: 4, lineHeight: 1 }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {bars.map(bar => (
                    <div key={bar.label} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#3b3c36' }}>{bar.label}</span>
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
                    background: 'rgba(217,144,88,0.08)',
                    border: '1px solid rgba(217,144,88,0.2)',
                    borderRadius: 8,
                    padding: '0.875rem 1rem',
                    fontSize: '0.8125rem',
                    color: '#6e6e66',
                    lineHeight: 1.5,
                }}>
                    Council is <strong style={{ color: '#d99058' }}>+{delta}pp</strong> more accurate than the best single-judge baseline in {domain.label}.
                </div>
            </div>
        </div>
    );
}

export default function BenchmarksPage() {
    const [activeDomain, setActiveDomain] = useState(null);
    const [barsVisible, setBarsVisible] = useState(false);
    const barsRef = useRef(null);

    useEffect(() => {
        document.title = 'Benchmarks — Quorum';
        const metas = [
            { property: 'og:title', content: 'Quorum Benchmarks — Council vs Single-Judge RAG Evaluation' },
            { property: 'og:description', content: 'Council-based LLM deliberation achieves 94.2% accuracy across 5,000 RAG test cases — 31% fewer false negatives than single-judge.' },
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

    return (
        <div style={{ minHeight: '100vh', background: '#F5F3EF', fontFamily: "'New York', ui-serif, Georgia, serif" }}>
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
                borderBottom: '1px solid #DDD9D1',
                padding: '0 2rem', height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#3b3c36' }}>Quorum</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#d99058', background: 'rgba(217,144,88,0.1)', border: '1px solid rgba(217,144,88,0.2)', borderRadius: 4, padding: '1px 6px' }}>Beta</span>
                </Link>
                <Link to="/app" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    fontSize: '0.8125rem', fontWeight: 600, color: '#fff',
                    background: '#d99058', borderRadius: 8, padding: '0.4375rem 0.875rem',
                    textDecoration: 'none',
                }}>
                    Run your own <ArrowRight size={13} />
                </Link>
            </nav>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '4rem 2rem' }}>

                {/* Header */}
                <section style={{ marginBottom: '4rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d99058', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                        Benchmark Results
                    </p>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#3b3c36', lineHeight: 1.2, marginBottom: '1rem' }}>
                        Council vs. Single-Judge:<br />RAG Evaluation Accuracy
                    </h1>
                    <p style={{ fontSize: '1rem', color: '#6e6e66', lineHeight: 1.7, maxWidth: 640, marginBottom: '1.5rem' }}>
                        We evaluated three strategies across 5,000 human-labeled RAG test cases spanning 6 domains — general, technical, financial, medical, legal, and adversarial.
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Test Cases', value: 'N = 5,000' },
                            { label: 'Domains', value: '6' },
                            { label: 'Labeling', value: 'Human-labeled' },
                            { label: 'Published', value: data.meta.date },
                        ].map(item => (
                            <div key={item.label} style={{ fontSize: '0.8125rem', color: '#9e9d97' }}>
                                <span style={{ fontWeight: 600, color: '#6e6e66' }}>{item.label}:</span> {item.value}
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
                                from: 80, to: 94.2, duration: 1.8, suffix: '%',
                                label: 'Council accuracy', sub: 'across all 6 domains', accent: true,
                            },
                            {
                                from: 0, to: 31, duration: 1.5, suffix: '%',
                                label: 'FNR reduction', sub: 'vs single-judge baseline', accent: false,
                            },
                            {
                                from: 0, to: 0.89, duration: 1.8, suffix: '',
                                label: "Cohen's Kappa", sub: 'inter-rater agreement', accent: false,
                            },
                        ].map(item => (
                            <SpotlightCard
                                key={item.label}
                                spotlightColor="rgba(217,144,88,0.15)"
                                className=""
                                style={{}}
                            >
                                <div style={{
                                    background: '#fff',
                                    border: '1px solid #DDD9D1',
                                    borderRadius: 12,
                                    padding: '1.5rem',
                                    borderTop: item.accent ? '3px solid #d99058' : '1px solid #DDD9D1',
                                }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d99058', lineHeight: 1 }}>
                                        <CountUp from={item.from} to={item.to} duration={item.duration} />
                                        {item.suffix}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b3c36', marginTop: '0.5rem' }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#9e9d97', marginTop: '0.25rem' }}>
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
                    <div ref={barsRef} style={{ background: '#fff', border: '1px solid #DDD9D1', borderRadius: 12, padding: '2rem' }}>
                        {data.evaluators.map((ev, i) => (
                            <AccuracyBar key={ev.id} evaluator={ev} visible={barsVisible} index={i} />
                        ))}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #EEEBE4' }}>
                            <div className="ev-stats-row" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                {data.evaluators.map(ev => (
                                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#6e6e66' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: EVALUATOR_COLORS[ev.id], flexShrink: 0 }} />
                                        F1: <strong style={{ color: '#3b3c36' }}>{ev.f1.toFixed(2)}</strong>
                                        &nbsp;&middot; FNR: <strong style={{ color: '#3b3c36' }}>{ev.fnr}%</strong>
                                        &nbsp;&middot; κ: <strong style={{ color: '#3b3c36' }}>{ev.kappa}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Per-domain table */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={SECTION_H2}>Accuracy by Domain</h2>
                    <p style={{ fontSize: '0.8125rem', color: '#9e9d97', marginBottom: '0.875rem' }}>
                        Click a row to see a detailed breakdown.
                    </p>
                    <div className="domain-table-wrap" style={{ background: '#fff', border: '1px solid #DDD9D1', borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: '#F5F3EF', borderBottom: '1px solid #DDD9D1' }}>
                                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 600, color: '#6e6e66' }}>Domain</th>
                                    {DOMAIN_COLUMNS.map(col => (
                                        <th key={col.key} style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 600, color: '#6e6e66' }}>
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
                                        style={{
                                            borderBottom: i < data.domains.length - 1 ? '1px solid #EEEBE4' : 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                    >
                                        <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: '#3b3c36' }}>
                                            {domain.label}
                                        </td>
                                        {DOMAIN_COLUMNS.map(col => {
                                            const val = domain[col.key];
                                            const isCouncil = col.key === 'council';
                                            return (
                                                <td key={col.key} style={{
                                                    padding: '0.875rem 1.25rem', textAlign: 'right',
                                                    fontWeight: isCouncil ? 700 : 400,
                                                    color: isCouncil ? '#d99058' : '#6e6e66',
                                                }}>
                                                    {val}%
                                                </td>
                                            );
                                        })}
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#9e9d97' }}>
                                            <ChevronRight size={14} />
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
                    <div style={{ background: '#fff', border: '1px solid #DDD9D1', borderRadius: 12, padding: '1.5rem 2rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#6e6e66', lineHeight: 1.7, marginBottom: '0.875rem' }}>
                            Test cases were sourced from <strong style={{ color: '#3b3c36' }}>RAGTruth</strong> and <strong style={{ color: '#3b3c36' }}>HaluBench</strong>, two publicly available benchmarks with human-verified ground truth labels. Each test case consists of a question, retrieved context, and an LLM-generated answer.
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6e6e66', lineHeight: 1.7, marginBottom: '0.875rem' }}>
                            Statistical significance was assessed using <strong style={{ color: '#3b3c36' }}>McNemar's test</strong> (p &lt; 0.001 for all council vs. single comparisons). Cohen's kappa measures agreement between evaluator outputs and human labels.
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6e6e66', lineHeight: 1.7 }}>
                            Council strategy runs OpenAI GPT-4o, Anthropic Claude Sonnet, and Google Gemini Pro in parallel, then synthesizes verdicts via a meta-judge. Single-judge baselines use the same prompt template with a single model.
                        </p>
                    </div>
                </section>

                {/* CTA */}
                <section style={{ textAlign: 'center', padding: '3rem 2rem', background: '#fff', border: '1px solid #DDD9D1', borderRadius: 16 }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b3c36', marginBottom: '0.75rem' }}>
                        Run your own benchmark
                    </h2>
                    <p style={{ fontSize: '0.9375rem', color: '#6e6e66', marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem' }}>
                        Upload your RAG test cases and get council-verified verdicts with cost analytics.
                    </p>
                    <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/app" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            background: '#d99058', color: '#fff',
                            padding: '0.625rem 1.25rem', borderRadius: 8,
                            fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                        }}>
                            Go to App <ArrowRight size={14} />
                        </Link>
                        <Link to="/paper" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            background: 'transparent', color: '#3b3c36',
                            border: '1px solid #DDD9D1',
                            padding: '0.625rem 1.25rem', borderRadius: 8,
                            fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                        }}>
                            View Paper <ExternalLink size={14} />
                        </Link>
                    </div>
                </section>
            </div>

            {activeDomain && <DomainModal domain={activeDomain} onClose={() => setActiveDomain(null)} />}
        </div>
    );
}
