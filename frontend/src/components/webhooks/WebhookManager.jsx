import { useState, useCallback } from 'react';
import { Bell, Plus } from 'lucide-react';
import { sileo } from 'sileo';
import { PageHeader } from '../PageHeader';
import { ErrorAlert } from '../ui/ErrorAlert';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook } from '../../lib/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { WebhookCard } from './WebhookCard';
import { AddWebhookForm } from './AddWebhookForm';

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
                        <WebhookCard key={w._id} webhook={w} onToggle={handleToggle} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}
