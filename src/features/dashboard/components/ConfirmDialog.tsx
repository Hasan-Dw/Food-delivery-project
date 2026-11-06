import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/**
 * Accessible confirmation dialog for sensitive dashboard actions. It is
 * deliberately portal-based so dashboard panels never clip it.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) onCancel();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, isLoading, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-olive-900/50 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={() => {
          if (!isLoading) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-description' : undefined}
        className="relative w-full max-w-md animate-fade-up rounded-2xl border border-olive-900/10 bg-cream p-5 shadow-lift sm:p-6"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute right-3 top-3 rounded-full p-1.5 text-olive-500 transition hover:bg-olive-900/6 hover:text-olive-900 disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-olive-700/10 text-olive-700',
          )}
        >
          <AlertTriangle aria-hidden="true" className="h-5 w-5" />
        </span>

        <h2 id="confirm-dialog-title" className="mt-4 text-[1.3rem] leading-tight text-olive-900">
          {title}
        </h2>
        {description ? (
          <p id="confirm-dialog-description" className="mt-2 text-[0.8125rem] leading-relaxed text-olive-500">
            {description}
          </p>
        ) : null}

        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
