import type { ReactNode } from 'react';
import { Bike, Car, CheckCircle2, Clock3, MapPin, Star, Truck, Wallet } from 'lucide-react';
import { PageLoader } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanel';
import { ButtonLink } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { DriverAvailabilityControl } from '../components/DriverAvailabilityControl';
import { useDriverProfile } from '../hooks/useDriverDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { formatCurrency, formatMemberSince, formatRating } from '@/lib/format';
import { ROUTES } from '@/config/routes';

const vehicleIcons = {
  bike: Bike,
  scooter: Truck,
  car: Car,
} as const;

const rules = [
  {
    title: 'Online means available',
    description:
      'Savora operations can assign a delivery only while your availability is AVAILABLE and your account is approved.',
  },
  {
    title: 'One delivery at a time',
    description:
      'While a delivery is active, availability is locked to ON_DELIVERY. Finish the drop-off before changing status.',
  },
  {
    title: 'Platform-managed assignment',
    description:
      'Drivers never assign themselves. Reassignment and unassignment are handled by platform operations.',
  },
];

export default function DriverAvailabilityPage() {
  useDocumentTitle('Availability');
  const profile = useDriverProfile();

  if (profile.isLoading) return <PageLoader label="Loading your availability…" />;

  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        title="Driver profile unavailable"
        description={getErrorMessage(profile.error, 'We could not find a driver profile for this account.')}
        action={
          <ButtonLink to={ROUTES.home} variant="outline" size="sm">
            Back to the marketplace
          </ButtonLink>
        }
      />
    );
  }

  const driver = profile.data;
  const VehicleIcon = vehicleIcons[driver.vehicle];
  const hasActiveDelivery = Boolean(driver.activeDeliveryId);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Driver settings"
        title="Availability"
        description="Control whether Savora operations may assign you a delivery. Status changes are validated by the driver service."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
        <DashboardPanel eyebrow="Current status" title="Online or offline">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  driver.availability === 'AVAILABLE'
                    ? 'bg-success/10 text-success'
                    : driver.availability === 'ON_DELIVERY'
                      ? 'bg-terracotta-50 text-terracotta-600'
                      : 'bg-olive-900/6 text-olive-500'
                }`}
              >
                <VehicleIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={driver.availability} />
                  {hasActiveDelivery ? <StatusBadge status={driver.accountStatus} /> : null}
                </div>
                <p className="mt-1 text-[0.75rem] text-olive-500">
                  {driver.availability === 'AVAILABLE'
                    ? 'You can receive a new assignment from Savora operations.'
                    : driver.availability === 'ON_DELIVERY'
                      ? 'Finish the active delivery before changing availability.'
                      : 'No new deliveries will be assigned while you are offline.'}
                </p>
              </div>
            </div>

            <DriverAvailabilityControl driver={driver} />

            {hasActiveDelivery ? (
              <div className="rounded-xl border border-gold-300/50 bg-gold-50/70 px-3.5 py-3 text-[0.75rem] leading-relaxed text-olive-600">
                <p className="flex items-start gap-2">
                  <Clock3 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
                  <span>
                    You are currently on a delivery. Open the active delivery to continue the route; availability
                    unlocks after the drop-off.
                  </span>
                </p>
                <ButtonLink to={ROUTES.driverActiveDelivery} variant="ghost" size="sm" className="mt-2">
                  Open active delivery
                </ButtonLink>
              </div>
            ) : null}
          </div>
        </DashboardPanel>

        <DashboardPanel eyebrow="Driver profile" title="Your details">
          <div className="flex items-center gap-3">
            <Avatar name={driver.name} imageKey={driver.avatarKey} size="lg" />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-semibold text-olive-900">{driver.name}</p>
              <p className="mt-0.5 text-[0.75rem] text-olive-500">{driver.phone}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] text-olive-500">
                <MapPin aria-hidden="true" className="h-3 w-3" />
                {driver.serviceArea ?? 'Service area not set'}
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-2.5 border-t border-olive-900/10 pt-4 text-[0.75rem]">
            <Row label="Status" value={<StatusBadge status={driver.accountStatus} />} />
            <Row label="Vehicle" value={<span className="capitalize">{driver.vehicle}</span>} />
            <Row
              label="Rating"
              value={
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden="true" className="h-3 w-3 text-gold-600" />
                  {formatRating(driver.rating)}
                </span>
              }
            />
            <Row
              label="Completed"
              value={
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-success" />
                  {driver.completedDeliveries}
                </span>
              }
            />
            <Row
              label="Sample earnings"
              value={
                <span className="inline-flex items-center gap-1">
                  <Wallet aria-hidden="true" className="h-3 w-3 text-olive-500" />
                  {formatCurrency(driver.totalEarnings)}
                </span>
              }
            />
            <Row label="Joined Savora" value={formatMemberSince(driver.createdAt)} />
          </dl>
        </DashboardPanel>
      </div>

      <DashboardPanel eyebrow="Rules" title="How availability works">
        <ul className="grid gap-4 sm:grid-cols-3">
          {rules.map((rule) => (
            <li key={rule.title} className="rounded-xl border border-olive-900/10 bg-ivory-50/60 p-4">
              <p className="text-[0.8125rem] font-semibold text-olive-900">{rule.title}</p>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-olive-500">{rule.description}</p>
            </li>
          ))}
        </ul>
      </DashboardPanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-olive-500">{label}</dt>
      <dd className="text-right font-medium text-olive-800">{value}</dd>
    </div>
  );
}
