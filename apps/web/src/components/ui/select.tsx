import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, hasError = false, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl border bg-[#080d14] px-4 text-sm text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
        hasError
          ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
          : 'border-line-strong',
        className,
      )}
      aria-invalid={hasError || undefined}
      {...props}
    >
      {children}
    </select>
  );
});
