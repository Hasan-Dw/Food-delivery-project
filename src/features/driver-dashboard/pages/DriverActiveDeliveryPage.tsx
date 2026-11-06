import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { formatAddress } from '@/features/dashboard/lib/dashboard-utils';
import { DeliveryMap } from '@/features/tracking/components/DeliveryMap';
import { useDriverActiveContext, useDriverDeliveryAction } from '../hooks/useDriverDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/stores/toast-store';
import { actorFromUser, canActOnDelivery } from '@/lib/permissions';
import { getErrorMessage } from '@/services/api/errors';
import { formatCurrency, formatEta, formatTime, pluralise } from '@/lib/format';
import { ROUTES } from '@/config/routes';
import type { DeliveryAction, DeliveryStatus } from '@/types';

interface NextAction {
  action: DeliveryAction;
  label: string;
  description: string;
  variant: 'primary' | 'secondary' | 'gold';
  requiresReadyOrder: boolean;
}

const nextActionFor: Partial<Record<DeliveryStatus, NextAction>> = {
  ASSIGNED: {
    action: 'PICK_UP',
    label: 'Confirm pickup',
    description: 'Only collect the food once the restaurant has marked the order ready.',
    variant: 'secondary',
    requiresReadyOrder: true,
  },
  PICKED_UP: {
    action: 'START_TRANSIT',
    label: 'Start transit',
    description: 'Head to the customer. The customer sees the delivery as on the way.',
    variant: 'primary',
    requiresReadyOrder: false,
  },
  ON_THE_WAY: {
    action: 'DELIVER',
    label: 'Confirm delivery',
    description: 'Completing the delivery also completes the customer’s order.',
    variant: 'gold',
    requiresReadyOrder: false,
  },
};

const steps: Array<{ status: DeliveryStatus; label: string }> = [
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'PICKED_UP', label: 'Picked up' },
  { status: 'ON_THE_WAY', label: 'On the way' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export default function DriverActiveDeliveryPage() {
  useDocumentTitle('Active delivery');
  const { user } = useAuth();
  const { profile, activeDelivery, order, tracking } = useDriverActiveContext();
  const action = useDriverDeliveryAction();
  const notify = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  if (activeDelivery.isLoading) return <PageLoader label="Checking your assignment…" />;

  if (activeDelivery.isError) {
    return (
      <ErrorState
        title="We could not load your assignment"
        description={getErrorMessage(activeDelivery.error)}
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void activeDelivery.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!activeDelivery.data) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Active delivery"
          title="No delivery assigned"
          description="Savora operations assigns deliveries to approved, available drivers."
        />
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title="You are not on a delivery"
          description={
            profile.data.availability === 'AVAILABLE'
              ? 'You are online and ready. A new assignment will appear here.'
              : 'Go online from the availability page when you are ready to accept work.'
          }
          action={
            <ButtonLink to={ROUTES.driverAvailability} variant="outline" size="sm">
              Manage availability
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (activeDelivery.data.status === 'DELIVERED' || activeDelivery.data.status === 'CANCELLED') {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Active delivery"
          title="This delivery is finished"
          description="It now lives in your delivery history."
        />
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title="Nothing left to do here"
          description="Open your history to review the completed or cancelled delivery."
          action={
            <ButtonLink to={ROUTES.driverHistory} variant="outline" size="sm">
              Open delivery history
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const delivery = activeDelivery.data;
  const currentOrder = order.data;
  const snapshot = tracking.data;
  const actor = actorFromUser(user);
  const next = nextActionFor[delivery.status];
  const orderIsReady = currentOrder?.status === 'READY';
  const canAdvance = Boolean(
    actor && next && canActOnDelivery(actor, delivery, next.action, delivery.status),
  );
  const blockedByKitchen = Boolean(next?.requiresReadyOrder && !orderIsReady);
  const stepIndex = steps.findIndex((step) => step.status === delivery.status);

  const executeAction = (deliveryAction: DeliveryAction) => {
    action.mutate(
      { deliveryId: delivery.id, action: deliveryAction },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title:
              deliveryAction === 'PICK_UP'
                ? 'Pickup confirmed'
                : deliveryAction === 'START_TRANSIT'
                  ? 'You are on the way'
                  : 'Delivery completed',
            description:
              deliveryAction === 'DELIVER'
                ? 'The customer’s order has been completed by the successful delivery.'
                : 'The delivery status has been updated.',
          });
        },
        onError: (error) => {
          notify({ tone: 'error', title: 'Could not update delivery', description: getErrorMessage(error) });
        },
        onSettled: () => setConfirmOpen(false),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Link
        to={ROUTES.driverDashboard}
        className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-500 transition hover:text-olive-900"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Back to overview
      </Link>

      <DashboardPageHeader
        eyebrow={`Delivery ${delivery.id}`}
        title={currentOrder?.code ?? 'Active delivery'}
        description={
          currentOrder
            ? `${currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)} ${pluralise(
                currentOrder.items.reduce((sum, item) => sum + item.quantity, 0),
                'item',
              )} for ${currentOrder.customerName ?? 'a Savora customer'} · ${formatCurrency(currentOrder.totals.total)}`
            : 'Assigned delivery details are loading from the demo service.'
        }
        actions={<StatusBadge status={delivery.status} />}
      />

      {blockedByKitchen ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-gold-300/60 bg-gold-50/70 px-4 py-3.5 text-[0.8125rem] leading-relaxed text-olive-700"
        >
          <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
          <p>
            The restaurant has not marked this order ready yet. Wait for the kitchen before confirming pickup; the
            service will reject an early pickup.
          </p>
        </div>
      ) : null}

      {!next ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-olive-900/10 bg-cream px-4 py-3.5 text-[0.8125rem] leading-relaxed text-olive-600"
        >
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-olive-700" />
          <p>No delivery action is available in the current state. Contact Savora operations if something looks wrong.</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
        <div className="space-y-6">
          {snapshot ? (
            <DeliveryMap snapshot={snapshot} />
          ) : tracking.isLoading ? (
            <PageLoader label="Preparing the demo map…" />
          ) : (
            <DashboardPanel eyebrow="Route" title="Map unavailable">
              <p className="text-[0.8125rem] leading-relaxed text-olive-500">
                {getErrorMessage(tracking.error, 'The demo tracking snapshot could not be loaded.')}
              </p>
            </DashboardPanel>
          )}

          <DashboardPanel eyebrow="Delivery progress" title="Route status">
            <ol className="grid gap-3 sm:grid-cols-4">
              {steps.map((step, index) => {
                const done = index < stepIndex;
                const active = index === stepIndex;
                return (
                  <li
                    key={step.status}
                    className={`rounded-xl border px-3 py-3 ${
                      active
                        ? 'border-terracotta-200 bg-terracotta-50/70'
                        : done
                          ? 'border-success/20 bg-success/5'
                          : 'border-olive-900/10 bg-ivory-50/60'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        active
                          ? 'bg-terracotta text-cream'
                          : done
                            ? 'bg-success text-cream'
                            : 'bg-olive-900/8 text-olive-500'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-[0.625rem] font-semibold">{index + 1}</span>
                      )}
                    </span>
                    <p className="mt-2 text-[0.75rem] font-medium text-olive-900">{step.label}</p>
                    <p className="mt-0.5 text-[0.625rem] text-olive-500">
                      {active ? 'Current step' : done ? 'Complete' : 'Up next'}
                    </p>
                  </li>
                );
              })}
            </ol>
          </DashboardPanel>

          <DashboardPanel eyebrow="Order" title="Pickup and drop-off">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-olive-900/10 bg-ivory-50/60 p-3.5">
                <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
                  <Store aria-hidden="true" className="h-3 w-3" /> Pickup
                </p>
                <p className="mt-1.5 text-[0.875rem] font-medium text-olive-900">
                  {currentOrder?.restaurantName ?? 'Restaurant'}
                </p>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-olive-600">
                  {snapshot?.restaurant.address ?? 'Restaurant address appears in the tracking snapshot.'}
                </p>
              </div>
              <div className="rounded-xl border border-olive-900/10 bg-ivory-50/60 p-3.5">
                <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
                  <MapPin aria-hidden="true" className="h-3 w-3" /> Drop-off
                </p>
                <p className="mt-1.5 text-[0.875rem] font-medium text-olive-900">
                  {currentOrder?.customerName ?? 'Savora customer'}
                </p>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-olive-600">
                  {currentOrder ? formatAddress(currentOrder.deliveryAddress) : 'Customer address in the app'}
                </p>
                {currentOrder?.deliveryAddress.instructions ? (
                  <p className="mt-2 border-t border-olive-900/10 pt-2 text-[0.6875rem] leading-relaxed text-olive-500">
                    <span className="font-medium text-olive-700">Instructions:</span>{' '}
                    {currentOrder.deliveryAddress.instructions}
                  </p>
                ) : null}
              </div>
            </div>
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel eyebrow="Next step" title="Delivery action">
            {next ? (
              <div className="space-y-4">
                <p className="text-[0.8125rem] leading-relaxed text-olive-600">{next.description}</p>
                <Button
                  type="button"
                  fullWidth
                  size="lg"
                  variant={next.variant}
                  disabled={!canAdvance || blockedByKitchen || action.isPending}
                  isLoading={action.isPending && action.variables?.action === next.action}
                  onClick={() => {
                    if (next.action === 'DELIVER') {
                      setConfirmOpen(true);
                      return;
                    }
                    executeAction(next.action);
                  }}
                  iconLeft={
                    next.action === 'DELIVER' ? (
                      <PackageCheck aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Navigation aria-hidden="true" className="h-4 w-4" />
                    )
                  }
                >
                  {blockedByKitchen ? 'Waiting for the kitchen' : next.label}
                </Button>
                <p className="text-[0.625rem] leading-relaxed text-olive-500">
                  Actions are checked against your driver profile and the current delivery status. Demo services
                  enforce the same rules a backend must apply.
                </p>
              </div>
            ) : (
              <p className="text-[0.8125rem] leading-relaxed text-olive-500">
                This delivery has no next driver action. Savora operations handles unassignment and reassignment.
              </p>
            )}
          </DashboardPanel>

          <DashboardPanel eyebrow="Customer" title="Contact details">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-olive-700/8 text-olive-700">
                <UserRound aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-medium text-olive-900">
                  {currentOrder?.customerName ?? 'Savora customer'}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-olive-500">
                  <Phone aria-hidden="true" className="h-3 w-3" />
                  {currentOrder?.customerPhone ?? 'Demo contact not supplied'}
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-gold-50/70 px-3.5 py-3 text-[0.6875rem] leading-relaxed text-olive-600">
              Contact details are seeded demo data. In production, phone numbers should be masked or proxied until the
              delivery is active.
            </p>
          </DashboardPanel>

          <DashboardPanel eyebrow="Timing" title="ETA and updates">
            <dl className="space-y-2.5 text-[0.75rem]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">Estimated arrival</dt>
                <dd className="font-medium text-olive-800">
                  {snapshot ? formatEta(snapshot.etaMinutes) : 'Not available'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">Assigned at</dt>
                <dd className="font-medium text-olive-800">
                  {delivery.assignedAt ? formatTime(delivery.assignedAt) : 'Not assigned'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">Picked up at</dt>
                <dd className="font-medium text-olive-800">
                  {delivery.pickedUpAt ? formatTime(delivery.pickedUpAt) : 'Not yet'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">Last map update</dt>
                <dd className="font-medium text-olive-800">
                  {snapshot ? formatTime(snapshot.lastUpdated) : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 flex items-start gap-1.5 border-t border-olive-900/10 pt-3 text-[0.625rem] leading-relaxed text-olive-500">
              <Navigation aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
              GPS is not tracked in this prototype. The map is an illustrative route.
            </p>
          </DashboardPanel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm delivery?"
        description="Only confirm after handing the food to the customer. This completes the delivery and the customer’s order."
        confirmLabel="Yes, delivered"
        tone="primary"
        isLoading={action.isPending && action.variables?.action === 'DELIVER'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => executeAction('DELIVER')}
      />
    </div>
  );
}
