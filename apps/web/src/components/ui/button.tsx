import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-[#071006] shadow-[0_10px_34px_rgba(183,243,74,0.18)] hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-[0_14px_42px_rgba(183,243,74,0.24)]',
  secondary:
    'border border-line-strong bg-white/[0.055] text-foreground hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.09]',
  ghost: 'text-muted hover:bg-white/[0.06] hover:text-foreground',
  danger:
    'border border-danger/30 bg-danger/10 text-danger hover:-translate-y-0.5 hover:bg-danger/20',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3.5 text-xs',
  md: 'h-11 px-5',
  lg: 'h-13 rounded-2xl px-6 text-base',
  icon: 'size-11 p-0',
};

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-extrabold tracking-[0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonVariants({
        variant,
        size,
        className,
      })}
      {...props}
    />
  );
});
