import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FootbidLogoProps extends HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

export function FootbidLogo({ compact = false, className, ...props }: FootbidLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)} {...props}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/40 bg-accent/10 shadow-[0_0_28px_rgba(183,243,74,0.14)]">
        <svg aria-hidden="true" className="size-6 text-accent" viewBox="0 0 32 32" fill="none">
          <rect
            x="3.5"
            y="5.5"
            width="25"
            height="21"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M16 6v20M4 16h24" stroke="currentColor" strokeWidth="1.5" strokeOpacity=".55" />
          <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M4 11h4v10H4M28 11h-4v10h4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>

      {!compact && (
        <span className="text-xl font-black tracking-[-0.04em] text-foreground">
          FOOT<span className="text-accent">BID</span>
        </span>
      )}
    </div>
  );
}
