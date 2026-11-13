import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { trackingStatusMeta } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { formatEta } from '@/lib/format';
import type { Order, TrackingSnapshot } from '@/types';

interface HeroActiveOrderCardProps {
  order: Order;
  tracking: TrackingSnapshot | null;
}

/**
 * Real active-order card for the hero. It reuses the original dark chip's
 * dimensions, spacing and animation hook (`data-hero-chip`) but only renders
 * when the signed-in customer actually has an order in progress.
 */
export function HeroActiveOrderCard({ order, tracking }: HeroActiveOrderCardProps) {
  const deliveryStatus = tracking?.deliveryStatus ?? 'PENDING_ASSIGNMENT';
  const driverName = tracking?.driver?.name;
  const firstName = driverName?.split(' ')[0];
  const meta = trackingStatusMeta[deliveryStatus];

  const distance = tracking?.remainingDistanceKm ?? tracking?.route.distanceKm ?? null;
  const progress = Math.min(Math.max(tracking?.progress ?? 0, 0), 1);
  const hasDriver = Boolean(tracking?.driver);

  const title = hasDriver
    ? firstName
      ? `${firstName} is ${deliveryStatus === 'PICKED_UP' || deliveryStatus === 'ON_THE_WAY' ? 'on the way' : 'assigned'}`
      : meta.label
    : deliveryStatus === 'PENDING_ASSIGNMENT'
      ? 'Finding your driver'
      : meta.label;

  return (
    <Link
      to={ROUTES.orderTracking(order.id)}
      data-hero-chip
      className="group absolute -left-3 bottom-28 hidden w-[15.5rem] rounded-2xl bg-olive-800 p-4 text-cream shadow-lift transition hover:bg-olive-700 sm:block lg:-left-8"
      aria-label={`Track your order from ${order.restaurantName}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="relative">
          <Avatar
            name={driverName ?? order.restaurantName}
            imageKey={tracking?.driver?.avatarKey ?? null}
            size="sm"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-olive-800 bg-[#7FA86B]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.75rem] font-medium">{title}</p>
          <p className="truncate text-[0.625rem] text-cream/55">
            {order.restaurantName}
            {distance !== null ? ` · ${distance.toFixed(1)} km` : ''}
          </p>
        </div>
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-cream/50 transition group-hover:text-cream" />
      </div>
      <div className="mt-3.5">
        <div className="flex items-center justify-between text-[0.625rem]">
          <span className="text-cream/55">{meta.short}</span>
          <span className="font-semibold text-gold-200">
            {deliveryStatus === 'PENDING_ASSIGNMENT'
              ? 'Pairing…'
              : tracking?.etaMinutes != null
                ? formatEta(tracking.etaMinutes)
                : 'Estimating…'}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream/15">
          <div
            className="h-full rounded-full bg-gold-300 transition-[width] duration-700"
            style={{ width: `${Math.max(progress * 100, 8)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
