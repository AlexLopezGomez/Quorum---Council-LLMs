/**
 * Returns a Tailwind background-color class based on a 0–1 score.
 * Used for score progress bars across JudgeCard, AggregatorCard, DeterministicChecksCard, etc.
 */
export function getScoreBarColor(score) {
    if (score >= 0.7) return 'bg-verdict-pass';
    if (score >= 0.4) return 'bg-verdict-warn';
    return 'bg-verdict-fail';
}

/**
 * Returns a Tailwind text-color class based on a 0–1 score.
 */
export function getScoreTextColor(score) {
    if (score >= 0.7) return 'text-emerald-600';
    if (score >= 0.5) return 'text-amber-600';
    return 'text-red-600';
}

/**
 * Safe `.toFixed()` — returns a dash when the value is null/undefined/NaN.
 * Prevents crashes from `null.toFixed()` across summary cards.
 */
export function safeFixed(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return Number(value).toFixed(digits);
}

/**
 * Format a date string for display. Returns '-' for falsy values.
 */
export function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Safely parse JSON. Returns null on failure instead of throwing.
 */
export function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (err) {
        console.warn('Failed to parse JSON:', err.message);
        return null;
    }
}
