import { useState, useCallback } from 'react';
import { Key, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { sileo } from 'sileo';
import { ErrorAlert } from './ui/ErrorAlert';
import { getServiceKeys, createServiceKey, deleteServiceKey } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { formatRelative } from '../lib/utils';

const SCOPE_STYLES = {
  ingest: {
    bg: 'bg-surface-tertiary',
    text: 'text-text-secondary',
    border: 'border-surface-border',
  },
  evaluate: {
    bg: 'bg-accent/10',
    text: 'text-accent',
    border: 'border-accent/20',
  },
};

function ScopeBadge({ scope }) {
  const s = SCOPE_STYLES[scope] || SCOPE_STYLES.ingest;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}
    >
      {scope}
    </span>
  );
}

function CopyModal({ rawKey, onClose }) {
  const [copied, setCopied] = useState(false);
  const clipboardAvailable = typeof navigator !== 'undefined' && !!navigator.clipboard;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* handled by fallback input below */
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl border border-surface-border shadow-lg p-6 max-w-md w-full mx-4 animate-fadeInUp">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Copy your key now — it won&apos;t be shown again</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors -mt-0.5 -mr-1"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="bg-surface-tertiary rounded-lg p-3 font-mono text-sm break-all text-text-primary mb-4 select-all">
          {rawKey}
        </div>

        {clipboardAvailable ? (
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        ) : (
          <div className="space-y-2">
            <input
              readOnly
              value={rawKey}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 text-xs font-mono bg-surface border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label="Service key — select all and copy manually"
            />
            <p className="text-xs text-text-tertiary">Select all and copy manually (clipboard API unavailable)</p>
          </div>
        )}

        <p className="text-xs text-text-tertiary mt-3 text-center">
          Make sure you&apos;ve copied the key before closing
        </p>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-3"><div className="h-3 w-32 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-3"><div className="h-3 w-20 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-3 hidden sm:table-cell"><div className="h-3 w-24 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-3 hidden sm:table-cell"><div className="h-3 w-16 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-3 hidden sm:table-cell"><div className="h-3 w-16 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-3"><div className="h-3 w-14 bg-surface-tertiary rounded" /></td>
    </tr>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center py-12 text-center gap-3">
      <Key size={28} className="text-text-tertiary" />
      <p className="text-sm font-semibold text-text-primary">No service keys yet</p>
      <p className="text-sm text-text-secondary max-w-xs">
        Create a key to integrate Quorum into your production pipeline.
      </p>
      <CreateForm onCreate={onCreate} alwaysExpanded />
    </div>
  );
}

function CreateForm({ onCreate, alwaysExpanded = false }) {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState({ ingest: true, evaluate: false });
  const [submitting, setSubmitting] = useState(false);

  function toggleScope(scope) {
    setScopes((s) => ({ ...s, [scope]: !s[scope] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const selectedScopes = Object.entries(scopes).filter(([, v]) => v).map(([k]) => k);
    if (selectedScopes.length === 0) {
      sileo.error({ title: 'Select at least one scope' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await createServiceKey(trimmed, selectedScopes);
      setName('');
      setScopes({ ingest: true, evaluate: false });
      if (!alwaysExpanded) setExpanded(false);
      onCreate(result);
    } catch (err) {
      sileo.error({ title: err.message || 'Failed to create key' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!alwaysExpanded && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
      >
        <Plus size={14} />
        Create key
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-surface-secondary rounded-xl border border-surface-border space-y-4">
      {!alwaysExpanded && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">New service key</span>
          <button type="button" onClick={() => setExpanded(false)} className="text-text-tertiary hover:text-text-primary transition-colors">
            <ChevronUp size={14} />
          </button>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-secondary" htmlFor="sk-name">Key name</label>
        <input
          id="sk-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="e.g. production-monitoring"
          required
          className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-text-secondary">Scopes</span>
        <div className="flex gap-4">
          {['ingest', 'evaluate'].map((scope) => (
            <label key={scope} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={scopes[scope]}
                onChange={() => toggleScope(scope)}
                className="accent-accent"
              />
              {scope}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Creating…' : 'Create key'}
      </button>
    </form>
  );
}

function RevokeControl({ keyId, onRevoked }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    setLoading(true);
    try {
      await deleteServiceKey(keyId);
      onRevoked(keyId);
      sileo.success({ title: 'Key revoked' });
    } catch (err) {
      sileo.error({ title: err.message || 'Failed to revoke key' });
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <span className="text-text-secondary">Revoke?</span>
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="text-red-600 font-medium hover:underline disabled:opacity-50"
        >
          {loading ? '…' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-text-tertiary hover:text-text-primary"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-text-secondary hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
    >
      Revoke
    </button>
  );
}

export function ServiceKeysManager() {
  const fetchFn = useCallback((signal) => getServiceKeys(signal), []);
  const { data, loading, error, refetch } = useApiQuery(fetchFn);
  const allKeys = data?.keys ?? [];

  const [newKey, setNewKey] = useState(null);
  const [showRevoked, setShowRevoked] = useState(false);

  const activeKeys = allKeys.filter((k) => !k.revokedAt);
  const revokedKeys = allKeys.filter((k) => k.revokedAt);
  const visibleKeys = showRevoked ? allKeys : activeKeys;

  function handleCreated(result) {
    setNewKey(result.key);
    refetch();
  }

  function handleRevoked(keyId) {
    refetch();
    if (newKey) setNewKey(null);
  }

  return (
    <div className="animate-fadeInUp">
      <p className="text-xs text-text-tertiary mb-4 flex items-center gap-1.5">
        <Key size={12} />
        Bearer tokens for server-to-server API access.
      </p>

      {newKey && (
        <CopyModal
          rawKey={newKey}
          onClose={() => {
            setNewKey(null);
            sileo.success({ title: 'Key created — make sure you copied it' });
          }}
        />
      )}

      {error && (
        <ErrorAlert message={error.message || 'Failed to load service keys'} className="mt-4" />
      )}

      <div className="bg-surface rounded-xl border border-surface-border shadow-sm mt-4">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Scopes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Prefix</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Last Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : !error && activeKeys.length === 0 && revokedKeys.length === 0 ? (
          <div className="px-6 py-4">
            <EmptyState onCreate={handleCreated} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Scopes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Prefix</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Last Used</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell">Created</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {visibleKeys.map((k) => {
                    const revoked = !!k.revokedAt;
                    return (
                      <tr key={k.id} className={`hover:bg-surface-secondary transition-colors ${revoked ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-3 text-sm text-text-primary">
                          <span className={revoked ? 'line-through' : ''}>{k.name}</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.map((s) => <ScopeBadge key={s} scope={s} />)}
                          </div>
                        </td>
                        <td className="px-6 py-3 hidden sm:table-cell">
                          <code className="font-mono text-xs text-text-secondary bg-surface-tertiary rounded px-1 py-0.5">{k.keyPrefix}</code>
                        </td>
                        <td className="px-6 py-3 text-xs text-text-tertiary hidden sm:table-cell">
                          {k.lastUsedAt ? formatRelative(k.lastUsedAt) : 'Never'}
                        </td>
                        <td className="px-6 py-3 text-xs text-text-tertiary hidden sm:table-cell">
                          {formatRelative(k.createdAt)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {!revoked && <RevokeControl keyId={k.id} onRevoked={handleRevoked} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {revokedKeys.length > 0 && (
              <div className="px-6 py-3 border-t border-surface-border">
                <button
                  onClick={() => setShowRevoked((v) => !v)}
                  className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showRevoked ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showRevoked ? 'Hide revoked keys' : `Show ${revokedKeys.length} revoked key${revokedKeys.length === 1 ? '' : 's'}`}
                </button>
              </div>
            )}

            <div className="px-6 py-4 border-t border-surface-border">
              <CreateForm onCreate={handleCreated} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
