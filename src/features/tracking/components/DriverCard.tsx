import { Bike, Car, MessageCircle, Phone, Star } from 'lucide-react';
import type { TrackingSnapshot } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { formatCount, formatRating } from '@/lib/format';
import { site } from '@/config/site';

const vehicleLabels = {
  bike: 'Bicycle',
  scooter: 'Scooter',
  car: 'Car',
} as const;

/** Delivery partner card. Contact details are clearly demo data. */
export function DriverCard({ snapshot }: { snapshot: TrackingSnapshot }) {
  const { driver, deliveryStatus } = snapshot;

  return (
    <section
      aria-labelledby="driver-heading"
      className="overflow-hidden rounded-panel border border-olive-900/10 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-olive-900/8 px-5 py-4">
        <h2 id="driver-heading" className="font-display text-[1.25rem] text-olive-900">
          {deliveryStatus === 'DELIVERED' ? 'Delivered by' : 'Your delivery partner'}
        </h2>
        <Badge tone={snapshot.live ? 'success' : 'gold'}>{snapshot.live ? 'Live' : 'Sample'}</Badge>
      </div>

      <div className="px-5 py-5">
        {driver ? (
          <>
            <div className="flex items-center gap-3.5">
              <Avatar name={driver.name} imageKey={driver.avatarKey} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] font-semibold text-olive-900">{driver.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-olive-500">
                  <span className="inline-flex items-center gap-1">
                    <Star aria-hidden="true" className="h-3 w-3 fill-gold-300 text-gold-500" />
                    {formatRating(driver.rating)}
                  </span>
                  <span>{formatCount(driver.completedDeliveries)} deliveries</span>
                </div>
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.6875rem] text-olive-500">
                  {driver.vehicle === 'car' ? (
                    <Car aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Bike aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {vehicleLabels[driver.vehicle]}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <ButtonLink
                href={`tel:${driver.phone.replace(/[^\d+]/g, '')}`}
                variant="outline"
                size="sm"
                fullWidth
                iconLeft={<Phone aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                Call
              </ButtonLink>
              <ButtonLink
                href={`mailto:${site.email}?subject=${encodeURIComponent('Sample delivery question')}`}
                variant="ghost"
                size="sm"
                fullWidth
                iconLeft={<MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                Message
              </ButtonLink>
            </div>

            <p className="mt-3 text-[0.625rem] leading-relaxed text-olive-500">
              Demo contact details. Calls and messages are not routed to a real driver.
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-olive-900/15 bg-ivory/60 px-4 py-6 text-center">
            <p className="text-[0.875rem] font-medium text-olive-800">Driver assignment pending</p>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-olive-500">
              A delivery partner will appear here once the restaurant hands the order over.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
