import { Skeleton } from './ui/skeleton';

export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
      <Skeleton className="h-3 w-24 bg-surface-tertiary mb-4" />
      <Skeleton className="h-8 w-16 bg-surface-tertiary mb-3" />
      <Skeleton className="h-1.5 w-full bg-surface-tertiary mb-4" />
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-full bg-surface-tertiary" />
        <Skeleton className="h-2.5 w-3/4 bg-surface-tertiary" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-3 w-20 bg-surface-tertiary" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-16 bg-surface-tertiary" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-8 bg-surface-tertiary" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-14 bg-surface-tertiary" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-10 bg-surface-tertiary" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-16 bg-surface-tertiary" /></td>
      <td className="px-6 py-4"><Skeleton className="h-3 w-20 bg-surface-tertiary" /></td>
    </tr>
  );
}
