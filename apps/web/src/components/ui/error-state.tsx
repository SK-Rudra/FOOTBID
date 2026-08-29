import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex min-h-56 flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger/[0.055] p-7 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-danger/25 bg-danger/10 text-danger">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>

      <h3 className="mt-4 font-extrabold text-foreground">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
