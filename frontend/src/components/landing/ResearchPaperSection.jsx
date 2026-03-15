import { FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import SpotlightCard from './SpotlightCard';
import CountUp from './CountUp';

const STATS = [
    { value: 5000, suffix: '', label: 'Benchmark Scale', desc: 'RAGTruth + HaluBench, 3 domains' },
    { value: 82, suffix: '%', label: 'Gemini Flash Accuracy', desc: 'best evaluator on all metrics' },
    { value: 6, suffix: ' pp', label: 'Council Accuracy Deficit', desc: 'vs. best standalone judge' },
];

export default function ResearchPaperSection() {
    return (
        <section className="features-section">
            <div className="max-w-6xl mx-auto px-6">
                <p className="section-label">Research</p>
                <h2 className="section-heading mt-3">Backed by a 5,000-case benchmark</h2>

                <div className="mt-14 research-grid">
                    {/* Left column */}
                    <SpotlightCard
                        className="pillar-card"
                        spotlightColor="rgba(217, 144, 88, 0.1)"
                        style={{ height: '100%' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: 'rgba(217,144,88,0.1)',
                                border: '1px solid rgba(217,144,88,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--accent)',
                            }}>
                                <FileText size={18} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Preprint
                            </span>
                        </div>

                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '1rem' }}>
                            Evaluating Deliberative Multi-LLM Judge Councils for RAG Evaluation: Evidence from a 5,000-Case Benchmark
                        </h3>

                        <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                            We benchmark a three-judge deliberative council against standalone judges across 5,000 RAG test cases from RAGTruth and HaluBench. A single Gemini 2.0 Flash judge outperforms the full council on accuracy, F1, calibration, cost, and latency — with the largest gap (−27 pp) in Financial evaluation.
                        </p>

                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-ter)', marginBottom: '1.75rem' }}>
                            Alex Lopez et al. &mdash; 2026
                        </p>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Link
                                to="/paper"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.5rem 1rem', borderRadius: 8,
                                    background: 'var(--accent)', color: '#fff',
                                    fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
                            >
                                Read Paper <ExternalLink size={13} />
                            </Link>
                        </div>
                    </SpotlightCard>

                    {/* Right column — stat cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {STATS.map((stat) => (
                            <SpotlightCard
                                key={stat.label}
                                className="pillar-card"
                                spotlightColor="rgba(217, 144, 88, 0.08)"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                                            <CountUp
                                                from={0}
                                                to={stat.value}
                                                duration={1.6}
                                                delay={0.1}
                                            />
                                            <span>{stat.suffix}</span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.375rem' }}>
                                            {stat.label}
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-ter)', marginTop: '0.25rem' }}>
                                            {stat.desc}
                                        </div>
                                    </div>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        background: 'rgba(217,144,88,0.08)',
                                        border: '1px solid rgba(217,144,88,0.18)',
                                        flexShrink: 0,
                                    }} />
                                </div>
                            </SpotlightCard>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
