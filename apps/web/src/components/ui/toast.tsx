'use client';

import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'info' | 'warning' | 'danger';

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastMessage extends ToastInput {
  id: number;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => number;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: 'border-success/25 bg-[#0c211a] text-success',
  info: 'border-info/25 bg-[#0a1d24] text-info',
  warning: 'border-warning/25 bg-[#241d0d] text-warning',
  danger: 'border-danger/25 bg-[#251016] text-danger',
};

const toneIcons: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ duration = 4500, tone = 'info', ...toast }: ToastInput): number => {
      const id = ++nextId.current;

      setToasts((current) => [
        ...current,
        {
          ...toast,
          duration,
          tone,
          id,
        },
      ]);

      window.setTimeout(() => {
        dismissToast(id);
      }, duration);

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:bottom-6"
      >
        {toasts.map((toast) => {
          const tone = toast.tone ?? 'info';
          const Icon = toneIcons[tone];

          return (
            <div
              key={toast.id}
              role={tone === 'danger' ? 'alert' : 'status'}
              className={cn(
                'animate-enter pointer-events-auto flex gap-3 rounded-2xl border p-4 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl',
                toneStyles[tone],
              )}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-foreground">{toast.title}</p>

                {toast.description && (
                  <p className="mt-1 text-sm leading-5 text-muted">{toast.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                aria-label="Dismiss notification"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}
