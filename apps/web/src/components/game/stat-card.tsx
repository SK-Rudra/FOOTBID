import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'accent' | 'info' | 'neutral';
  className?: string;
}

const toneStyles = {
  accent: 'bg-accent/10 text-accent',
  info: 'bg-info/10 text-info',
  neutral: 'bg-white/[0.055] text-muted',
};

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
  className,
}: StatCardProps) {
  return (
    <Card tone="glass" className={cn('p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
          <p className="mt-3 font-mono text-3xl font-black tracking-[-0.06em] text-foreground">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
        </div>

        <span
          className={cn('grid size-11 shrink-0 place-items-center rounded-xl', toneStyles[tone])}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
    </Card>
  );
}
