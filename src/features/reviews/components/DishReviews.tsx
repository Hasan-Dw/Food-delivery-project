import { useQuery } from '@tanstack/react-query';
import type { Review } from '@/types';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import { formatRating } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { StarDisplay } from './Stars';

interface DishReviewsProps {
  menuItemId: string;
  fallbackRating?: number;
  fallbackCount?: number;
}

/** Compact dish rating block for the dish detail dialog. */
export function DishReviews({ menuItemId, fallbackRating = 0, fallbackCount = 0 }: DishReviewsProps) {
  const summary = useQuery({
    queryKey: queryKeys.menuItemReviewSummary(menuItemId),
    queryFn: () => services.reviews.getMenuItemSummary(menuItemId),
    enabled: Boolean(menuItemId),
    staleTime: 60_000,
  });

  const latest = useQuery({
    queryKey: queryKeys.menuItemReviews(menuItemId, 1),
    queryFn: () => services.reviews.listForMenuItem(menuItemId, { page: 1, perPage: 2 }),
    enabled: Boolean(menuItemId),
  });

  const average = summary.data?.total ? summary.data.average : fallbackRating;
  const count = summary.data?.total ?? fallbackCount;
  const reviews: Review[] = latest.data?.items ?? [];

  return (
    <section className="rounded-xl border border-olive-900/10 bg-white/60 p-3.5" aria-label="Dish ratings">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StarDisplay value={average} size="sm" />
          <p className="text-sm font-semibold tabular-nums text-olive-900">
            {count ? formatRating(average) : 'New'}
          </p>
          <p className="text-[0.6875rem] text-olive-500">
            {count ? `${count} ${count === 1 ? 'rating' : 'ratings'}` : 'No dish ratings yet'}
          </p>
        </div>
        {summary.isFetching ? (
          <span className="text-[0.625rem] uppercase tracking-wide text-olive-400" role="status">
            Updating…
          </span>
        ) : null}
      </div>

      {reviews.length ? (
        <ul className="mt-3 space-y-2.5 border-t border-olive-900/10 pt-3">
          {reviews.map((review) => (
            <li key={review.id} className="flex gap-2.5">
              <Avatar name={review.customer.name} imageKey={review.customer.avatarKey} size="xs" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 text-[0.6875rem] font-semibold text-olive-800">
                  {review.customer.name}
                  <StarDisplay value={review.rating} size="xs" />
                </p>
                {review.comment ? (
                  <p className="mt-0.5 line-clamp-3 text-[0.75rem] leading-relaxed text-olive-600">
                    {review.comment}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
