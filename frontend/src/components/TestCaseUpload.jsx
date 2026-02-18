import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, Play } from 'lucide-react';
import { STRATEGIES, STRATEGY_DESCRIPTIONS } from '../lib/constants';
import { PageHeader } from './PageHeader';
import { ErrorAlert } from './ui/ErrorAlert';

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

/**
 * Validates that an array of test cases has the required fields.
 * Throws an error with a descriptive message if validation fails.
 */
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

export function TestCaseUpload({ onSubmit, isLoading }) {
  const [testCases, setTestCases] = useState([]);
  const [error, setError] = useState(null);
  const [strategy, setStrategy] = useState('auto');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
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

  const loadSampleData = () => {
    setTestCases(SAMPLE_DATA);
    setError(null);
  };

  const handleSubmit = () => {
    if (testCases.length === 0) {
      setError('Please upload test cases or load sample data first');
      return;
    }
    onSubmit(testCases, { strategy });
  };

  return (
    <div>
      <PageHeader title="Evaluate" subtitle="Run evaluation on your RAG system outputs" />

      {/* Upload card */}
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm">
        <div className="px-6 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary">Upload Test Cases</h3>
          <p className="text-xs text-text-secondary mt-0.5">Upload a JSON file or use sample data to get started</p>
        </div>

        <div className="p-6 space-y-6">
          {/* File upload + sample */}
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-surface-border-strong rounded-xl hover:border-accent hover:bg-surface-secondary transition-colors text-sm text-text-secondary"
              >
                <Upload size={16} className="inline -mt-0.5 mr-2" />
                Upload JSON File
              </button>
            </div>
            <button
              onClick={loadSampleData}
              className="px-4 py-2 bg-surface text-text-primary text-sm font-medium rounded-lg border border-surface-border hover:bg-surface-secondary transition-colors"
            >
              Load Sample Data
            </button>
          </div>

          {/* Strategy selector */}
          <div>
            <label htmlFor="strategy-select" className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Evaluation Strategy
            </label>
            <select
              id="strategy-select"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            >
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-text-tertiary">
              {STRATEGY_DESCRIPTIONS[strategy]}
            </p>
          </div>

          {/* Error */}
          <ErrorAlert message={error} />

          {/* Preview table */}
          {testCases.length > 0 && (
            <>
              <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
                <div className="px-6 py-3 border-b border-surface-border">
                  <h4 className="text-sm font-semibold text-text-primary">
                    Preview ({testCases.length} test case{testCases.length > 1 ? 's' : ''})
                  </h4>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Input</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Output</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {testCases.map((tc, i) => (
                      <tr key={i} className="hover:bg-surface-secondary transition-colors">
                        <td className="px-6 py-4 text-sm text-text-tertiary">{i + 1}</td>
                        <td className="px-6 py-4 text-sm text-text-primary max-w-xs truncate">{tc.input}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">{tc.actualOutput}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{tc.retrievalContext.length} passages</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting Evaluation...' : <><Play size={16} className="inline -mt-0.5 mr-2" />Run Evaluation ({strategy})</>}
              </button>
            </>
          )}

          {/* Format hint */}
          <div>
            <p className="text-xs text-text-tertiary mb-2">Expected JSON format:</p>
            <pre className="bg-surface-secondary p-3 rounded-lg overflow-x-auto text-xs text-text-secondary">
              {`[
  {
    "input": "User query",
    "actualOutput": "RAG system response",
    "expectedOutput": "Optional expected response",
    "retrievalContext": ["Context passage 1", "Context passage 2"]
  }
]`}
            </pre>
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
