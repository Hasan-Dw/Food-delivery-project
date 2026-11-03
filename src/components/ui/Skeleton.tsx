import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex text-olive-500', className)}>
      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-xl', className)} />;
}

export function PageLoader({ label = 'Setting the table…' }: { label?: string }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-olive-700">
        <span className="absolute inset-0 animate-soft-pulse rounded-full bg-olive-700/30" />
        <Loader2 aria-hidden="true" className="relative h-5 w-5 animate-spin text-cream" />
      </span>
      <p className="text-sm text-olive-500">{label}</p>
    </div>
  );
}
