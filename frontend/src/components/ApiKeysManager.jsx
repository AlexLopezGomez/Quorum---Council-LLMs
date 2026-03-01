import { useState, useCallback } from 'react';
import { Lock, Pencil, Trash2, X } from 'lucide-react';
import { sileo } from 'sileo';
import { PageHeader } from './PageHeader';
import { ErrorAlert } from './ui/ErrorAlert';
import { getKeys, setKey, deleteKey } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';

const PROVIDERS = [
  { id: 'openai',    label: 'OpenAI',    meta: 'Faithfulness · gpt-4o-mini',                                    dot: 'bg-openai',    bar: 'bg-openai' },
  { id: 'anthropic', label: 'Anthropic', meta: 'Groundedness + Aggregator · claude-3-haiku / claude-sonnet-4', dot: 'bg-anthropic', bar: 'bg-anthropic' },
  { id: 'google',    label: 'Google',    meta: 'Context Relevancy · gemini-2.5-flash',                          dot: 'bg-gemini',    bar: 'bg-gemini' },
];

function ConfirmModal({ provider, loading, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-xl border border-surface-border shadow-xl p-6 w-full max-w-sm mx-4 animate-fadeInUp">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-semibold text-text-primary">Remove {provider.label} key?</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors -mt-0.5 -mr-1"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-text-secondary mb-5 leading-relaxed">
          The key will be permanently deleted. Evaluations will fall back to the shared server key.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm text-text-secondary rounded-lg border border-surface-border hover:bg-surface-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApiKeysManager() {
  const fetchFn = useCallback((signal) => getKeys(signal), []);
  const { data, loading, error, refetch } = useApiQuery(fetchFn);
  const configured = data?.configured ?? { openai: false, anthropic: false, google: false };

  const [inputs,  setInputs]  = useState({ openai: '', anthropic: '', google: '' });
  const [saving,  setSaving]  = useState({ openai: false, anthropic: false, google: false });
  const [editing, setEditing] = useState({ openai: false, anthropic: false, google: false });
  const [deleting,setDeleting]= useState({ openai: false, anthropic: false, google: false });
  const [errors,  setErrors]  = useState({ openai: '', anthropic: '', google: '' });
  const [confirm, setConfirm] = useState(null);

  async function handleSave(id) {
    const key = inputs[id].trim();
    if (!key) return;
    setSaving(s => ({ ...s, [id]: true }));
    setErrors(e => ({ ...e, [id]: '' }));
    try {
      await setKey(id, key);
      setInputs(i => ({ ...i, [id]: '' }));
      setEditing(e => ({ ...e, [id]: false }));
      refetch();
      sileo.success({ title: 'Key saved' });
    } catch (err) {
      setErrors(e => ({ ...e, [id]: err.message }));
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  async function handleRemove(id) {
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      await deleteKey(id);
      setConfirm(null);
      refetch();
      sileo.success({ title: 'Key removed' });
    } catch (err) {
      setErrors(e => ({ ...e, [id]: err.message }));
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  }

  function cancelEdit(id) {
    setEditing(e => ({ ...e, [id]: false }));
    setInputs(i => ({ ...i, [id]: '' }));
    setErrors(e => ({ ...e, [id]: '' }));
  }

  const confirmProvider = confirm ? PROVIDERS.find(p => p.id === confirm) : null;

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Keys are AES-256 encrypted at rest. Falls back to shared server keys when none are configured."
      />
      <ErrorAlert message={error?.message} className="mb-6" />

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden animate-pulse">
              <div className="h-0.5 bg-surface-tertiary" />
              <div className="px-6 py-4 border-b border-surface-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-surface-tertiary" />
                <div className="h-3 w-20 bg-surface-tertiary rounded" />
                <div className="h-3 w-40 bg-surface-tertiary rounded" />
              </div>
              <div className="p-6">
                <div className="h-9 bg-surface-tertiary rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {PROVIDERS.map(p => {
            const isConfigured = configured[p.id];
            const isEditing = editing[p.id];

            return (
              <div key={p.id} className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
                <div className={`h-0.5 ${p.bar}`} />

                <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${p.dot}`} />
                    <span className="text-sm font-semibold text-text-primary">{p.label}</span>
                    <span className="text-xs text-text-secondary">{p.meta}</span>
                  </div>
                  {isConfigured && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Lock size={10} />
                      Configured
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {isConfigured && !isEditing ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 px-3 py-2 bg-surface-secondary border border-surface-border rounded-lg font-mono text-sm text-text-tertiary tracking-widest select-none">
                        ••••••••••••••••••••••••••••••••
                      </div>
                      <button
                        onClick={() => setEditing(e => ({ ...e, [p.id]: true }))}
                        className="flex items-center gap-1.5 px-3 py-2 bg-surface text-text-secondary text-sm font-medium rounded-lg border border-surface-border hover:bg-surface-secondary hover:text-text-primary transition-colors"
                      >
                        <Pencil size={14} />
                        Modify
                      </button>
                      <button
                        onClick={() => setConfirm(p.id)}
                        className="p-2 rounded-lg text-text-tertiary border border-surface-border hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                        title="Remove key"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        type="password"
                        value={inputs[p.id]}
                        onChange={e => setInputs(i => ({ ...i, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSave(p.id)}
                        placeholder={isEditing ? 'Paste replacement key…' : 'Paste your key…'}
                        autoFocus={isEditing}
                        className="flex-1 px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                      />
                      <button
                        onClick={() => handleSave(p.id)}
                        disabled={!inputs[p.id].trim() || saving[p.id]}
                        className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving[p.id] ? 'Saving…' : 'Save'}
                      </button>
                      {isEditing && (
                        <button
                          onClick={() => cancelEdit(p.id)}
                          className="px-3 py-2 bg-surface text-text-secondary text-sm rounded-lg border border-surface-border hover:bg-surface-secondary transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}

                  {errors[p.id] && (
                    <p className="mt-2 text-xs text-red-500">{errors[p.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && confirmProvider && (
        <ConfirmModal
          provider={confirmProvider}
          loading={deleting[confirm]}
          onConfirm={() => handleRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
