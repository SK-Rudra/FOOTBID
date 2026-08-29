import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, hasError = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl border bg-black/20 px-4 text-sm text-foreground outline-none transition placeholder:text-muted/65 focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
        hasError
          ? 'border-danger/60 focus:border-danger focus:ring-danger/10'
          : 'border-line-strong',
        className,
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
});
