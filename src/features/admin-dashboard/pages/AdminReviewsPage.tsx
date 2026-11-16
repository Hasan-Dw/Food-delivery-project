import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, MessageSquareText, Star } from 'lucide-react';
import type { AdminReviewQuery, Review, ReviewStatus, ReviewType } from '@/types';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { Select } from '@/components/ui/Select';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel, FilterTabs } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { useAdminRestaurants, useAdminReviews, useModerateReview } from '../hooks/useAdminDashboard';
import { useToast } from '@/stores/toast-store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

type StatusFilter = ReviewStatus | 'ALL';
type TypeFilter = ReviewType | 'ALL';
const PAGE_SIZE = 10;

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All reviews' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
];

const typeLabels: Record<ReviewType, string> = {
  restaurant: 'Restaurant',
  menu_item: 'Dish',
  delivery: 'Delivery',
};

export default function AdminReviewsPage() {
  useDocumentTitle('Reviews');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [restaurantId, setRestaurantId] = useState('');
  const [page, setPage] = useState(1);
  const restaurants = useAdminRestaurants();
  const moderate = useModerateReview();
  const notify = useToast();

  const query: AdminReviewQuery = {
    page,
    perPage: PAGE_SIZE,
    status: status === 'ALL' ? undefined : status,
    type: type === 'ALL' ? undefined : type,
    restaurantId: restaurantId || undefined,
  };
  const reviews = useAdminReviews(query);

  const restaurantOptions = useMemo(
    () => [
      { value: '', label: 'All restaurants' },
      ...(restaurants.data ?? []).map((restaurant) => ({
        value: restaurant.id,
        label: restaurant.name,
      })),
    ],
    [restaurants.data],
  );

  const items = reviews.data?.items ?? [];
  const pageHidden = items.filter((review) => review.status === 'hidden').length;
  const pageComments = items.filter((review) => review.comment.trim().length > 0).length;
  const totalPages = Math.max(1, Math.ceil((reviews.data?.total ?? 0) / PAGE_SIZE));

  const resetPage = () => setPage(1);

  const moderateReview = (review: Review) => {
    const action = review.status === 'visible' ? 'hide' : 'restore';
    moderate.mutate(
      { reviewId: review.id, action },
      {
        onSuccess: (updated) => {
          notify({
            tone: 'success',
            title: action === 'hide' ? 'Review hidden' : 'Review restored',
            description:
              action === 'hide'
                ? `The ${typeLabels[updated.type].toLowerCase()} rating by ${updated.customer.name} is no longer public.`
                : `The ${typeLabels[updated.type].toLowerCase()} rating by ${updated.customer.name} is public again.`,
          });
        },
        onError: (error) => {
          notify({ tone: 'error', title: 'Moderation failed', description: getErrorMessage(error) });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Trust & safety"
        title="Reviews"
        description="Moderate public ratings and comments across restaurants, dishes and deliveries. Hiding a review removes it from public averages immediately."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void reviews.refetch()}
            isLoading={reviews.isFetching}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Reviews in this view"
          value={reviews.data ? String(reviews.data.total) : '—'}
          icon={<MessageSquareText aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Hidden on this page"
          value={String(pageHidden)}
          icon={<EyeOff aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="With comments"
          value={String(pageComments)}
          icon={<Star aria-hidden="true" className="h-4 w-4" />}
        />
      </div>

      <DashboardPanel eyebrow="Moderation queue" title="All ratings">
        <div className="space-y-4">
          <FilterTabs
            value={status}
            onChange={(next) => {
              setStatus(next);
              resetPage();
            }}
            options={statusOptions}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Review type"
              value={type}
              onChange={(event) => {
                setType(event.target.value as TypeFilter);
                resetPage();
              }}
              options={[
                { value: 'ALL', label: 'All types' },
                { value: 'restaurant', label: 'Restaurant ratings' },
                { value: 'menu_item', label: 'Dish ratings' },
                { value: 'delivery', label: 'Delivery ratings' },
              ]}
            />
            <Select
              label="Restaurant"
              value={restaurantId}
              onChange={(event) => {
                setRestaurantId(event.target.value);
                resetPage();
              }}
              options={restaurantOptions}
            />
          </div>
        </div>
      </DashboardPanel>

      {reviews.isLoading ? (
        <PageLoader label="Loading the moderation queue…" />
      ) : reviews.isError ? (
        <ErrorState
          title="Reviews could not be loaded"
          description={getErrorMessage(reviews.error)}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void reviews.refetch()}>
              Try again
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="h-6 w-6" />}
          title="Nothing to moderate"
          description="No reviews match these filters yet."
        />
      ) : (
        <div className="space-y-3">
          {items.map((review) => {
            const hidden = review.status === 'hidden';
            const busy = moderate.isPending && moderate.variables?.reviewId === review.id;
            return (
              <article
                key={review.id}
                className={cn(
                  'rounded-2xl border bg-white/75 p-4 shadow-soft sm:p-5',
                  hidden ? 'border-danger/20' : 'border-olive-900/10',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-olive-900/6 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-olive-600">
                        {typeLabels[review.type]}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset',
                          hidden
                            ? 'bg-danger/8 text-danger ring-danger/25'
                            : 'bg-success/10 text-success ring-success/25',
                        )}
                      >
                        {hidden ? 'Hidden' : 'Visible'}
                      </span>
                      <span className="text-[0.6875rem] text-olive-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-[0.875rem] font-medium text-olive-900">
                      {review.customer.name}
                      <span className="font-normal text-olive-500"> on {review.restaurantName}</span>
                      {review.type === 'menu_item' && review.menuItemName ? (
                        <span className="font-normal text-olive-500"> · {review.menuItemName}</span>
                      ) : null}
                    </p>
                    <p className="text-[0.6875rem] text-olive-500">
                      Order {review.orderCode}
                      {review.type === 'delivery' && review.deliveryRating !== null
                        ? ` · Delivery ${review.deliveryRating}/5`
                        : ''}
                      {review.type === 'delivery' && review.serviceRating !== null
                        ? ` · Service ${review.serviceRating}/5`
                        : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full bg-gold-50/80 px-3 py-1.5 text-gold-700">
                    <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                    <span className="text-[0.75rem] font-semibold">{review.rating.toFixed(1)}</span>
                  </div>
                </div>

                {review.comment ? (
                  <p className="mt-3 rounded-xl bg-ivory-50/80 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-olive-700">
                    “{review.comment}”
                  </p>
                ) : (
                  <p className="mt-3 text-[0.75rem] italic text-olive-400">No written comment.</p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-olive-900/8 pt-3">
                  <p className="text-[0.6875rem] text-olive-500">
                    {hidden
                      ? 'Hidden reviews are excluded from public averages.'
                      : 'Visible to customers on restaurant and dish pages.'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant={hidden ? 'outline' : 'danger'}
                    isLoading={busy}
                    disabled={moderate.isPending}
                    onClick={() => moderateReview(review)}
                    iconLeft={
                      hidden ? (
                        <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {hidden ? 'Restore review' : 'Hide review'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {reviews.data && reviews.data.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-olive-900/10 bg-white/70 px-4 py-3">
          <p className="text-[0.75rem] text-olive-500">
            Page {reviews.data.page} of {totalPages} · {reviews.data.total} review
            {reviews.data.total === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reviews.data.page <= 1 || reviews.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              iconLeft={<ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reviews.data.page >= totalPages || reviews.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
