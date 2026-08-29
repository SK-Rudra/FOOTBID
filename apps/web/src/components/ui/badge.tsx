import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-white/5 text-muted',
  accent: 'border-accent/25 bg-accent/10 text-accent',
  info: 'border-info/25 bg-info/10 text-info',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  danger: 'border-danger/25 bg-danger/10 text-danger',
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full border px-2.5 text-[0.6875rem] font-extrabold uppercase tracking-[0.12em]',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}
