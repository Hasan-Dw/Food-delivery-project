import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Review } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { StarDisplay } from './Stars';

interface ReviewCardProps {
  review: Review;
  /** Dish name for menu-item reviews. */
  typeLabel?: string;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  className?: string;
}

const typeLabels: Record<Review['type'], string> = {
  restaurant: 'Restaurant',
  menu_item: 'Dish',
  delivery: 'Delivery',
};

export function ReviewCard({
  review,
  typeLabel,
  canManage = false,
  onEdit,
  onDelete,
  isDeleting = false,
  className,
}: ReviewCardProps) {
  const [confirming, setConfirming] = useState(false);
  const isDelivery = review.type === 'delivery';
  const label = typeLabel ?? (review.menuItemName || typeLabels[review.type]);

  return (
    <article
      className={cn(
        'rounded-2xl border border-olive-900/10 bg-cream p-4 shadow-[0_1px_0_rgba(73,56,46,0.03)] sm:p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <Avatar name={review.customer.name} imageKey={review.customer.avatarKey} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-[0.8125rem] font-semibold text-olive-900">
              {review.customer.name}
            </p>
            <Badge tone="cream" size="sm">
              {label}
            </Badge>
            {review.status === 'hidden' ? (
              <Badge tone="terracotta" size="sm">
                Hidden by admin
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-olive-500">
            <StarDisplay value={isDelivery ? review.rating : review.rating} size="xs" />
            {review.createdAt ? <span>{formatDate(review.createdAt)}</span> : null}
            {review.orderCode ? <span aria-hidden="true">·</span> : null}
            {review.orderCode ? <span>Order {review.orderCode}</span> : null}
          </div>
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                disabled={isDeleting}
                aria-label="Edit review"
                className="rounded-full p-1.5 text-olive-500 transition hover:bg-olive-900/5 hover:text-olive-900 disabled:opacity-40"
              >
                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={isDeleting || confirming}
                aria-label="Delete review"
                className="rounded-full p-1.5 text-olive-500 transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {isDelivery ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[0.6875rem] text-olive-600">
          <span className="rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-inset ring-olive-900/10">
            Delivery {review.deliveryRating ?? '—'}/5
          </span>
          <span className="rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-inset ring-olive-900/10">
            Service {review.serviceRating ?? '—'}/5
          </span>
        </div>
      ) : null}

      {review.comment ? (
        <p className="mt-3 whitespace-pre-line text-[0.8125rem] leading-relaxed text-olive-600">
          {review.comment}
        </p>
      ) : (
        <p className="mt-3 text-[0.75rem] italic text-olive-400">No comment left.</p>
      )}

      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2">
          <p className="text-[0.75rem] text-olive-700">Delete this review?</p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full px-2.5 py-1 text-[0.6875rem] font-medium text-olive-600 hover:bg-olive-900/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete?.();
              }}
              className="rounded-full bg-danger px-2.5 py-1 text-[0.6875rem] font-semibold text-cream hover:bg-danger/90 disabled:opacity-50"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
