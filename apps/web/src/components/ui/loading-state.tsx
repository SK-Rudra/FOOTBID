import { LoaderCircle } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-xl bg-white/[0.07]', className)}
      {...props}
    />
  );
}

interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function LoadingState({ label = 'Loading', className, ...props }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface/60 p-6 text-center',
        className,
      )}
      {...props}
    >
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-accent" />

      <p className="text-sm font-semibold text-muted">{label}</p>
    </div>
  );
}
