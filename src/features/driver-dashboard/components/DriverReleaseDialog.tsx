import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface DriverReleaseDialogProps {
  open: boolean;
  deliveryStatus: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

const MIN_REASON = 5;

/**
 * Driver-facing release confirmation. Releasing is not a cancellation: the
 * customer's order stays active and dispatch is asked for a replacement.
 */
export function DriverReleaseDialog({
  open,
  deliveryStatus,
  isLoading,
  onCancel,
  onConfirm,
}: DriverReleaseDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setTouched(false);
    textareaRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON;
  const showError = touched && !valid;
  const afterPickup = deliveryStatus === 'PICKED_UP' || deliveryStatus === 'ON_THE_WAY';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
        onClick={() => !isLoading && onCancel()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-release-title"
        className="relative w-full max-w-md animate-fade-up rounded-2xl border border-olive-900/10 bg-cream p-5 shadow-lift sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="driver-release-title" className="font-display text-[1.35rem] text-olive-900">
                Release this delivery?
              </h2>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-olive-500">
                The customer’s order stays open. Dispatch will look for another driver and you will
                stop receiving updates for this run.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isLoading && onCancel()}
            disabled={isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-olive-500 transition hover:bg-olive-900/5 disabled:opacity-50"
            aria-label="Close release dialog"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {afterPickup ? (
          <p className="mt-4 rounded-xl border border-gold-300/60 bg-gold-50/70 px-3.5 py-3 text-[0.6875rem] leading-relaxed text-olive-700">
            You have already picked up this order. Only release it if you truly cannot complete the
            handover, and contact the customer or dispatch where possible.
          </p>
        ) : null}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[0.75rem] font-medium text-olive-800">
            What went wrong?
          </span>
          <textarea
            ref={textareaRef}
            rows={3}
            value={reason}
            disabled={isLoading}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={240}
            placeholder="For example: bike broke down, address unreachable, food missing."
            aria-invalid={showError}
            className="w-full rounded-xl border border-olive-900/15 bg-ivory/70 px-3.5 py-3 text-sm text-olive-900 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60"
          />
          <span className="mt-1 flex items-center justify-between gap-2 text-[0.6875rem]">
            <span className={showError ? 'text-danger' : 'text-olive-500'}>
              {showError ? `Add at least ${MIN_REASON} characters.` : 'This is shared with dispatch.'}
            </span>
            <span className="tabular-nums text-olive-400">{reason.length}/240</span>
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Keep delivery
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isLoading}
            disabled={!valid}
            onClick={() => {
              setTouched(true);
              if (valid) onConfirm(trimmed);
            }}
          >
            Release delivery
          </Button>
        </div>
      </div>
    </div>
  );
}
