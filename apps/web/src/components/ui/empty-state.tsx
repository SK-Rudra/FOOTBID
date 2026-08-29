import { CircleDashed, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = CircleDashed,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/40 p-7 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-line bg-white/[0.04] text-muted">
        <Icon aria-hidden="true" className="size-5" />
      </span>

      <h3 className="mt-4 font-extrabold text-foreground">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
