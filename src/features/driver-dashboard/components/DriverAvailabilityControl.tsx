import { Power, PowerOff } from 'lucide-react';
import type { Driver } from '@/types';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { useDriverAvailability } from '../hooks/useDriverDashboard';
import { useToast } from '@/stores/toast-store';
import { getErrorMessage } from '@/services/api/errors';
import { cn } from '@/lib/cn';

/**
 * Availability control shared by the driver overview and settings page.
 * `ON_DELIVERY` is platform-managed, and a driver cannot go offline while a
 * delivery is still active.
 */
export function DriverAvailabilityControl({
  driver,
  className,
  compact = false,
}: {
  driver: Driver;
  className?: string;
  compact?: boolean;
}) {
  const mutation = useDriverAvailability();
  const notify = useToast();

  const isOnDelivery = driver.availability === 'ON_DELIVERY' || Boolean(driver.activeDeliveryId);
  const goingOnline = driver.availability === 'OFFLINE';
  const nextAvailability = goingOnline ? 'AVAILABLE' : 'OFFLINE';
  const disabled = isOnDelivery || mutation.isPending || driver.accountStatus !== 'APPROVED';

  const handleToggle = () => {
    mutation.mutate(
      { driverId: driver.id, availability: nextAvailability },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title: goingOnline ? 'You are online' : 'You are offline',
            description: goingOnline
              ? 'Savora operations can now assign nearby deliveries to you.'
              : 'New deliveries will not be assigned until you go back online.',
          });
        },
        onError: (error) => {
          notify({ tone: 'error', title: 'Could not change availability', description: getErrorMessage(error) });
        },
      },
    );
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={driver.availability} />
        {driver.activeDeliveryId ? (
          <span className="text-[0.6875rem] text-olive-500">Active delivery in progress</span>
        ) : null}
      </div>

      {!compact ? (
        <p className="text-[0.75rem] leading-relaxed text-olive-500">
          {isOnDelivery
            ? 'Availability is locked while you are on a delivery. Finish the drop-off first, then choose online or offline.'
            : goingOnline
              ? 'Go online when you are ready to accept a platform-assigned delivery.'
              : 'You are offline. No delivery will be assigned until you are back online.'}
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant={goingOnline ? 'secondary' : 'outline'}
        onClick={handleToggle}
        disabled={disabled}
        isLoading={mutation.isPending}
        iconLeft={
          goingOnline ? (
            <Power aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
          )
        }
      >
        {isOnDelivery ? 'On a delivery' : goingOnline ? 'Go online' : 'Go offline'}
      </Button>
    </div>
  );
}
