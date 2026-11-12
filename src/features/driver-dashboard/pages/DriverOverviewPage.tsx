import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  MapPin,
  Navigation,
  Star,
  Timer,
  Truck,
  Wallet,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { ButtonLink } from '@/components/ui/Button';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge, availabilityLabel } from '@/features/dashboard/components/StatusBadge';
import { formatAddress } from '@/features/dashboard/lib/dashboard-utils';
import { DriverAvailabilityControl } from '../components/DriverAvailabilityControl';
import { useDriverActiveContext, useDriverHistory } from '../hooks/useDriverDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { formatCurrency, formatDay, formatEta, formatRating, pluralise } from '@/lib/format';
import { ROUTES } from '@/config/routes';

export default function DriverOverviewPage() {
  useDocumentTitle('Driver overview');
  const { profile, activeDelivery, order, tracking } = useDriverActiveContext();
  const history = useDriverHistory(profile.data?.id);

  if (profile.isLoading) return <PageLoader label="Opening your driver workspace…" />;

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
  const active = activeDelivery.data;
  const activeOrder = order.data;
  const snapshot = tracking.data;
  const completedRows = history.rows.filter((row) => row.delivery.status === 'DELIVERED');
  const todayRows = completedRows.filter((row) => isToday(row.delivery.deliveredAt));
  const recentRows = history.rows.slice(0, 4);

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        eyebrow="Today's route"
        title={`Welcome back, ${driver.name.split(' ')[0]}.`}
        description="Your current assignment, availability and recent delivery performance at a glance."
        actions={
          <ButtonLink to={ROUTES.driverActiveDelivery} size="sm" variant="secondary">
            Open active delivery
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Availability"
          value={availabilityLabel(driver.availability)}
          hint={
            driver.availability === 'ON_DELIVERY'
              ? 'Finish the active delivery to change status.'
              : driver.availability === 'AVAILABLE'
                ? 'Ready for a platform assignment.'
                : 'Go online to receive deliveries.'
          }
          icon={<Truck aria-hidden="true" className="h-4 w-4" />}
          tone={driver.availability === 'AVAILABLE' ? 'success' : 'default'}
        />
        <StatCard
          label="Completed deliveries"
          value={driver.completedDeliveries}
          hint={`${todayRows.length} completed today`}
          icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Customer rating"
          value={formatRating(driver.rating)}
          hint={`${driver.vehicle} · ${pluralise(completedRows.length, 'recent delivery', 'recent deliveries')}`}
          icon={<Star aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Sample earnings"
          value={formatCurrency(driver.totalEarnings)}
          hint="Illustrative payout total, not a real ledger"
          icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)]">
        <DashboardPanel
          eyebrow="Platform assignment"
          title="Active delivery"
          description="At most one delivery is assigned to a driver at a time."
          action={
            active ? (
              <ButtonLink to={ROUTES.driverActiveDelivery} size="sm" variant="ghost">
                Open
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              </ButtonLink>
            ) : null
          }
        >
          {active ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
                    Delivery {active.id}
                  </p>
                  <h3 className="mt-1 font-display text-[1.4rem] leading-tight text-olive-900">
                    {activeOrder?.code ?? 'Assigned order'}
                  </h3>
                  <p className="mt-0.5 text-[0.75rem] text-olive-500">
                    {activeOrder?.restaurantName ?? 'Restaurant pickup'}
                  </p>
                </div>
                <StatusBadge status={active.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-olive-900/10 bg-ivory-50/60 p-3.5">
                  <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
                    <Timer aria-hidden="true" className="h-3 w-3" /> Arrival estimate
                  </p>
                  <p className="mt-1.5 text-[0.9375rem] font-medium text-olive-900">
                    {snapshot ? formatEta(snapshot.etaMinutes) : 'Awaiting route'}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-olive-500">Estimated ETA, not live GPS</p>
                </div>
                <div className="rounded-xl border border-olive-900/10 bg-ivory-50/60 p-3.5">
                  <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
                    <MapPin aria-hidden="true" className="h-3 w-3" /> Drop-off
                  </p>
                  <p className="mt-1.5 line-clamp-3 text-[0.8125rem] leading-relaxed text-olive-700">
                    {activeOrder ? formatAddress(activeOrder.deliveryAddress) : 'Customer address in the app'}
                  </p>
                </div>
              </div>

              <p className="flex items-start gap-2 rounded-xl bg-gold-50/70 px-3.5 py-3 text-[0.6875rem] leading-relaxed text-olive-600">
                <Navigation aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
                Open the active delivery to update pickup, transit and drop-off in the correct order.
              </p>
            </div>
          ) : activeDelivery.isLoading ? (
            <p className="text-[0.8125rem] text-olive-500">Checking for an assignment…</p>
          ) : activeDelivery.isError ? (
            <ErrorState
              title="Could not check your assignment"
              description={getErrorMessage(activeDelivery.error)}
              action={
                <button
                  type="button"
                  onClick={() => void activeDelivery.refetch()}
                  className="rounded-full bg-olive-700 px-4 py-2 text-[0.8125rem] font-medium text-cream"
                >
                  Try again
                </button>
              }
              className="border-0 bg-transparent px-0 py-6"
            />
          ) : (
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title="No active delivery"
              description={
                driver.availability === 'AVAILABLE'
                  ? 'You are online. Savora operations will assign a delivery when one is ready near you.'
                  : 'Go online from the availability panel when you are ready to accept an assignment.'
              }
              action={
                <ButtonLink to={ROUTES.driverAvailability} variant="outline" size="sm">
                  Manage availability
                </ButtonLink>
              }
              className="border-0 bg-transparent px-0 py-6"
            />
          )}
        </DashboardPanel>

        <DashboardPanel eyebrow="Your status" title="Availability">
          <DriverAvailabilityControl driver={driver} />
          <dl className="mt-5 space-y-2.5 border-t border-olive-900/10 pt-4 text-[0.75rem]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-olive-500">Service area</dt>
              <dd className="text-right font-medium text-olive-800">{driver.serviceArea ?? 'Not set'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-olive-500">Vehicle</dt>
              <dd className="text-right font-medium capitalize text-olive-800">{driver.vehicle}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-olive-500">Contact</dt>
              <dd className="text-right font-medium text-olive-800">{driver.phone}</dd>
            </div>
          </dl>
        </DashboardPanel>
      </div>

      <DashboardPanel
        eyebrow="Recent activity"
        title="Delivery history"
        description="Completed and cancelled deliveries assigned to your profile."
        action={
          <ButtonLink to={ROUTES.driverHistory} variant="ghost" size="sm">
            View all
          </ButtonLink>
        }
        bodyClassName="px-0 py-0"
      >
        {history.deliveriesQuery.isLoading ? (
          <p className="px-5 py-6 text-[0.8125rem] text-olive-500">Loading recent deliveries…</p>
        ) : history.deliveriesQuery.isError ? (
          <p className="px-5 py-6 text-[0.8125rem] text-danger">
            {getErrorMessage(history.deliveriesQuery.error, 'Delivery history could not be loaded.')}
          </p>
        ) : recentRows.length ? (
          <ul className="divide-y divide-olive-900/8">
            {recentRows.map(({ delivery, order: rowOrder }) => (
              <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-olive-900">
                    {rowOrder?.code ?? delivery.orderId}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                    {rowOrder?.restaurantName ?? 'Savora restaurant'} ·{' '}
                    {delivery.deliveredAt ? formatDay(delivery.deliveredAt) : formatDay(delivery.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={delivery.status} />
                  <span className="text-[0.8125rem] font-medium text-olive-800">
                    {rowOrder ? formatCurrency(rowOrder.totals.total) : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-[0.8125rem] text-olive-500">
            No completed deliveries yet. Your first drop-off will appear here.
          </p>
        )}
      </DashboardPanel>

      <Link
        to={ROUTES.driverHistory}
        className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-500 transition hover:text-olive-900"
      >
        See every delivery
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
