import PropTypes from 'prop-types';
import { getScoreBarColor } from '../../lib/utils';

/**
 * Reusable colored progress bar for 0–1 scores.
 * Accepts an optional custom color override, otherwise derives from the score value.
 */
export function ScoreBar({ score, color, height = 'h-1.5' }) {
    const barColor = color || getScoreBarColor(score);

    return (
        <div className={`w-full ${height} bg-surface-tertiary rounded-full overflow-hidden`}>
            <div
                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                style={{ width: `${Math.round((score ?? 0) * 100)}%` }}
            />
        </div>
    );
}

ScoreBar.propTypes = {
    score: PropTypes.number.isRequired,
    color: PropTypes.string,
    height: PropTypes.string,
};
