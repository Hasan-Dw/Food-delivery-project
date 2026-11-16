import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Star, Utensils, Truck, X } from 'lucide-react';
import type { Order, OrderItem, Review } from '@/types';
import { Button } from '@/components/ui/Button';
import { Image } from '@/components/ui/Image';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import { getErrorMessage } from '@/services/api/errors';
import { useToast } from '@/stores/toast-store';
import { ReviewCard } from './ReviewCard';
import { ReviewDialog } from './ReviewDialog';
import { StarDisplay } from './Stars';

type Target =
  | { kind: 'restaurant' }
  | { kind: 'menu_item'; item: OrderItem };

interface OrderReviewDialogProps {
  order: Order;
  open: boolean;
  /** Jump straight to one dimension (used by the tracking page). */
  initialTarget?: 'delivery';
  onClose: () => void;
}

const uniqueItems = (order: Order): OrderItem[] => {
  const seen = new Set<string>();
  return order.items.filter((item) => {
    if (seen.has(item.productId)) return false;
    seen.add(item.productId);
    return true;
  });
};

/**
 * One place to rate a delivered order: the restaurant, every purchased dish
 * and the delivery/service experience. Each dimension is an independent
 * review with its own duplicate protection and edit/delete controls.
 */
export function OrderReviewDialog({ order, open, initialTarget, onClose }: OrderReviewDialogProps) {
  const queryClient = useQueryClient();
  const notify = useToast();
  const [target, setTarget] = useState<Target | 'delivery' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const myReviews = useQuery({
    queryKey: queryKeys.myReviews({ orderId: order.id, scope: 'order' }),
    queryFn: () => services.reviews.listMine({ orderId: order.id, page: 1, perPage: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setTarget(null);
      return;
    }
    if (initialTarget === 'delivery' && order.status === 'COMPLETED') setTarget('delivery');
  }, [open, initialTarget, order.status]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !target) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, target, onClose]);

  const reviews = useMemo<Review[]>(() => myReviews.data?.items ?? [], [myReviews.data]);
  const items = useMemo(() => uniqueItems(order), [order]);

  const restaurantReview = reviews.find((review) => review.type === 'restaurant');
  const deliveryReview = reviews.find((review) => review.type === 'delivery');
  const dishReviews = useMemo(() => {
    const map = new Map<string, Review>();
    for (const review of reviews) {
      if (review.type === 'menu_item' && review.menuItemId) map.set(review.menuItemId, review);
    }
    return map;
  }, [reviews]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.myReviews() });
    void queryClient.invalidateQueries({ queryKey: ['reviews', 'restaurant', order.restaurantId] });
    for (const item of items) {
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'menu-item', item.productId] });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.deliveryReview(order.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.restaurant(order.restaurantId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
  };

  const create = useMutation({
    mutationFn: (input: Parameters<typeof services.reviews.create>[0]) => services.reviews.create(input),
    onSuccess: () => {
      setTarget(null);
      notify({ tone: 'success', title: 'Review submitted', description: 'Thanks — your rating is now live.' });
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ reviewId, input }: { reviewId: string; input: Parameters<typeof services.reviews.update>[1] }) =>
      services.reviews.update(reviewId, input),
    onSuccess: () => {
      setTarget(null);
      notify({ tone: 'success', title: 'Review updated' });
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (reviewId: string) => services.reviews.remove(reviewId),
    onSuccess: () => {
      notify({ tone: 'info', title: 'Review deleted' });
      invalidate();
    },
    onSettled: () => setDeletingId(null),
  });

  if (!open || typeof document === 'undefined') return null;

  const editingReview =
    target === 'delivery'
      ? deliveryReview
      : target?.kind === 'restaurant'
        ? restaurantReview
        : target?.kind === 'menu_item'
          ? dishReviews.get(target.item.productId)
          : undefined;

  const dialogType = target === 'delivery' ? 'delivery' : target?.kind === 'menu_item' ? 'menu_item' : 'restaurant';
  const dialogTitle =
    target === 'delivery'
      ? 'Rate the delivery'
      : target?.kind === 'menu_item'
        ? target.item.name
        : order.restaurantName;

  const submitting = create.isPending || update.isPending;
  const submitError = create.isError
    ? getErrorMessage(create.error, 'This review could not be submitted.')
    : update.isError
      ? getErrorMessage(update.error, 'Your review could not be saved.')
      : null;

  const close = () => {
    resetMutations();
    onClose();
  };

  const resetMutations = () => {
    create.reset();
    update.reset();
    remove.reset();
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-olive-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button type="button" aria-label="Close rating dialog" className="absolute inset-0 cursor-default" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-review-title"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-olive-900/10 bg-ivory p-5 shadow-lift sm:max-h-[88dvh] sm:rounded-2xl sm:p-6"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close rating dialog"
          className="absolute right-3 top-3 rounded-full p-1.5 text-olive-500 transition hover:bg-olive-900/5 hover:text-olive-900"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <p className="eyebrow text-terracotta-700">Order {order.code}</p>
        <h2 id="order-review-title" className="mt-2 pr-8 font-display text-2xl leading-tight text-olive-900">
          Rate your order
        </h2>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-olive-600">
          Restaurant, dish and delivery ratings are separate. Rate only what you want to; each one appears publicly
          with your first name.
        </p>

        {myReviews.isError ? (
          <p role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5 text-[0.8125rem] text-danger">
            {getErrorMessage(myReviews.error, 'Your reviews could not be loaded. You can still submit a new one.')}
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          <Section
            icon={<Utensils aria-hidden="true" className="h-4 w-4" />}
            title="The restaurant"
            subtitle={order.restaurantName}
            imageKey={order.restaurantImageKey}
            review={restaurantReview}
            onRate={() => setTarget({ kind: 'restaurant' })}
            onEdit={() => setTarget({ kind: 'restaurant' })}
            onDelete={restaurantReview ? () => {
              setDeletingId(restaurantReview.id);
              remove.mutate(restaurantReview.id);
            } : undefined}
            isDeleting={Boolean(restaurantReview && deletingId === restaurantReview.id)}
          />

          {items.map((item) => {
            const review = dishReviews.get(item.productId);
            return (
              <Section
                key={item.productId}
                icon={<Star aria-hidden="true" className="h-4 w-4" />}
                title={item.name}
                subtitle={item.quantity > 1 ? `${item.quantity} × ordered` : 'Dish rating'}
                imageKey={item.imageKey}
                review={review}
                onRate={() => setTarget({ kind: 'menu_item', item })}
                onEdit={() => setTarget({ kind: 'menu_item', item })}
                onDelete={review ? () => {
                  setDeletingId(review.id);
                  remove.mutate(review.id);
                } : undefined}
                isDeleting={Boolean(review && deletingId === review.id)}
              />
            );
          })}

          <Section
            icon={<Truck aria-hidden="true" className="h-4 w-4" />}
            title="Delivery & service"
            subtitle="Delivery timing and service quality"
            review={deliveryReview}
            onRate={() => setTarget('delivery')}
            onEdit={() => setTarget('delivery')}
            onDelete={deliveryReview ? () => {
              setDeletingId(deliveryReview.id);
              remove.mutate(deliveryReview.id);
            } : undefined}
            isDeleting={Boolean(deliveryReview && deletingId === deliveryReview.id)}
          />
        </div>

        {myReviews.isLoading ? (
          <p className="mt-4 text-center text-[0.6875rem] text-olive-500" role="status">
            Checking your existing reviews…
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end border-t border-olive-900/10 pt-4">
          <Button variant="ghost" size="sm" onClick={close}>
            Done
          </Button>
        </div>
      </div>

      <ReviewDialog
        open={Boolean(target)}
        title={dialogTitle}
        description={
          target === 'delivery'
            ? 'Delivery and service are rated separately, then combined into the delivery score.'
            : `Your review of ${dialogTitle} from order ${order.code}.`
        }
        type={dialogType}
        initial={editingReview ?? null}
        isSubmitting={submitting}
        error={submitError}
        onClose={() => {
          resetMutations();
          setTarget(null);
        }}
        onSubmit={(input) => {
          if (editingReview) {
            update.mutate({
              reviewId: editingReview.id,
              input: {
                rating: target === 'delivery' ? undefined : input.rating,
                deliveryRating: target === 'delivery' ? input.deliveryRating : undefined,
                serviceRating: target === 'delivery' ? input.serviceRating : undefined,
                comment: input.comment,
              },
            });
            return;
          }

          create.mutate({
            orderId: order.id,
            type: dialogType,
            ...(dialogType === 'delivery'
              ? { deliveryRating: input.deliveryRating, serviceRating: input.serviceRating }
              : { rating: input.rating }),
            ...(target && target !== 'delivery' && target.kind === 'menu_item'
              ? { menuItemId: target.item.productId }
              : {}),
            comment: input.comment,
          });
        }}
      />
    </div>,
    document.body,
  );
}

interface SectionProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  imageKey?: string;
  review?: Review;
  onRate: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

function Section({ icon, title, subtitle, imageKey, review, onRate, onEdit, onDelete, isDeleting }: SectionProps) {
  if (review) {
    return (
      <ReviewCard
        review={review}
        typeLabel={title}
        canManage
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={isDeleting}
        className="bg-white/70"
      />
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-olive-900/10 bg-cream p-3">
      {imageKey ? (
        <Image imageKey={imageKey} alt="" sizes="44px" className="h-11 w-11 shrink-0 rounded-lg" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-olive-700/10 text-olive-700">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-semibold text-olive-900">{title}</p>
        <p className="mt-0.5 truncate text-[0.6875rem] text-olive-500">{subtitle}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-olive-400">
          <StarDisplay value={0} size="xs" />
          <span>Not rated yet</span>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRate} className="shrink-0" iconLeft={<CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}>
        Rate
      </Button>
    </div>
  );
}
