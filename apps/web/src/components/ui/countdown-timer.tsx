'use client';

import { Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetTime: string | number;
  label?: string;
  className?: string;
}

function remainingSeconds(targetTime: string | number): number {
  const target = typeof targetTime === 'number' ? targetTime : new Date(targetTime).getTime();

  if (!Number.isFinite(target)) {
    return 0;
  }

  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function formatRemaining(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}

export function CountdownTimer({
  targetTime,
  label = 'Time remaining',
  className,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      setRemaining(remainingSeconds(targetTime));
    };

    update();

    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [targetTime]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-line-strong bg-black/20 px-3 py-2',
        className,
      )}
    >
      <Clock3 aria-hidden="true" className="size-4 text-accent" />

      <span className="sr-only">{label}:</span>

      <span
        className="min-w-12 font-mono text-sm font-bold tracking-[0.08em] text-foreground tabular-nums"
        aria-live="polite"
      >
        {remaining === null ? '--:--' : formatRemaining(remaining)}
      </span>
    </div>
  );
}
