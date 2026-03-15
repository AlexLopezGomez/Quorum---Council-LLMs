import { Link } from 'react-router-dom';
import { Github, ExternalLink } from 'lucide-react';
import './LandingPage.css';

const GITHUB_URL = 'https://github.com/AlexLopezGomez/Quorum---Council-LLMs';
const SUBSTACK_URL = 'https://open.substack.com/pub/alexlopez7/p/councils-of-llms-for-rag-evaluation';

const bodyStyle = {
    fontSize: '1rem',
    lineHeight: 1.8,
    color: 'var(--text-sec)',
};

const h2Style = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginTop: '2.5rem',
    marginBottom: '0.75rem',
    letterSpacing: '-0.01em',
};

const h3Style = {
    fontSize: '1.0625rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginTop: '1.75rem',
    marginBottom: '0.5rem',
};

const pStyle = {
    marginBottom: '1rem',
    ...bodyStyle,
};

const figStyle = {
    margin: '2rem 0',
    textAlign: 'center',
};

const figImgStyle = {
    maxWidth: '100%',
    borderRadius: 8,
    border: '1px solid var(--card-border)',
};

const figCaptionStyle = {
    fontSize: '0.8125rem',
    color: 'var(--text-ter)',
    fontStyle: 'italic',
    marginTop: '0.625rem',
    lineHeight: 1.6,
};

const tableWrapStyle = {
    overflowX: 'auto',
    margin: '1.5rem 0',
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
    color: 'var(--text-sec)',
};

const thStyle = {
    background: 'var(--bg-surface)',
    borderBottom: '2px solid var(--card-border)',
    padding: '0.5rem 0.75rem',
    textAlign: 'left',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid var(--card-border)',
};

const tdHighStyle = {
    ...tdStyle,
    background: 'rgba(217,144,88,0.06)',
    fontWeight: 600,
    color: 'var(--text-primary)',
};

const codeBlockStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--card-border)',
    borderRadius: 6,
    padding: '0.875rem 1rem',
    fontSize: '0.8125rem',
    color: 'var(--text-sec)',
    lineHeight: 1.7,
    fontFamily: 'monospace',
    marginBottom: '1rem',
};

const olStyle = {
    paddingLeft: '1.5rem',
    marginBottom: '1rem',
    ...bodyStyle,
};

const liStyle = {
    marginBottom: '0.5rem',
};

export default function PaperPage() {
    return (
        <div className="landing-root" style={{ minHeight: '100vh', padding: '0 0 80px' }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 0' }}>

                {/* Top bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
                    <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        &larr; Quorum
                    </Link>
                    <span className="landing-logo" style={{ fontSize: '1rem' }}>Quorum</span>
                </div>

                {/* Paper header */}
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                    Evaluating Deliberative Multi-LLM Judge Councils for RAG Evaluation: Evidence from a 5,000-Case Benchmark
                </h1>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-sec)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Alex L.</strong>
                    {' · '}Independent Researcher
                    {' · '}
                    <a href="mailto:alex@optimizalo.es" style={{ color: 'var(--accent)', textDecoration: 'none' }}>alex@optimizalo.es</a>
                    <br />
                    March 2026
                </div>

                {/* Badge row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(217,144,88,0.12)', color: 'var(--accent)', border: '1px solid rgba(217,144,88,0.25)' }}>
                        Preprint
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--bg-surface)', color: 'var(--text-ter)', border: '1px solid var(--card-border)' }}>
                        CC BY 4.0
                    </span>
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--bg-surface)', color: 'var(--text-ter)', border: '1px solid var(--card-border)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Github size={12} /> GitHub
                    </a>
                    <a
                        href={SUBSTACK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--bg-surface)', color: 'var(--text-ter)', border: '1px solid var(--card-border)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                        <ExternalLink size={12} /> Blog Post
                    </a>
                </div>

                {/* Abstract */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '1.5rem 1.75rem', marginBottom: '2.5rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-ter)', marginBottom: '0.75rem' }}>Abstract</p>
                    <p style={{ ...pStyle, fontStyle: 'italic', marginBottom: 0 }}>
                        Large language models (LLMs) are increasingly used as automated judges for Retrieval-Augmented Generation (RAG) systems, yet single-model evaluators are known to exhibit calibration and bias issues. An intuitive alternative is to combine multiple judges and aggregate their assessments through deliberation. We study that design choice on a 5,000-case benchmark drawn from <a href="#ref-niu" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RAGTruth</a> and <a href="#ref-ravi" style={{ color: 'var(--accent)', textDecoration: 'none' }}>HaluBench</a>, spanning General, Financial, and Technical domains with human-labeled PASS/FAIL verdicts.
                    </p>
                    <p style={{ ...pStyle, fontStyle: 'italic', marginBottom: 0, marginTop: '0.75rem' }}>
                        We compare a three-judge cross-provider council (GPT-4o-mini for faithfulness, Claude Haiku for groundedness, Gemini 2.0 Flash for context relevancy) aggregated by Claude Sonnet 4 deliberation against two standalone judges evaluated in isolation. On this benchmark, single Gemini 2.0 Flash achieves the strongest overall performance: 82% accuracy, 0.82 F1, 0.63 Cohen's κ, and 0.16 Brier score at $0.000402 per case and 10.5 s latency. The deliberative council reaches 76% accuracy at $0.002025 per case and 37.4 s latency. Single GPT-4o-mini reaches 61% accuracy with substantially lower recall on PASS cases, though it produces the fewest false approvals of failing responses (unsafe pass rate 8% versus 17% for Gemini and 16% for the council). The 6 pp Gemini–council gap is statistically significant under McNemar's test (χ²(1) &gt; 3.84, p = 0.01, n = 5,000).
                    </p>
                    <p style={{ ...pStyle, fontStyle: 'italic', marginBottom: 0, marginTop: '0.75rem' }}>
                        These results indicate that, for this benchmark and council design, deliberative aggregation does not improve over the strongest standalone judge. They also show that conclusions drawn from a prior pilot study at n = 200 do not transfer cleanly to a larger and more natural benchmark, underscoring the importance of benchmark scale and dataset composition in evaluator studies.
                    </p>
                </div>

                {/* Table of Contents */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '1.25rem 1.75rem', marginBottom: '3rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-ter)', marginBottom: '0.75rem' }}>Contents</p>
                    <ol style={{ ...olStyle, marginBottom: 0, listStyleType: 'decimal' }}>
                        {[
                            ['#intro', 'Introduction'],
                            ['#related', 'Related Work'],
                            ['#benchmark', 'Benchmark Design'],
                            ['#results', 'Results'],
                            ['#discussion', 'Discussion'],
                            ['#limitations', 'Limitations'],
                            ['#conclusion', 'Conclusion'],
                            ['#appendix', 'Appendix: Judge Prompts'],
                        ].map(([href, label]) => (
                            <li key={href} style={{ ...liStyle, marginBottom: '0.3rem' }}>
                                <a href={href} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9375rem' }}>{label}</a>
                            </li>
                        ))}
                    </ol>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', marginBottom: '2.5rem' }} />

                {/* §1 Introduction */}
                <section id="intro">
                    <h2 style={h2Style}>1. Introduction</h2>
                    <p style={pStyle}>
                        Automated evaluation of Retrieval-Augmented Generation (RAG) systems increasingly relies on the <em>LLM-as-a-Judge</em> paradigm, in which a language model scores response quality against criteria such as faithfulness, groundedness, or relevance. This approach is operationally attractive, but prior work has shown that LLM judges can exhibit systematic biases, calibration problems, and disagreement even when evaluating the same output.
                    </p>
                    <p style={pStyle}>
                        A natural response is to ensemble multiple judges from different model families and aggregate their outputs. This intuition is supported by prior work on judge panels and model councils, as well as by broader interest in multi-agent deliberation. At the same time, recent evidence suggests that aggregation can also preserve or amplify correlated errors rather than cancel them.
                    </p>
                    <p style={pStyle}>
                        This paper studies that question in the specific setting of RAG evaluation. We evaluate a three-judge, cross-provider council aggregated by an LLM deliberator and compare it against standalone judges on a 5,000-case benchmark constructed from <a href="#ref-niu" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RAGTruth</a> and <a href="#ref-ravi" style={{ color: 'var(--accent)', textDecoration: 'none' }}>HaluBench</a>. The benchmark covers three domains and uses human-labeled PASS/FAIL verdicts as reference labels.
                    </p>
                    <p style={{ ...pStyle, fontWeight: 600, color: 'var(--text-primary)' }}>Our contributions are threefold:</p>
                    <ol style={olStyle}>
                        <li style={liStyle}>We present a 5,000-case benchmark for comparing deliberative multi-judge evaluation against standalone LLM judges for RAG evaluation, covering general, financial, and technical domains.</li>
                        <li style={liStyle}>We show that, on this benchmark, a single Gemini 2.0 Flash judge outperforms a three-judge deliberative council on accuracy, F1, calibration, cost, and latency, with the largest gap in the Financial domain (−27 pp).</li>
                        <li style={liStyle}>We document a ranking reversal between a prior n = 200 pilot study and the full benchmark, and use it to show that tight confidence intervals at small sample sizes can be precise estimates of an unrepresentative population.</li>
                    </ol>
                    <p style={pStyle}>
                        The scope of this claim is intentionally limited: we do <em>not</em> claim that all judge councils are ineffective. Rather, we find that the specific heterogeneous council studied here, combined with deliberative aggregation, does not outperform the strongest standalone judge on this benchmark.
                    </p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* §2 Related Work */}
                <section id="related">
                    <h2 style={h2Style}>2. Related Work</h2>

                    <p style={pStyle}><strong>LLM-as-a-Judge.</strong> <a href="#ref-zheng" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Zheng et al. (2024)</a> popularized the paradigm with MT-Bench and Chatbot Arena, showing that strong LLM judges can achieve high agreement with human preferences. Subsequent work identified systematic evaluator biases, including position bias, verbosity bias, self-preference, and calibration problems. <a href="#ref-tian" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Tian et al.</a> further documented overconfidence and calibration failures in automated evaluation. <a href="#ref-wang" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Wang et al. (2025)</a> further argued that judge outputs should not be treated as deterministic ground truth, but as model-dependent ratings on potentially ambiguous tasks.</p>

                    <p style={pStyle}><strong>Multi-judge evaluation.</strong> <a href="#ref-verga" style={{ color: 'var(--accent)', textDecoration: 'none' }}>PoLL (Verga et al., 2024)</a> showed that diverse smaller-model panels can outperform a stronger single judge on some generation benchmarks when combined with simple aggregation. Language Model Council formalized multi-model consensus for subjective evaluation settings, and <a href="#ref-zhou" style={{ color: 'var(--accent)', textDecoration: 'none' }}>SE-Jury</a> explored dynamic judge selection in software engineering evaluation.</p>

                    <p style={pStyle}><strong>Aggregation and deliberation.</strong> <a href="#ref-zhao" style={{ color: 'var(--accent)', textDecoration: 'none' }}>CARE (Zhao et al., 2026)</a> argues that standard judge aggregation can fail when errors are correlated by shared latent confounders, and proposes confounder-aware aggregation as a remedy. <a href="#ref-kaushal" style={{ color: 'var(--accent)', textDecoration: 'none' }}>DeliberationBench (Kaushal et al., 2025)</a> provides negative evidence for deliberative protocols in evaluation, finding that deliberation can underperform simpler baselines at higher computational cost. Our work studies a related question in RAG evaluation, where judges are asked to classify outputs against retrieved context and human PASS/FAIL labels.</p>

                    <p style={pStyle}><strong>RAG evaluation benchmarks.</strong> <a href="#ref-niu" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RAGTruth (Niu et al., 2024)</a> and <a href="#ref-ravi" style={{ color: 'var(--accent)', textDecoration: 'none' }}>HaluBench (Ravi et al., 2024)</a> provide human-labeled hallucination and grounding failures for RAG-like settings. These datasets make it possible to evaluate judge behavior against external labels rather than against another model's preferences.</p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* §3 Benchmark Design */}
                <section id="benchmark">
                    <h2 style={h2Style}>3. Benchmark Design</h2>

                    <h3 style={h3Style}>Dataset</h3>
                    <p style={pStyle}>
                        We construct a benchmark of 5,000 test cases from <a href="#ref-niu" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RAGTruth</a> and <a href="#ref-ravi" style={{ color: 'var(--accent)', textDecoration: 'none' }}>HaluBench</a>. From each corpus we retained only examples with binary human-labeled verdicts (PASS or FAIL), deduplicated on (query, context, response) triplets, and assigned domain labels using the corpus-provided metadata fields. The resulting benchmark spans three domains: General (n = 3,928), Technical (n = 872), and Financial (n = 200). Each case contains a query, retrieved context passage(s), a model response, and a human-labeled binary verdict (PASS or FAIL). Overall, the dataset contains 2,676 PASS cases and 2,324 FAIL cases (46.5% fail rate).
                    </p>
                    <p style={pStyle}>
                        FAIL cases include common RAG failure modes: hallucination (claims absent from context), baseless information (claims without evidentiary support), and evident conflict (claims contradicting the retrieved context). Using public corpora with human labels allows us to evaluate judges against a fixed external reference and to generalize beyond the idiosyncrasies of any single synthetic benchmark.
                    </p>

                    <h3 style={h3Style}>Evaluators</h3>
                    <p style={pStyle}>We compare three evaluator configurations:</p>
                    <ol style={olStyle}>
                        <li style={liStyle}><strong>Deliberative council:</strong> GPT-4o-mini evaluates faithfulness, Claude Haiku evaluates groundedness, and Gemini 2.0 Flash evaluates context relevancy. The three judges run in parallel; Claude Sonnet 4 then receives all three judges' scores and full reasoning traces and produces a synthesized verdict and overall score.</li>
                        <li style={liStyle}><strong>Single GPT-4o-mini:</strong> GPT-4o-mini is run alone with the faithfulness rubric.</li>
                        <li style={liStyle}><strong>Single Gemini Flash:</strong> Gemini 2.0 Flash is run alone with the context-relevancy rubric.</li>
                    </ol>
                    <p style={pStyle}>
                        Each evaluator produces a scalar score in [0, 1] and a binary verdict. The PASS/FAIL decision threshold of 0.7 was fixed prior to running the full benchmark, based on the score distribution observed in the n = 200 pilot study. Scores at or above 0.7 are mapped to PASS; lower scores are mapped to non-PASS.
                    </p>

                    <h3 style={h3Style}>Metrics</h3>
                    <p style={pStyle}>
                        We report accuracy, precision, recall, F1, Cohen's κ, Brier score, average cost per case, and average latency. Because FAIL cases correspond to unsafe or incorrect RAG responses, we also report the <em>unsafe pass rate</em> (UPR): the fraction of human-labeled FAIL cases that the evaluator marks as PASS. Statistical significance between evaluators is assessed with McNemar's test. Confidence intervals for accuracy use the Wilson score method.
                    </p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* §4 Results */}
                <section id="results">
                    <h2 style={h2Style}>4. Results</h2>

                    <h3 style={h3Style}>Main Results</h3>
                    <p style={pStyle}>
                        Table 1 presents the primary comparison. Single Gemini 2.0 Flash is the strongest overall evaluator on this benchmark, with 82% accuracy, 0.82 F1, 0.63 Cohen's κ, and the best Brier score (0.16). It is also the least expensive configuration at $0.000402 per case and 10.5 s latency.
                    </p>
                    <p style={pStyle}>
                        The deliberative council reaches 76% accuracy, 0.75 F1, and 0.52 Cohen's κ while costing approximately 5× more than Gemini and taking 3.5× longer. The Gemini–council accuracy gap is 6 pp, statistically significant under McNemar's test (χ²(1) &gt; 3.84, p = 0.01), with non-overlapping Wilson confidence intervals ([0.74, 0.77] for the council; [0.80, 0.83] for Gemini).
                    </p>
                    <p style={pStyle}>
                        Single GPT-4o-mini attains high precision (0.84) but very low recall (0.34), indicating that it rejects the large majority of human-labeled PASS cases. Its accuracy (61%) is 15 pp below the council, and the GPT-4o-mini–council difference is also statistically significant (χ²(1) &gt; 3.84, p = 0.01). However, GPT-4o-mini's conservative behavior yields a low unsafe pass rate (8%), meaning it rarely approves a response the human labeled as incorrect.
                    </p>

                    {/* Table 1 */}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-ter)', marginBottom: '0.5rem' }}>
                        <strong>Table 1.</strong> Agreement with human labels on the 5,000-case benchmark. UPR = unsafe pass rate. Wilson 95% CI for accuracy in brackets.
                    </p>
                    <div style={tableWrapStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    {['Evaluator', 'Acc. [95% CI]', 'UPR', 'Prec.', 'Rec.', 'F1', 'κ', 'Brier', 'Cost/case', 'Latency'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {['Council', '76% [0.74, 0.77]', '16%', '83%', '68%', '0.75', '0.52', '0.17', '$0.002025', '37.4 s'].map((v, i) => (
                                        <td key={i} style={tdStyle}>{v}</td>
                                    ))}
                                </tr>
                                <tr>
                                    {['GPT-4o-mini', '61% [0.60, 0.62]', '8%', '84%', '34%', '0.48', '0.25', '0.23', '$0.000460', '9.3 s'].map((v, i) => (
                                        <td key={i} style={tdStyle}>{v}</td>
                                    ))}
                                </tr>
                                <tr>
                                    {['Gemini Flash', '82% [0.80, 0.83]', '17%', '84%', '81%', '0.82', '0.63', '0.16', '$0.000402', '10.5 s'].map((v, i) => (
                                        <td key={i} style={tdHighStyle}>{v}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <figure style={figStyle}>
                        <img src="/figures/fig5_confusion.png" alt="Confusion matrices for each evaluator" style={figImgStyle} />
                        <figcaption style={figCaptionStyle}>
                            <strong>Figure 1.</strong> Confusion matrices for each evaluator (rows: human label; columns: predicted label). GPT-4o-mini's false-negative count reflects its conservative decision boundary. Gemini and the council have similar false-positive counts; Gemini has substantially fewer false negatives.
                        </figcaption>
                    </figure>

                    <h3 style={h3Style}>Per-Domain Analysis</h3>
                    <p style={pStyle}>
                        The Financial domain shows the largest gap in this study. Single Gemini Flash achieves 89.0% accuracy on Financial cases versus 62.0% for the council and 56.5% for GPT-4o-mini — a 27 pp gap between Gemini and the council. Gemini is the strongest evaluator in all three domains. The council is most competitive in the Technical subset (81.3% vs. Gemini's 84.5%).
                    </p>

                    {/* Table 2 */}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-ter)', marginBottom: '0.5rem' }}>
                        <strong>Table 2.</strong> Per-domain accuracy breakdown. Δ = Council − Gemini. Financial cases (n = 200) show the largest gap.
                    </p>
                    <div style={tableWrapStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    {['Domain', 'n', 'Council', 'GPT-4o-mini', 'Gemini Flash', 'Δ'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>{['General', '3,928', '74.9%', '59.4%', '80.4%', '−5 pp'].map((v, i) => <td key={i} style={i === 4 ? tdHighStyle : tdStyle}>{v}</td>)}</tr>
                                <tr>{['Technical', '872', '81.3%', '70.1%', '84.5%', '−3 pp'].map((v, i) => <td key={i} style={i === 4 ? tdHighStyle : tdStyle}>{v}</td>)}</tr>
                                <tr>{['Financial', '200', '62.0%', '56.5%', '89.0%', '−27 pp'].map((v, i) => <td key={i} style={i === 4 ? tdHighStyle : tdStyle}>{v}</td>)}</tr>
                            </tbody>
                        </table>
                    </div>

                    <figure style={figStyle}>
                        <img src="/figures/fig6_domains.png" alt="Per-domain accuracy by evaluator" style={figImgStyle} />
                        <figcaption style={figCaptionStyle}>
                            <strong>Figure 2.</strong> Per-domain accuracy by evaluator. Gemini Flash leads in all three domains. The Financial domain (n = 200) shows the largest gap between Gemini and the council (−27 pp).
                        </figcaption>
                    </figure>

                    <h3 style={h3Style}>Cost–Accuracy Trade-off</h3>
                    <p style={pStyle}>
                        Gemini provides the strongest operating point, combining the highest accuracy with the lowest per-case cost. The council is dominated: it achieves lower accuracy than Gemini at approximately 5× the cost. At a scale of one million evaluated cases, the council would cost approximately $2,025 versus $402 for Gemini alone — a $1,623 premium for 6 pp lower accuracy.
                    </p>

                    <figure style={figStyle}>
                        <img src="/figures/fig1_pareto.png" alt="Cost-accuracy trade-off" style={figImgStyle} />
                        <figcaption style={figCaptionStyle}>
                            <strong>Figure 3.</strong> Cost–accuracy trade-off across evaluated configurations. Gemini Flash is the Pareto-dominant configuration; the council achieves lower accuracy at higher cost.
                        </figcaption>
                    </figure>

                    <h3 style={h3Style}>Calibration and Score Distributions</h3>
                    <p style={pStyle}>
                        Gemini has the strongest calibration by Brier score (0.16), with PASS and FAIL distributions more clearly separated around the 0.7 decision threshold. GPT-4o-mini shows compressed scores concentrated in the 0.3–0.5 range regardless of human verdict, which explains the combination of adequate precision and near-chance recall. The council is intermediate in calibration (Brier 0.17).
                    </p>

                    <figure style={figStyle}>
                        <img src="/figures/fig4_calibration.png" alt="Reliability diagrams" style={figImgStyle} />
                        <figcaption style={figCaptionStyle}>
                            <strong>Figure 4.</strong> Reliability diagrams showing predicted score (x-axis) against fraction of cases the human labeled PASS (y-axis). Gemini Flash is closest to the perfect-calibration diagonal. GPT-4o-mini scores concentrate in the 0.3–0.5 range regardless of human label.
                        </figcaption>
                    </figure>

                    <h3 style={h3Style}>Error Correlation</h3>
                    <p style={pStyle}>
                        The council's mistakes remain correlated with the errors of its constituent judges, which is qualitatively consistent with prior concerns about correlated judge failures in ensemble evaluation. We treat this as descriptive evidence; it does not establish a causal account of the deliberation mechanism.
                    </p>

                    <figure style={figStyle}>
                        <img src="/figures/fig2_error_correlation.png" alt="Pairwise error correlation" style={{ ...figImgStyle, maxWidth: '480px' }} />
                        <figcaption style={figCaptionStyle}>
                            <strong>Figure 5.</strong> Pairwise Pearson correlation of binary error vectors across the 5,000 cases. Council errors remain positively correlated with constituent judge errors rather than being averaged away by deliberation.
                        </figcaption>
                    </figure>

                    <h3 style={h3Style}>Comparison with the Pilot Study</h3>
                    <p style={pStyle}>
                        A prior pilot study at n = 200, conducted on a separately constructed synthetic dataset, yielded a different ranking. In that study, GPT-4o-mini appeared strongest at 97% accuracy, the council was intermediate at 87%, and Gemini trailed at 88%. In the 5,000-case benchmark, that ordering fully reverses: Gemini is strongest at 82%, the council is intermediate at 76%, and GPT-4o-mini is weakest at 61%.
                    </p>
                    <p style={pStyle}>
                        The reversal is not attributable to sampling noise. At n = 200, the Wilson confidence interval for GPT-4o-mini's accuracy was approximately [0.93, 0.99]; in the full benchmark it tightens to [0.60, 0.62]. These intervals do not overlap. The most plausible explanation is distributional: the pilot benchmark was hand-constructed with expert review across six clean domains, while the full benchmark includes the broader variety of naturally occurring RAG failure patterns present in <a href="#ref-niu" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RAGTruth</a> and <a href="#ref-ravi" style={{ color: 'var(--accent)', textDecoration: 'none' }}>HaluBench</a>.
                    </p>
                    <p style={pStyle}>
                        The methodological implication is direct: confidence intervals at small sample sizes can be tight without being accurate, because they quantify uncertainty about the <em>sample</em> mean, not about whether the sample is representative of the target distribution.
                    </p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* §5 Discussion */}
                <section id="discussion">
                    <h2 style={h2Style}>5. Discussion</h2>
                    <p style={pStyle}>
                        The main empirical result is that a single Gemini judge outperforms the deliberative council across predictive quality, calibration, cost, and latency. This does not imply that all councils are ineffective. Rather, the results suggest that the combination of heterogeneous rubrics, heterogeneous model families, and deliberative aggregation does not improve over the best individual member on this benchmark.
                    </p>
                    <p style={pStyle}>
                        <strong>Rubric diversity as a confound.</strong> The three judges evaluate different dimensions: faithfulness (GPT-4o-mini), groundedness (Claude Haiku), and context relevancy (Gemini Flash). If these rubrics align differently with the human PASS/FAIL labels, their disagreements reflect metric mismatch as well as genuine quality variation. The deliberator must reconcile both sources of disagreement without being able to distinguish them.
                    </p>
                    <p style={pStyle}>
                        <strong>The UPR–recall tradeoff.</strong> GPT-4o-mini has the lowest unsafe pass rate (8%) — it rarely approves a response the human found incorrect — while producing many false rejections of correct responses (recall 0.34). Gemini and the council have higher UPRs (17% and 16%) but substantially better recall. Which configuration is preferable depends on the asymmetry of errors in the deployment context. For applications where approving an incorrect response is more costly — medical or legal RAG — GPT-4o-mini's conservative behavior may be appropriate despite its lower accuracy.
                    </p>
                    <p style={pStyle}>
                        <strong>Contextualizing prior positive findings.</strong> <a href="#ref-verga" style={{ color: 'var(--accent)', textDecoration: 'none' }}>PoLL</a> studied a different task family (open-domain generation) and used simple majority vote rather than LLM deliberation. <a href="#ref-kaushal" style={{ color: 'var(--accent)', textDecoration: 'none' }}>DeliberationBench</a> found deliberation underperforms simpler aggregation across several benchmarks. Our result is consistent with that evidence but limited to a specific council design, aggregation strategy, and benchmark. It should not be read as a general claim that multi-judge evaluation cannot work.
                    </p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* §6 Limitations */}
                <section id="limitations">
                    <h2 style={h2Style}>6. Limitations</h2>
                    <ol style={olStyle}>
                        <li style={liStyle}>We do not evaluate Claude Haiku as a standalone judge, so we cannot rank all council members individually or determine whether the council's underperformance is driven primarily by a single weak member.</li>
                        <li style={liStyle}>We evaluate only one council composition and one aggregation strategy at scale: deliberative synthesis by Claude Sonnet 4. Whether statistical aggregation (majority vote) would produce different results at n = 5,000 is an open question.</li>
                        <li style={liStyle}>Because the standalone baselines use different rubrics from one another, the comparison reflects deployed pipeline configurations rather than a clean ablation of model identity.</li>
                        <li style={liStyle}>The appropriate evaluator choice depends on error asymmetry in the target application, which varies across domains; aggregate accuracy rankings may not hold for all deployment contexts.</li>
                        <li style={liStyle}>The benchmark labels are binary; richer ordinal or task-specific labels might reveal distinctions not visible in PASS/FAIL classification.</li>
                        <li style={liStyle}>We evaluate only commercial model families, so the findings may not transfer to open-weight judges or alternative prompting strategies.</li>
                        <li style={liStyle}>The Financial subset (n = 200) is at the same scale as the pilot study whose rankings proved unreliable; the 27 pp gap reported for that domain should be interpreted with caution pending replication on a larger financial corpus.</li>
                    </ol>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* §7 Conclusion */}
                <section id="conclusion">
                    <h2 style={h2Style}>7. Conclusion</h2>
                    <p style={pStyle}>
                        We presented a 5,000-case benchmark for studying deliberative multi-LLM judge councils in RAG evaluation. On this benchmark, a single Gemini 2.0 Flash judge outperforms a three-judge deliberative council on accuracy, F1, calibration, cost, and latency across all three domains tested. The largest gap is in Financial evaluation (−27 pp), a domain where multi-judge evaluation is frequently advocated.
                    </p>
                    <p style={pStyle}>
                        A prior pilot study at n = 200 on a separately constructed synthetic benchmark produced the opposite evaluator ranking, with GPT-4o-mini appearing strongest. The ranking reversal — driven by distributional differences between the synthetic pilot and the natural corpora (<a href="#ref-niu" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RAGTruth</a>, <a href="#ref-ravi" style={{ color: 'var(--accent)', textDecoration: 'none' }}>HaluBench</a>) used at scale — illustrates that tight confidence intervals at small sample sizes can be misleading. Benchmark composition appears to matter as much as the aggregation design being evaluated.
                    </p>
                    <p style={pStyle}>
                        The practical implication is limited but actionable: deliberative council aggregation should not be assumed to improve evaluator quality in RAG settings, and its value should be validated against strong standalone baselines on representative data before deployment.
                    </p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* Appendix */}
                <section id="appendix">
                    <h2 style={h2Style}>A. Judge Prompts and Aggregation Protocol</h2>
                    <p style={pStyle}>
                        This appendix provides the full system prompts used for each judge configuration and the deliberation aggregation protocol, sufficient for reproduction of the benchmark.
                    </p>

                    <h3 style={h3Style}>A.1 Faithfulness Judge (GPT-4o-mini)</h3>
                    <p style={pStyle}>
                        The faithfulness rubric instructs the model to act as a skeptical auditor that assumes errors exist unless context explicitly confirms each claim. The prompt provides three placeholders and requires a structured chain-of-thought before scoring:
                    </p>
                    <ol style={olStyle}>
                        <li style={liStyle}>List every factual claim in the output (numbered).</li>
                        <li style={liStyle}>For each claim, identify the exact supporting passage or mark it <code>UNSUPPORTED</code>.</li>
                        <li style={liStyle}>Count the ratio of supported to total claims.</li>
                        <li style={liStyle}>Assess severity of any unsupported claims (minor detail vs. critical fact).</li>
                    </ol>
                    <p style={pStyle}>Scoring rubric: 1.0 = every claim directly supported; 0.7–0.9 = mostly supported with trivial gaps; 0.4–0.6 = some significant unsupported claims; 0.1–0.3 = many unsupported claims; 0.0 = completely fabricated.</p>
                    <div style={codeBlockStyle}>
                        Response format (JSON): score, reasoning, hallucinations (array),<br />
                        confidence, reason, details: &#123; totalClaims, supportedClaims, unsupportedClaims &#125;
                    </div>

                    <h3 style={h3Style}>A.2 Groundedness Judge (Claude Haiku)</h3>
                    <p style={pStyle}>
                        The groundedness rubric asks the model to trace each claim back to a specific source passage in the retrieval context, rating grounding strength as strong (direct quote/paraphrase), moderate (inference), weak (tangential), or none.
                    </p>
                    <p style={pStyle}>The chain-of-thought requires: listing claims, quoting the exact supporting passage or marking UNSUPPORTED, rating grounding strength per claim, and assessing whether ungrounded claims are minor or critical. The scoring rubric mirrors faithfulness: 1.0 = every claim traced to a source; 0.7–0.9 = most claims grounded with acceptable minor inferences; 0.4–0.6 = mixed; 0.1–0.3 = poor; 0.0 = no grounding.</p>
                    <div style={codeBlockStyle}>
                        Response format (JSON): score, reasoning, hallucinations, confidence, reason,<br />
                        details: &#123; claims: [&#123; claim, sourcePassage, groundingStrength &#125;] &#125;
                    </div>

                    <h3 style={h3Style}>A.3 Context Relevancy Judge (Gemini 2.0 Flash)</h3>
                    <p style={pStyle}>
                        The context relevancy rubric evaluates whether the <em>retrieved context</em> is sufficient and relevant for the query, rather than evaluating the response directly. The chain-of-thought requires: listing what information the query needs, checking whether the context contains each piece, identifying noisy or off-topic passages, and assessing whether missing information could cause hallucination.
                    </p>
                    <p style={pStyle}>Scoring rubric: 1.0 = context is highly relevant and sufficient; 0.7–0.9 = mostly relevant with minor gaps; 0.4–0.6 = partial; 0.1–0.3 = mostly irrelevant; 0.0 = completely irrelevant.</p>
                    <div style={codeBlockStyle}>
                        Response format (JSON): score, reasoning, confidence, reason,<br />
                        details: &#123; relevantPassages, totalPassages, missingTopics, noiseLevel &#125;
                    </div>

                    <h3 style={h3Style}>A.4 Deliberation Aggregation (Claude Sonnet 4)</h3>
                    <p style={pStyle}>
                        The three judges run in parallel. Once all three complete, Claude Sonnet 4 receives a prompt containing: (1) all three judges' full JSON outputs (score, reasoning, hallucination lists, confidence, details), (2) the original query, (3) the model response, and (4) the expected output if available.
                    </p>
                    <p style={pStyle}>
                        The aggregation prompt instructs Sonnet to produce a single synthesized verdict (PASS/WARN/FAIL), an overall score in [0, 1], a 2–3 sentence synthesis explaining what the judges are disagreeing about, a list of specific disagreement points, and a concrete recommendation for resolving the root cause of disagreement. The final verdict is determined by Sonnet's synthesis rather than by a fixed voting rule; this distinguishes the deliberative protocol evaluated here from simple majority vote.
                    </p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* References */}
                <section>
                    <h2 style={h2Style}>References</h2>
                    <ol style={{ ...olStyle, fontSize: '0.8125rem', color: 'var(--text-ter)' }}>
                        <li id="ref-kaushal" style={liStyle}>Kaushal et al. (2025). <a href="https://arxiv.org/abs/2601.08835" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>DeliberationBench: Evidence for negative results in deliberative evaluation protocols.</a></li>
                        <li id="ref-niu" style={liStyle}>Niu et al. (2024). <a href="https://arxiv.org/abs/2401.00396" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RAGTruth: A hallucination corpus for developing trustworthy retrieval-augmented language models.</a></li>
                        <li id="ref-ravi" style={liStyle}>Ravi et al. (2024). <a href="https://arxiv.org/abs/2407.08488" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>HaluBench: A hallucination leaderboard for generation benchmarking.</a></li>
                        <li id="ref-tian" style={liStyle}>Tian et al. (2025). <a href="https://arxiv.org/abs/2508.06225" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Overconfidence in LLM-as-a-Judge: Calibration and reliability in automated evaluation.</a></li>
                        <li id="ref-verga" style={liStyle}>Verga et al. (2024). <a href="https://arxiv.org/abs/2404.18796" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Replacing judges with juries: Evaluating LLM generations with a panel of diverse models.</a></li>
                        <li id="ref-wang" style={liStyle}>Wang et al. (2025). Rating LLM outputs: Treating judge scores as model-dependent ratings.</li>
                        <li id="ref-zhao" style={liStyle}>Zhao et al. (2026). <a href="https://arxiv.org/abs/2603.00039" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>CARE: Confounder-aware aggregation for robust ensemble evaluation.</a></li>
                        <li id="ref-zheng" style={liStyle}>Zheng et al. (2024). <a href="https://arxiv.org/abs/2306.05685" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Judging LLM-as-a-judge with MT-bench and chatbot arena.</a></li>
                        <li id="ref-zhou" style={liStyle}>Zhou et al. (2025). <a href="https://arxiv.org/abs/2505.20854" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>SE-Jury: Dynamic judge selection for software engineering evaluation.</a></li>
                    </ol>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '2rem 0' }} />

                {/* Bottom CTA */}
                <div style={{ textAlign: 'center', padding: '1.5rem 0 0' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-ter)', marginBottom: '1.25rem' }}>
                        arXiv submission pending · Preprint, March 2026
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.5rem 1.25rem', borderRadius: 8,
                                background: 'var(--accent)', color: '#fff',
                                fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
                            }}
                        >
                            <Github size={15} /> GitHub Repo
                        </a>
                        <a
                            href={SUBSTACK_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.5rem 1.25rem', borderRadius: 8,
                                background: 'transparent', color: 'var(--text-primary)',
                                border: '1px solid var(--card-border)',
                                fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
                            }}
                        >
                            <ExternalLink size={15} /> Blog Post
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
