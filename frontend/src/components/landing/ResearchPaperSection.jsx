import { FileText, ExternalLink, ArrowUpRight } from 'lucide-react';
import SpotlightCard from './SpotlightCard';
import CountUp from './CountUp';

const PAPER_URL = 'https://github.com/AlexLopezGomez/Quorum---Council-LLMs/blob/main/paper/main_publish.tex';
const BLOG_POST_URL = 'https://github.com/AlexLopezGomez/Quorum---Council-LLMs/blob/main/paper/blog_post.md';

const STATS = [
    { value: 94.2, suffix: '%', label: 'Council Accuracy', desc: 'vs 88.5% single-judge baseline' },
    { value: 31, suffix: '%', label: 'FNR Reduction', desc: 'fewer false negatives vs solo judge' },
    { value: 0.89, suffix: '', label: "Cohen's Kappa", desc: 'inter-rater agreement score' },
];

export default function ResearchPaperSection() {
    return (
        <section className="pillars-section" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="max-w-6xl mx-auto px-6">
                <p className="section-label">Research</p>
                <h2 className="section-heading mt-3">Backed by a 5,000-case benchmark</h2>

                <div className="mt-14" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
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
                            Council vs. Single-Judge: A 5,000-Case Benchmark of LLM Deliberation for RAG Evaluation
                        </h3>

                        <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                            We benchmark council-based LLM deliberation against single-judge evaluation across 5,000 RAG test cases spanning 6 domains. Results show council deliberation achieves 94.2% accuracy with a 31% reduction in false negative rate.
                        </p>

                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-ter)', marginBottom: '1.75rem' }}>
                            Alex Lopez et al. &mdash; 2026
                        </p>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <a
                                href={PAPER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
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
                                View Paper <ExternalLink size={13} />
                            </a>
                            <a
                                href={BLOG_POST_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.5rem 1rem', borderRadius: 8,
                                    background: 'transparent', color: 'var(--text-primary)',
                                    border: '1px solid var(--card-border)',
                                    fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none',
                                    transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
                            >
                                Read Blog Post <ArrowUpRight size={13} />
                            </a>
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
