import PropTypes from 'prop-types';

/**
 * Consistent error alert banner.
 * Replaces 4+ inline red-alert div patterns across the app.
 */
export function ErrorAlert({ message, className = '' }) {
    if (!message) return null;

    return (
        <div
            className={`p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 ${className}`}
            role="alert"
        >
            {message}
        </div>
    );
}

ErrorAlert.propTypes = {
    message: PropTypes.string,
    className: PropTypes.string,
};
