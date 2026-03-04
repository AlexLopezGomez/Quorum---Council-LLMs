import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Upload, Play, ChevronDown, Zap, Users, GitMerge, Cpu, Sparkles, Maximize2, X } from 'lucide-react';
import { STRATEGIES, STRATEGY_DESCRIPTIONS } from '../lib/constants';
import { PageHeader } from './PageHeader';
import { ErrorAlert } from './ui/ErrorAlert';
import { DEMO_TEST_CASES } from '../lib/demoTestCases';

const SAMPLE_DATA = [
  {
    input: "What is the capital of France?",
    actualOutput: "The capital of France is Paris. It is known as the City of Light and is famous for the Eiffel Tower.",
    expectedOutput: "Paris",
    retrievalContext: [
      "Paris is the capital and largest city of France. With a population of over 2 million residents, it is the center of French economic and cultural life.",
      "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. It is named after the engineer Gustave Eiffel.",
    ],
  },
  {
    input: "How does photosynthesis work?",
    actualOutput: "Photosynthesis converts sunlight into chemical energy. Plants use chlorophyll to absorb light, combining CO2 and water to produce glucose and oxygen. This process occurs mainly in leaves.",
    retrievalContext: [
      "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. The process takes place primarily in the leaves of plants.",
      "Chlorophyll is the green pigment in plants that absorbs sunlight. It is essential for photosynthesis.",
      "The photosynthesis equation: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2",
    ],
  },
  {
    input: "What are the benefits of exercise?",
    actualOutput: "Exercise improves cardiovascular health, boosts mood through endorphin release, helps maintain healthy weight, strengthens muscles and bones, and can extend lifespan by up to 50 years.",
    expectedOutput: "Exercise improves heart health, mental well-being, weight management, and muscle strength.",
    retrievalContext: [
      "Regular physical activity improves cardiovascular health and reduces the risk of heart disease.",
      "Exercise releases endorphins, which are natural mood elevators that can help reduce stress and anxiety.",
      "Studies show that regular exercise can add 3-7 years to life expectancy.",
    ],
  },
];

const STRATEGY_CARD_CONFIG = {
  auto: { icon: Zap, colorClass: 'text-blue-500', activeDot: 'bg-blue-500', description: 'Adaptive routing based on risk' },
  council: { icon: Users, colorClass: 'text-purple-600', activeDot: 'bg-purple-500', description: 'Full 3-judge + aggregator' },
  hybrid: { icon: GitMerge, colorClass: 'text-amber-600', activeDot: 'bg-amber-500', description: 'Deterministic + single judge' },
  single: { icon: Cpu, colorClass: 'text-gray-500', activeDot: 'bg-gray-400', description: 'Cheapest judge only' },
};

function validateTestCases(data) {
  const cases = Array.isArray(data) ? data : data.testCases;

  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error('Invalid format: expected an array of test cases');
  }

  for (const tc of cases) {
    if (!tc.input || !tc.actualOutput || !tc.retrievalContext) {
      throw new Error('Each test case must have input, actualOutput, and retrievalContext');
    }
  }

  return cases;
}

function PreviewModal({ testCases, onClose }) {
  const hasExpected = testCases.some(tc => tc.expectedOutput);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      style={{ padding: '3vh 2vw' }}
    >
      <div
        className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-surface rounded-2xl border border-surface-border shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-surface-border px-8 py-5 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Full Preview
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {testCases.length} test case{testCases.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-all duration-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cards */}
        <div className="p-6 space-y-4">
          {testCases.map((tc, i) => (
            <div
              key={`modal-tc-${i}`}
              className="bg-surface-secondary rounded-xl border border-surface-border p-5 space-y-3 animate-fadeInUp"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Test Case</span>
              </div>

              {/* Input */}
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Input</p>
                <p className="text-sm text-text-primary leading-relaxed bg-surface rounded-lg px-4 py-3 border border-surface-border">{tc.input}</p>
              </div>

              {/* Actual Output */}
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Actual Output</p>
                <p className="text-sm text-text-secondary leading-relaxed bg-surface rounded-lg px-4 py-3 border border-surface-border">{tc.actualOutput}</p>
              </div>

              {/* Expected Output */}
              {hasExpected && (
                <div>
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Expected Output</p>
                  <p className="text-sm text-text-secondary leading-relaxed bg-surface rounded-lg px-4 py-3 border border-surface-border">{tc.expectedOutput || '—'}</p>
                </div>
              )}

              {/* Context Passages */}
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Context Passages</p>
                <div className="bg-surface rounded-lg px-4 py-3 border border-surface-border space-y-2">
                  {tc.retrievalContext.map((p, j) => (
                    <div key={j} className="flex gap-2">
                      <span className="text-xs text-accent font-medium mt-0.5 shrink-0">{j + 1}.</span>
                      <p className="text-xs text-text-secondary leading-relaxed">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TestCaseUpload({ onSubmit, isLoading }) {
  const [testCases, setTestCases] = useState([]);
  const [error, setError] = useState(null);
  const [strategy, setStrategy] = useState('auto');
  const [name, setName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const cases = validateTestCases(data);
        setTestCases(cases);
        setError(null);
      } catch (err) {
        setError(err.message);
        setTestCases([]);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const loadSampleData = () => {
    setTestCases(SAMPLE_DATA);
    setError(null);
  };

  const handleSubmit = () => {
    if (testCases.length === 0) {
      setError('Please upload test cases or load sample data first');
      return;
    }
    onSubmit(testCases, { strategy, name: name.trim() });
  };

  const runDemo = () => {
    onSubmit(DEMO_TEST_CASES, { strategy: 'auto', name: 'Adaptive Demo' });
  };

  return (
    <div>
      <PageHeader title="Evaluate" subtitle="Run evaluation on your RAG system outputs" />

      <div className="grid grid-cols-3 gap-6">
        {/* Left 2/3: upload + preview */}
        <div className="col-span-2 space-y-4">
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm">
            <div className="px-6 py-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-text-primary">Upload Test Cases</h3>
              <p className="text-xs text-text-secondary mt-0.5">Upload a JSON file or use sample data to get started</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Evaluation name */}
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
                  Evaluation Name <span className="normal-case text-text-tertiary font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. RAG v2 baseline, Sprint 14 test…"
                  maxLength={100}
                  className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors flex flex-col items-center gap-3 ${isDragOver
                  ? 'border-accent bg-surface-secondary'
                  : 'border-surface-border-strong hover:border-accent hover:bg-surface-secondary'
                  }`}
              >
                <Upload
                  size={24}
                  className={`text-text-tertiary transition-transform duration-200 ${isDragOver ? 'scale-110' : ''}`}
                />
                <div className="text-center">
                  <p className="text-sm text-text-secondary">
                    Drop JSON file here, or <span className="text-accent font-medium">browse</span>
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">.json files only</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={loadSampleData}
                  className="px-4 py-2 bg-surface text-text-primary text-sm font-medium rounded-lg border border-surface-border hover:bg-surface-secondary transition-colors"
                >
                  Load Sample Data
                </button>
                <button
                  onClick={runDemo}
                  disabled={isLoading}
                  className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  Run Demo
                </button>
              </div>
            </div>
          </div>

          <ErrorAlert message={error} />

          {/* Preview table */}
          {testCases.length > 0 && (() => {
            const hasExpected = testCases.some(tc => tc.expectedOutput);
            return (
              <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
                <div className="px-6 py-3 border-b border-surface-border flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">
                    Preview ({testCases.length} test case{testCases.length > 1 ? 's' : ''})
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Scroll to see all rows and fields</span>
                    <button
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-all duration-200"
                      title="Expand full preview"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="overflow-auto max-h-80">
                  <table className="w-full min-w-[700px]">
                    <thead className="sticky top-0 bg-surface z-10 border-b border-surface-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-8">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-52">Input</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-52">Actual Output</th>
                        {hasExpected && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-44">Expected Output</th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Context Passages</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {testCases.map((tc, i) => (
                        <tr
                          key={`${tc.input.slice(0, 30)}-${i}`}
                          className="hover:bg-surface-secondary transition-colors animate-fadeInUp align-top"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          <td className="px-4 py-3 text-sm text-text-tertiary">{i + 1}</td>
                          <td className="px-4 py-3 text-sm text-text-primary break-words">{tc.input}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary break-words">{tc.actualOutput}</td>
                          {hasExpected && (
                            <td className="px-4 py-3 text-sm text-text-secondary break-words">{tc.expectedOutput || '—'}</td>
                          )}
                          <td className="px-4 py-3">
                            <ol className="space-y-1 list-decimal list-inside">
                              {tc.retrievalContext.map((p, j) => (
                                <li key={j} className="text-xs text-text-secondary break-words leading-relaxed">{p}</li>
                              ))}
                            </ol>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Preview Modal */}
          {isPreviewModalOpen && <PreviewModal testCases={testCases} onClose={() => setIsPreviewModalOpen(false)} />}

          {/* Run button */}
          {testCases.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                'Starting Evaluation...'
              ) : (
                <>
                  Run Evaluation
                  <Play size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          )}

          {/* Collapsible format hint */}
          <div>
            <button
              onClick={() => setShowFormat(!showFormat)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              View expected JSON format
              <ChevronDown size={12} className={`transition-transform duration-200 ${showFormat ? 'rotate-180' : ''}`} />
            </button>
            {showFormat && (
              <pre className="bg-surface-secondary p-3 rounded-lg overflow-x-auto text-xs text-text-secondary mt-2">
                {`[
  {
    "input": "User query",
    "actualOutput": "RAG system response",
    "expectedOutput": "Optional expected response",
    "retrievalContext": ["Context passage 1", "Context passage 2"]
  }
]`}
              </pre>
            )}
          </div>
        </div>

        {/* Right 1/3: strategy selector */}
        <div>
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm">
            <div className="px-6 py-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-text-primary">Evaluation Strategy</h3>
              <p className="text-xs text-text-secondary mt-0.5">Select how judges are assigned</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {STRATEGIES.map((s) => {
                  const cfg = STRATEGY_CARD_CONFIG[s.value];
                  const StratIcon = cfg.icon;
                  const isActive = strategy === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setStrategy(s.value)}
                      className={`flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-colors ${isActive
                        ? 'border-accent bg-surface-tertiary'
                        : 'border-surface-border hover:bg-surface-secondary'
                        }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.activeDot}`} />
                        <StratIcon size={13} className={cfg.colorClass} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text-primary capitalize">{s.value}</p>
                        <p className="text-xs text-text-tertiary leading-snug mt-0.5">{cfg.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-tertiary pt-2 border-t border-surface-border">
                {STRATEGY_DESCRIPTIONS[strategy]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

TestCaseUpload.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};
