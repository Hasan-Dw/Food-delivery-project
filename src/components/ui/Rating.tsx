import { Star } from 'lucide-react';
import { formatCount, formatRating } from '@/lib/format';
import { cn } from '@/lib/cn';

interface RatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
  tone?: 'default' | 'light';
  showReviews?: boolean;
}

export function Rating({ rating, reviewCount, className, tone = 'default', showReviews = true }: RatingProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[0.8125rem] font-medium', className)}>
      <Star
        aria-hidden="true"
        className={cn(
          'h-3.5 w-3.5 fill-gold-300 text-gold-500',
          tone === 'light' && 'fill-gold-200 text-gold-200',
        )}
      />
      <span className={tone === 'light' ? 'text-cream' : 'text-olive-800'}>{formatRating(rating)}</span>
      {showReviews && reviewCount !== undefined ? (
        <span className={cn('font-normal', tone === 'light' ? 'text-cream/60' : 'text-olive-500')}>
          ({formatCount(reviewCount)})
        </span>
      ) : null}
    </span>
  );
}
