import PropTypes from 'prop-types';
import { safeFixed } from '../../lib/utils';
import { getScoreTextColor } from '../../lib/utils';

/**
 * Shared 4-card summary grid for evaluation results.
 * First 3 cards (Final Score, Pass Rate, Total Cost) are always shown.
 * The 4th card is customisable via the `extraCard` render-prop.
 */
export function SummaryGrid({ summary, extraCard }) {
    const scoreColor = summary?.avgFinalScore != null
        ? getScoreTextColor(summary.avgFinalScore)
        : 'text-text-primary';

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
                className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden animate-staggerFadeIn"
                style={{ '--stagger-delay': '0ms' }}
            >
                <div className="h-0.5 bg-gradient-to-r from-accent to-transparent" />
                <div className="p-5">
                    <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Final Score</p>
                    <div className="mt-2">
                        <span className={`text-2xl font-semibold animate-countUp ${scoreColor}`}
                            style={{ '--stagger-delay': '150ms' }}>
                            {safeFixed(summary?.avgFinalScore)}
                        </span>
                    </div>
                </div>
            </div>
            <div
                className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden animate-staggerFadeIn"
                style={{ '--stagger-delay': '80ms' }}
            >
                <div className="h-0.5 bg-gradient-to-r from-accent to-transparent" />
                <div className="p-5">
                    <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Pass Rate</p>
                    <div className="mt-2">
                        <span className="text-2xl font-semibold text-text-primary animate-countUp"
                            style={{ '--stagger-delay': '230ms' }}>
                            {summary?.passRate !== undefined ? `${summary.passRate}%` : '-'}
                        </span>
                    </div>
                </div>
            </div>
            <div
                className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden animate-staggerFadeIn"
                style={{ '--stagger-delay': '160ms' }}
            >
                <div className="h-0.5 bg-gradient-to-r from-accent to-transparent" />
                <div className="p-5">
                    <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Total Cost</p>
                    <div className="mt-2">
                        <span className="text-2xl font-semibold text-text-primary animate-countUp"
                            style={{ '--stagger-delay': '310ms' }}>
                            ${safeFixed(summary?.totalCost, 4)}
                        </span>
                    </div>
                </div>
            </div>
            <div
                className="animate-staggerFadeIn"
                style={{ '--stagger-delay': '240ms' }}
            >
                {extraCard}
            </div>
        </div>
    );
}

SummaryGrid.propTypes = {
    summary: PropTypes.shape({
        avgFinalScore: PropTypes.number,
        passRate: PropTypes.number,
        totalCost: PropTypes.number,
    }),
    extraCard: PropTypes.node.isRequired,
};
