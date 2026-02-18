import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { ErrorAlert } from '../ui/ErrorAlert';
import { WEBHOOK_EVENT_OPTIONS } from '../../lib/constants';

export function AddWebhookForm({ onSubmit, onCancel }) {
    const [form, setForm] = useState({
        name: '', url: '', secret: '', events: ['evaluation_complete'],
        scoreThreshold: 0.7, costSpikeMultiplier: 2,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const toggleEvent = (event) => {
        setForm(f => ({
            ...f,
            events: f.events.includes(event)
                ? f.events.filter(e => e !== event)
                : [...f.events, event],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.url || form.events.length === 0) {
            setError('Name, URL, and at least one event are required');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit({
                name: form.name,
                url: form.url,
                secret: form.secret || undefined,
                events: form.events,
                config: {
                    scoreThreshold: parseFloat(form.scoreThreshold),
                    costSpikeMultiplier: parseFloat(form.costSpikeMultiplier),
                },
            });
        } catch (err) {
            setError(err.message);
        }
        setSubmitting(false);
    };

    return (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">New Webhook</h3>
                <button onClick={onCancel} className="text-text-tertiary hover:text-text-primary"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label htmlFor="wh-name" className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Name</label>
                    <input
                        id="wh-name"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Slack Alerts"
                        className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    />
                </div>
                <div>
                    <label htmlFor="wh-url" className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">URL</label>
                    <input
                        id="wh-url"
                        value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    />
                </div>
                <div>
                    <label htmlFor="wh-secret" className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Secret (optional)</label>
                    <input
                        id="wh-secret"
                        value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                        placeholder="HMAC signing secret"
                        className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    />
                </div>
                <div>
                    <p className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Events</p>
                    <div className="flex flex-wrap gap-2">
                        {WEBHOOK_EVENT_OPTIONS.map(opt => (
                            <button
                                key={opt.value} type="button" onClick={() => toggleEvent(opt.value)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.events.includes(opt.value)
                                    ? 'bg-accent text-accent-foreground border-accent'
                                    : 'bg-surface text-text-secondary border-surface-border hover:bg-surface-secondary'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="wh-score-threshold" className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Score Threshold</label>
                        <input
                            id="wh-score-threshold"
                            type="number" step="0.1" min="0" max="1"
                            value={form.scoreThreshold} onChange={e => setForm(f => ({ ...f, scoreThreshold: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                        />
                    </div>
                    <div>
                        <label htmlFor="wh-cost-multiplier" className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Cost Spike Multiplier</label>
                        <input
                            id="wh-cost-multiplier"
                            type="number" step="0.5" min="1"
                            value={form.costSpikeMultiplier} onChange={e => setForm(f => ({ ...f, costSpikeMultiplier: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                        />
                    </div>
                </div>
                <ErrorAlert message={error} />
                <button
                    type="submit" disabled={submitting}
                    className="w-full px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                    {submitting ? 'Creating...' : 'Create Webhook'}
                </button>
            </form>
        </div>
    );
}

AddWebhookForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};
