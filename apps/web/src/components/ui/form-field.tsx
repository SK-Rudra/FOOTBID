import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  children,
  hint,
  error,
  required = false,
  className,
}: FormFieldProps) {
  const messageId = `${htmlFor}-message`;

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center justify-between gap-3 text-sm font-bold text-foreground"
      >
        <span>{label}</span>

        {!required && <span className="text-xs font-medium text-muted">Optional</span>}
      </label>

      {children}

      {(error || hint) && (
        <p id={messageId} className={cn('text-xs leading-5', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
