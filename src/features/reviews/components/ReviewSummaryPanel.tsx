import type { ReviewSummary } from '@/types';
import { formatRating } from '@/lib/format';
import { cn } from '@/lib/cn';
import { StarDisplay } from './Stars';

interface ReviewSummaryPanelProps {
  summary?: ReviewSummary;
  loading?: boolean;
  className?: string;
  compact?: boolean;
  title?: string;
}

const scores = [5, 4, 3, 2, 1] as const;

/** Aggregate average plus the 1–5 distribution behind it. */
export function ReviewSummaryPanel({
  summary,
  loading = false,
  className,
  compact = false,
  title = 'Ratings from delivered orders',
}: ReviewSummaryPanelProps) {
  const total = summary?.total ?? 0;
  const average = summary?.average ?? 0;

  return (
    <div className={cn('rounded-card border border-olive-900/10 bg-cream p-5', className)}>
      <p className="eyebrow text-olive-500">{title}</p>

      {loading ? (
        <div className="mt-4 animate-pulse space-y-3" aria-hidden="true">
          <div className="h-9 w-24 rounded bg-olive-900/10" />
          <div className="h-3 w-40 rounded bg-olive-900/10" />
          <div className="h-3 w-full rounded bg-olive-900/10" />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="font-display text-4xl leading-none text-olive-900">
              {total ? formatRating(average) : '—'}
            </p>
            <div className="pb-0.5">
              <StarDisplay value={average} size="sm" />
              <p className="mt-1 text-[0.6875rem] text-olive-500">
                {total ? `${total} verified ${total === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
              </p>
            </div>
          </div>

          {!compact ? (
            <ul className="mt-5 space-y-2">
              {scores.map((score) => {
                const count = summary?.distribution?.[score] ?? 0;
                const percent = total ? Math.round((count / total) * 100) : 0;
                return (
                  <li key={score} className="flex items-center gap-3 text-[0.6875rem]">
                    <span className="w-6 shrink-0 tabular-nums text-olive-600">{score}★</span>
                    <span
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-olive-900/10"
                      role="img"
                      aria-label={`${score} star: ${count} ${count === 1 ? 'review' : 'reviews'}`}
                    >
                      <span
                        className="block h-full rounded-full bg-gold-400"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right tabular-nums text-olive-500">{count}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <p className="mt-4 text-[0.75rem] leading-relaxed text-olive-500">
            Every rating comes from a delivered Savora order. Reviews are weighted equally.
          </p>
        </>
      )}
    </div>
  );
}
