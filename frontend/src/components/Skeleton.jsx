export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5 animate-pulse">
      <div className="h-3 w-24 bg-surface-tertiary rounded mb-4" />
      <div className="h-8 w-16 bg-surface-tertiary rounded mb-3" />
      <div className="h-1.5 w-full bg-surface-tertiary rounded mb-4" />
      <div className="space-y-2">
        <div className="h-2.5 w-full bg-surface-tertiary rounded" />
        <div className="h-2.5 w-3/4 bg-surface-tertiary rounded" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-3 w-20 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-4"><div className="h-3 w-16 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-4"><div className="h-3 w-8 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-4"><div className="h-3 w-14 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-4"><div className="h-3 w-10 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-4"><div className="h-3 w-16 bg-surface-tertiary rounded" /></td>
      <td className="px-6 py-4"><div className="h-3 w-20 bg-surface-tertiary rounded" /></td>
    </tr>
  );
}
