import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Bell, Plus, Trash2, Zap, X } from 'lucide-react';
import { sileo } from 'sileo';
import { PageHeader } from './PageHeader';
import { ErrorAlert } from './ui/ErrorAlert';
import { WEBHOOK_EVENT_OPTIONS } from '../lib/constants';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';

function WebhookCard({ webhook, onToggle, onDelete, onTest }) {
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
  onTest: PropTypes.func,
};

function AddWebhookForm({ onSubmit, onCancel }) {
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

export function WebhookManager() {
  const [showForm, setShowForm] = useState(false);

  const fetchFn = useCallback((signal) => getWebhooks(signal), []);
  const { data, loading, error, refetch } = useApiQuery(fetchFn, []);

  const webhooks = data?.webhooks || [];

  const handleCreate = async (webhookData) => {
    await createWebhook(webhookData);
    setShowForm(false);
    refetch();
  };

  const handleToggle = async (id, active) => {
    try {
      await updateWebhook(id, { active });
      refetch();
    } catch (err) {
      console.error('Toggle webhook error:', err);
      sileo.error({ title: 'Failed to update webhook' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWebhook(id);
      refetch();
    } catch (err) {
      console.error('Delete webhook error:', err);
      sileo.error({ title: 'Failed to delete webhook' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Webhooks"
        subtitle="Configure alerts for evaluation events"
        action={
          !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Webhook
            </button>
          )
        }
      />

      <ErrorAlert message={error?.message} className="mb-6" />

      {showForm && (
        <div className="mb-6">
          <AddWebhookForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-text-tertiary animate-pulse">Loading...</div>
      ) : webhooks.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-12 text-center">
          <Bell size={32} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-sm text-text-secondary mb-1">No webhooks configured</p>
          <p className="text-xs text-text-tertiary">Add a webhook to get notified about evaluation events</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {webhooks.map(w => (
            <WebhookCard key={w._id} webhook={w} onToggle={handleToggle} onDelete={handleDelete} onTest={() => { }} />
          ))}
        </div>
      )}
    </div>
  );
}
