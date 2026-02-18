import { useState } from 'react';
import PropTypes from 'prop-types';
import { Bell, Trash2, Zap } from 'lucide-react';
import { sileo } from 'sileo';
import { testWebhook } from '../../lib/api';

export function WebhookCard({ webhook, onToggle, onDelete }) {
    const [testing, setTesting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await testWebhook(webhook._id);
            if (result.success) {
                sileo.success({ title: 'Webhook test sent successfully' });
            } else {
                sileo.error({ title: `Test failed: ${result.error || `HTTP ${result.status}`}` });
            }
        } catch (err) {
            console.error('Webhook test error:', err);
            sileo.error({ title: 'Failed to send test' });
        }
        setTesting(false);
    };

    const handleDelete = async () => {
        if (!deleting) { setDeleting(true); return; }
        onDelete(webhook._id);
        setDeleting(false);
    };

    return (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-text-secondary" />
                    <span className="text-sm font-semibold text-text-primary">{webhook.name}</span>
                </div>
                <button
                    onClick={() => onToggle(webhook._id, !webhook.active)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${webhook.active ? 'bg-verdict-pass' : 'bg-surface-tertiary'}`}
                >
                    <span className={`absolute top-0.5 w-4 h-4 bg-surface rounded-full shadow transition-transform ${webhook.active ? 'left-4' : 'left-0.5'}`} />
                </button>
            </div>

            <p className="text-xs text-text-tertiary font-mono truncate mb-3">{webhook.url}</p>

            <div className="flex flex-wrap gap-1.5 mb-3">
                {webhook.events.map(e => (
                    <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary border border-surface-border">
                        {e.replace(/_/g, ' ')}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                <span className="text-xs text-text-tertiary">
                    {webhook.lastTriggered
                        ? `Last fired: ${new Date(webhook.lastTriggered).toLocaleDateString()}`
                        : 'Never triggered'}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleTest}
                        disabled={testing}
                        className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded transition-colors"
                    >
                        <Zap size={14} className="inline -mt-0.5 mr-1" />
                        {testing ? 'Sending...' : 'Test'}
                    </button>
                    <button
                        onClick={handleDelete}
                        className={`px-2 py-1 text-xs rounded transition-colors ${deleting ? 'text-verdict-fail bg-red-50' : 'text-text-tertiary hover:text-verdict-fail hover:bg-red-50'}`}
                    >
                        <Trash2 size={14} className="inline -mt-0.5 mr-1" />
                        {deleting ? 'Confirm?' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

WebhookCard.propTypes = {
    webhook: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
        active: PropTypes.bool,
        events: PropTypes.arrayOf(PropTypes.string).isRequired,
        lastTriggered: PropTypes.string,
    }).isRequired,
    onToggle: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};
