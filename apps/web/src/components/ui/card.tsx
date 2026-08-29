import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardTone = 'default' | 'glass' | 'accent';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
}

const cardTones: Record<CardTone, string> = {
  default: 'border-line bg-surface shadow-[0_22px_70px_rgba(0,0,0,0.24)]',
  glass: 'border-white/10 bg-surface/75 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl',
  accent:
    'border-accent/25 bg-[linear-gradient(145deg,rgba(183,243,74,0.10),rgba(11,17,27,0.94)_42%)] shadow-[0_22px_70px_rgba(0,0,0,0.3)]',
};

export function Card({ tone = 'default', className, ...props }: CardProps) {
  return <div className={cn('rounded-2xl border', cardTones[tone], className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-extrabold tracking-[-0.025em] text-foreground', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-6 text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5 sm:px-6 sm:pb-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center border-t border-line px-5 py-4 sm:px-6', className)}
      {...props}
    />
  );
}
