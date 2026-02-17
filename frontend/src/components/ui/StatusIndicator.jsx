import PropTypes from 'prop-types';

const STATUS_MAP = {
    connecting: { color: 'bg-text-tertiary', label: 'Connecting...' },
    connected: { color: 'bg-verdict-pass', label: 'Live' },
    complete: { color: 'bg-text-secondary', label: 'Complete' },
    error: { color: 'bg-verdict-fail', label: 'Disconnected' },
};

/**
 * Small dot + label showing the current SSE connection status.
 */
export function StatusIndicator({ status }) {
    const config = STATUS_MAP[status];
    if (!config) return null;

    return (
        <div className="flex items-center gap-2 px-3 mb-2">
            <span className={`w-2 h-2 rounded-full ${config.color}`} />
            <span className="text-xs text-text-secondary">{config.label}</span>
        </div>
    );
}

StatusIndicator.propTypes = {
    status: PropTypes.oneOf(['connecting', 'connected', 'complete', 'error', 'disconnected']),
};
