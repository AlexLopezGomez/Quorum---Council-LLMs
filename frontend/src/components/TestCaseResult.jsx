import PropTypes from 'prop-types';
import { JudgeCard } from './JudgeCard';
import { AggregatorCard } from './AggregatorCard';
import { StrategyBadge } from './StrategyBadge';
import { DeterministicChecksCard } from './DeterministicChecksCard';

export function TestCaseResult({ testCaseState, testCase, testCaseIndex }) {
  const { strategy, riskScore, activeJudges, deterministicResults, deterministicStatus } = testCaseState;

  const judgesToRender = activeJudges || ['openai', 'anthropic', 'gemini'];

  return (
    <div className="space-y-4">
      {strategy && (
        <StrategyBadge strategy={strategy} riskScore={riskScore} />
      )}

      {testCase && (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Input</h4>
              <p className="text-sm text-text-primary">{testCase.input}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Actual Output</h4>
              <p className="text-sm text-text-secondary">{testCase.actualOutput}</p>
            </div>
          </div>
        </div>
      )}

      {(strategy === 'hybrid') && (
        <DeterministicChecksCard
          results={deterministicResults}
          status={deterministicStatus || (deterministicResults ? 'complete' : 'idle')}
        />
      )}

      <div className={`grid gap-4 ${judgesToRender.length === 3 ? 'md:grid-cols-3' : judgesToRender.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md'}`}>
        {judgesToRender.map((judge) => (
          <JudgeCard
            key={judge}
            judge={judge}
            status={testCaseState.judges[judge]?.status || 'idle'}
            result={testCaseState.judges[judge]?.result || null}
            error={testCaseState.judges[judge]?.error || null}
          />
        ))}
      </div>

      <AggregatorCard
        status={testCaseState.aggregator.status}
        result={testCaseState.aggregator.result}
        error={testCaseState.aggregator.error}
      />
    </div>
  );
}

TestCaseResult.propTypes = {
  testCaseState: PropTypes.shape({
    strategy: PropTypes.string,
    riskScore: PropTypes.number,
    activeJudges: PropTypes.arrayOf(PropTypes.string),
    deterministicResults: PropTypes.object,
    deterministicStatus: PropTypes.string,
    judges: PropTypes.object.isRequired,
    aggregator: PropTypes.shape({
      status: PropTypes.string.isRequired,
      result: PropTypes.object,
      error: PropTypes.string,
    }).isRequired,
  }).isRequired,
  testCase: PropTypes.shape({
    input: PropTypes.string.isRequired,
    actualOutput: PropTypes.string.isRequired,
  }),
  testCaseIndex: PropTypes.number,
};
