'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  title: string;
  description: string;
  children: ReactNode;
  trigger?: ReactElement;
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Modal({
  title,
  description,
  children,
  trigger,
  footer,
  open,
  onOpenChange,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}

      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />

        <Dialog.Content
          className={cn(
            'modal-content fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line-strong bg-surface-raised p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65)] focus:outline-none sm:p-7',
            className,
          )}
        >
          <div className="pr-10">
            <Dialog.Title className="text-xl font-black tracking-[-0.03em] text-foreground">
              {title}
            </Dialog.Title>

            <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
              {description}
            </Dialog.Description>
          </div>

          <Dialog.Close
            className="absolute top-5 right-5 grid size-9 place-items-center rounded-lg text-muted transition hover:bg-white/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close dialog"
          >
            <X aria-hidden="true" className="size-4" />
          </Dialog.Close>

          <div className="mt-6">{children}</div>

          {footer && (
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
