import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus } from 'lucide-react';
import type { Review, UpdateReviewInput } from '@/types';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROUTES } from '@/config/routes';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import { getErrorMessage } from '@/services/api/errors';
import { ReviewCard } from './ReviewCard';
import { ReviewDialog } from './ReviewDialog';
import { ReviewSummaryPanel } from './ReviewSummaryPanel';

interface RestaurantReviewsProps {
  restaurantId: string;
  restaurantName: string;
}

const PAGE_SIZE = 6;

/**
 * Public restaurant reviews. Writing is deliberately only available from a
 * delivered order, so the CTA routes the customer to their order history.
 */
export function RestaurantReviews({ restaurantId, restaurantName }: RestaurantReviewsProps) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [perPage, setPerPage] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: queryKeys.restaurantReviewSummary(restaurantId),
    queryFn: () => services.reviews.getRestaurantSummary(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 60_000,
  });

  const reviews = useQuery({
    queryKey: queryKeys.restaurantReviews(restaurantId, perPage),
    queryFn: () => services.reviews.listForRestaurant(restaurantId, { page: 1, perPage }),
    enabled: Boolean(restaurantId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.restaurantReviewSummary(restaurantId) });
    void queryClient.invalidateQueries({ queryKey: ['reviews', 'restaurant', restaurantId] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.myReviews() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
  };

  const update = useMutation({
    mutationFn: ({ reviewId, input }: { reviewId: string; input: UpdateReviewInput }) =>
      services.reviews.update(reviewId, input),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (reviewId: string) => services.reviews.remove(reviewId),
    onSuccess: invalidate,
    onSettled: () => setDeletingId(null),
  });

  const items = reviews.data?.items ?? [];
  const total = summary.data?.total ?? reviews.data?.total ?? 0;
  const canWrite = isAuthenticated && hasRole(['CUSTOMER']);
  const cta = useMemo(() => {
    if (canWrite) {
      return (
        <ButtonLink
          to={ROUTES.orderHistory}
          variant="outline"
          size="sm"
          iconLeft={<MessageSquarePlus aria-hidden="true" className="h-3.5 w-3.5" />}
        >
          Rate a delivered order
        </ButtonLink>
      );
    }
    return (
      <ButtonLink to={ROUTES.login} variant="outline" size="sm">
        Sign in to review
      </ButtonLink>
    );
  }, [canWrite]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-terracotta-700">The table talk</p>
          <h2 className="mt-3 text-display-sm">What people say about {restaurantName}</h2>
          <p className="mt-2 text-[0.8125rem] text-olive-500">
            {total ? `${total} verified ${total === 1 ? 'review' : 'reviews'}` : 'No reviews yet'} · restaurant,
            dish and delivery ratings are separate.
          </p>
        </div>
        {cta}
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <ReviewSummaryPanel
          summary={summary.data}
          loading={summary.isLoading}
          className="h-fit lg:sticky lg:top-[8.5rem]"
        />

        <div className="min-w-0">
          {reviews.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading reviews">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : reviews.isError ? (
            <ErrorState
              title="Reviews did not load"
              description={getErrorMessage(reviews.error, 'Please try again in a moment.')}
              action={
                <Button variant="outline" size="sm" onClick={() => void reviews.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description={`Be the first to review ${restaurantName}. Reviews open once your order has been delivered.`}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    canManage={Boolean(user && review.customer.id === user.id)}
                    onEdit={() => setEditing(review)}
                    onDelete={() => {
                      setDeletingId(review.id);
                      remove.mutate(review.id);
                    }}
                    isDeleting={deletingId === review.id}
                  />
                ))}
              </div>

              {(reviews.data?.hasMore ?? false) ? (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPerPage((current) => current + PAGE_SIZE)}
                    isLoading={reviews.isFetching}
                  >
                    Show more reviews
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <ReviewDialog
        open={Boolean(editing)}
        title={`Edit your review of ${restaurantName}`}
        type="restaurant"
        initial={editing}
        mode="single"
        isSubmitting={update.isPending}
        error={update.isError ? getErrorMessage(update.error, 'Your review could not be saved.') : null}
        onClose={() => setEditing(null)}
        onSubmit={(input) => {
          if (!editing) return;
          update.mutate({
            reviewId: editing.id,
            input: {
              rating: input.rating,
              comment: input.comment,
            },
          });
        }}
      />
    </div>
  );
}
