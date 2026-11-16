import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Truck } from 'lucide-react';
import type { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import { StarDisplay } from './Stars';
import { OrderReviewDialog } from './OrderReviewDialog';

/**
 * Post-delivery prompt on the tracking page. Delivery and service are rated
 * together but scored separately, exactly like the order-history flow.
 */
export function DeliveryReviewPrompt({ order }: { order: Order }) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const [open, setOpen] = useState(false);

  const eligible =
    isAuthenticated &&
    hasRole(['CUSTOMER']) &&
    user?.id === order.customerId &&
    order.status === 'COMPLETED';

  const review = useQuery({
    queryKey: queryKeys.deliveryReview(order.id),
    queryFn: () => services.reviews.getDeliveryReview(order.id),
    enabled: eligible,
    staleTime: 30_000,
  });

  if (!eligible) return null;

  const existing = review.data;

  return (
    <section className="rounded-2xl border border-olive-900/10 bg-cream px-5 py-4" aria-labelledby="delivery-review-heading">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-terracotta-700 ring-1 ring-inset ring-terracotta-100">
          <Truck aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="delivery-review-heading" className="font-display text-lg text-olive-900">
            {existing ? 'Your delivery rating' : 'How was the delivery?'}
          </h2>

          {review.isLoading ? (
            <p className="mt-1 text-[0.75rem] text-olive-500" role="status">
              Loading your delivery review…
            </p>
          ) : existing ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-olive-600">
                <span className="inline-flex items-center gap-1.5">
                  <StarDisplay value={existing.rating} size="xs" />
                  <span className="font-semibold tabular-nums">{existing.rating.toFixed(1)}</span>
                </span>
                <span>Delivery {existing.deliveryRating}/5</span>
                <span>Service {existing.serviceRating}/5</span>
              </div>
              {existing.comment ? (
                <p className="mt-2 line-clamp-3 text-[0.8125rem] leading-relaxed text-olive-600">
                  “{existing.comment}”
                </p>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setOpen(true)}
                iconLeft={<Star aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                Update rating
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-olive-500">
                Rate the hand-off speed and the Savora service separately. Your driver sees the delivery score, not
                your name.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setOpen(true)}
                iconLeft={<Star aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                Rate delivery &amp; service
              </Button>
            </>
          )}
        </div>
      </div>

      <OrderReviewDialog
        order={order}
        open={open}
        initialTarget="delivery"
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
