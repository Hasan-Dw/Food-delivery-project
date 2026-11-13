import { Link } from 'react-router-dom';
import { Bike, Clock3, MapPin } from 'lucide-react';
import type { Restaurant } from '@/types';
import { Image } from '@/components/ui/Image';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { ROUTES } from '@/config/routes';
import { formatCurrency, formatDeliveryWindow } from '@/lib/format';
import { cn } from '@/lib/cn';

interface RestaurantCardProps {
  restaurant: Restaurant;
  priority?: boolean;
  className?: string;
}

export function RestaurantCard({ restaurant, priority = false, className }: RestaurantCardProps) {
  const primaryBadge = restaurant.badges[0];

  return (
    <article className={cn('group', className)}>
      <Link
        to={ROUTES.restaurantDetails(restaurant.slug)}
        className="block rounded-card focus-visible:outline-offset-4"
        aria-label={`${restaurant.name}, ${restaurant.cuisines.join(', ')}, rated ${restaurant.rating}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-ivory-200">
          <Image
            imageKey={restaurant.imageKey}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            priority={priority}
            className="h-full w-full"
            imageClassName="transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-olive-900/25 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {primaryBadge ? (
              <Badge tone={primaryBadge === 'Offer' ? 'gold' : 'cream'}>
                {primaryBadge === 'Top rated' ? 'Top rated' : primaryBadge}
              </Badge>
            ) : null}
            {!restaurant.isOpen ? <Badge tone="olive">Closed</Badge> : null}
          </div>

          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-cream/95 px-2.5 py-1 text-[0.6875rem] font-medium text-olive-700 backdrop-blur">
            <Clock3 aria-hidden="true" className="h-3 w-3 text-terracotta" />
            {formatDeliveryWindow(restaurant.estimatedDeliveryMinutes)}
          </span>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[1.4rem] leading-tight text-olive-900 transition-colors duration-300 group-hover:text-terracotta-600">
              {restaurant.name}
            </h3>
            <p className="mt-1 truncate text-[0.6875rem] uppercase tracking-[0.13em] text-olive-500">
              {restaurant.cuisines.join(' · ')}
            </p>
          </div>
          <Rating
            rating={restaurant.rating}
            reviewCount={restaurant.reviewCount}
            className="mt-1 shrink-0"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-olive-500">
          <span className="inline-flex items-center gap-1.5">
            <Bike aria-hidden="true" className="h-3.5 w-3.5 text-olive-300" />
            <span className={restaurant.deliveryFee === 0 ? 'font-medium text-olive-700' : undefined}>
              {restaurant.deliveryFee === 0 ? 'Free delivery' : `${formatCurrency(restaurant.deliveryFee)} delivery`}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-olive-300" />
            {restaurant.distanceKm.toFixed(1)} km
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-gold-400" aria-hidden="true" />
            {restaurant.priceLevel === 1 ? 'Budget' : restaurant.priceLevel === 2 ? 'Everyday' : 'Special occasion'}
          </span>
        </div>
      </Link>

      {restaurant.offerLabel ? (
        <Link
          to={ROUTES.restaurantDetails(restaurant.slug)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-terracotta-50 px-2.5 py-1.5 text-[0.6875rem] font-medium text-terracotta-700 ring-1 ring-inset ring-terracotta-100 transition hover:bg-terracotta-100"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden="true" />
          {restaurant.offerLabel}
        </Link>
      ) : null}
    </article>
  );
}
