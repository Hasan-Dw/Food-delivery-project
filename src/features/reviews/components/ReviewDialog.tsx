import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X } from 'lucide-react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { Review, ReviewType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/cn';
import { StarInput } from './Stars';

interface ReviewSubmitInput {
  rating?: number;
  deliveryRating?: number;
  serviceRating?: number;
  comment: string;
}

interface ReviewDialogProps {
  open: boolean;
  title: string;
  description?: string;
  type: ReviewType;
  /** Existing review when editing; omit when creating. */
  initial?: Review | null;
  isSubmitting?: boolean;
  error?: string | null;
  /**
   * Lets the customer rate several dimensions in the same dialog (used by the
   * delivered-order flow). When false only one rating input is shown.
   */
  mode?: 'single' | 'multi';
  onClose: () => void;
  onSubmit: (input: ReviewSubmitInput) => void;
}

const MAX_COMMENT = 1000;

export function ReviewDialog({
  open,
  title,
  description,
  type,
  initial,
  isSubmitting = false,
  error,
  mode = 'single',
  onClose,
  onSubmit,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setRating(initial?.rating ?? 0);
    setDeliveryRating(initial?.deliveryRating ?? 0);
    setServiceRating(initial?.serviceRating ?? 0);
    setComment(initial?.comment ?? '');
    setFieldErrors({});
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => closeRef.current?.focus(), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, isSubmitting, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const isDelivery = type === 'delivery';
  const showDeliveryAndService = isDelivery || mode === 'multi';
  const showOverall = !isDelivery;

  const submit = () => {
    const errors: Record<string, string> = {};
    if (showOverall && !rating) errors.rating = 'Choose a star rating first.';
    if (isDelivery && !deliveryRating) errors.deliveryRating = 'Rate the delivery experience.';
    if (isDelivery && !serviceRating) errors.serviceRating = 'Rate the service quality.';
    if (comment.length > MAX_COMMENT) errors.comment = `Keep the comment under ${MAX_COMMENT} characters.`;
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    onSubmit({
      ...(showOverall ? { rating } : {}),
      ...(showDeliveryAndService ? { deliveryRating, serviceRating } : {}),
      comment: comment.trim(),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-olive-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close review dialog"
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-olive-900/10 bg-ivory p-5 shadow-lift sm:max-h-[88dvh] sm:rounded-2xl sm:p-6"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close review dialog"
          className="absolute right-3 top-3 rounded-full p-1.5 text-olive-500 transition hover:bg-olive-900/5 hover:text-olive-900 disabled:opacity-40"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <p className="eyebrow text-terracotta-700">{initial ? 'Update your review' : 'Share your experience'}</p>
        <h2 id="review-dialog-title" className="mt-2 pr-8 font-display text-2xl leading-tight text-olive-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-olive-600">{description}</p>
        ) : null}

        <div className="mt-5 space-y-5">
          {isDelivery ? (
            <>
              <StarInput
                label="Delivery experience"
                value={deliveryRating}
                onChange={setDeliveryRating}
                required
                disabled={isSubmitting}
                error={fieldErrors.deliveryRating}
                hint="How did the hand-off and timing feel?"
              />
              <StarInput
                label="Service quality"
                value={serviceRating}
                onChange={setServiceRating}
                required
                disabled={isSubmitting}
                error={fieldErrors.serviceRating}
                hint="Order accuracy, communication and support."
              />
            </>
          ) : (
            <StarInput
              label={type === 'menu_item' ? 'How was the dish?' : 'How was the restaurant?'}
              value={rating}
              onChange={setRating}
              required
              disabled={isSubmitting}
              error={fieldErrors.rating}
            />
          )}

          {mode === 'multi' && !isDelivery ? (
            <>
              <StarInput
                label="Delivery experience"
                value={deliveryRating}
                onChange={setDeliveryRating}
                disabled={isSubmitting}
              />
              <StarInput
                label="Service quality"
                value={serviceRating}
                onChange={setServiceRating}
                disabled={isSubmitting}
              />
            </>
          ) : null}

          <Textarea
            label="Your review"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={isSubmitting}
            maxLength={MAX_COMMENT}
            placeholder="What stood out? Portions, flavour, timing, packaging…"
            error={fieldErrors.comment}
            hint={`${comment.length}/${MAX_COMMENT} characters · optional`}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5 text-[0.8125rem] text-danger"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            isLoading={isSubmitting}
            iconLeft={isSubmitting ? undefined : <Star aria-hidden="true" className="h-3.5 w-3.5" />}
          >
            {initial ? 'Save changes' : 'Submit review'}
          </Button>
        </div>

        <p className={cn('mt-4 text-[0.6875rem] leading-relaxed text-olive-500')}>
          Reviews are public and tied to your delivered order. You can edit or delete your own review at any time.
        </p>
        {isSubmitting ? (
          <span className="sr-only" role="status">
            <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> Submitting review
          </span>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
