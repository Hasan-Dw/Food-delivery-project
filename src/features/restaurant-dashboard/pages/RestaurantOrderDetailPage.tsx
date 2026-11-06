import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { RestaurantOrderActions } from '../components/RestaurantOrderActions';
import {
  useRestaurantDelivery,
  useRestaurantOrder,
  useRestaurantOrderAction,
  useRestaurantOrderHistory,
} from '../hooks/useRestaurantDashboard';
import { useToast } from '@/stores/toast-store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatAddress } from '@/features/dashboard/lib/dashboard-utils';
import { getErrorMessage } from '@/services/api/errors';
import { services } from '@/services';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDay, formatTime, pluralise } from '@/lib/format';
import { ROUTES } from '@/config/routes';
import type { OrderAction } from '@/types';

export default function RestaurantOrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const order = useRestaurantOrder(orderId);
  const history = useRestaurantOrderHistory(orderId);
  const delivery = useRestaurantDelivery(orderId);
  const action = useRestaurantOrderAction();
  const notify = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<OrderAction | null>(null);

  const drivers = useQuery({
    queryKey: queryKeys.drivers,
    queryFn: () => services.drivers.list(),
    enabled: Boolean(delivery.data?.driverId),
  });

  const assignedDriver = drivers.data?.find((driver) => driver.id === delivery.data?.driverId);
  useDocumentTitle(order.data ? `Order ${order.data.code}` : 'Order details');

  if (order.isLoading || history.isLoading) return <PageLoader label="Opening order details…" />;

  if (order.isError || !order.data) {
    return (
      <ErrorState
        title="Order not found"
        description={getErrorMessage(order.error, 'This order may no longer exist in the demo service.')}
        action={
          <Link
            to={ROUTES.dashboardOrders}
            className="rounded-full bg-olive-700 px-4 py-2 text-[0.8125rem] font-medium text-cream"
          >
            Back to orders
          </Link>
        }
      />
    );
  }

  if (!order.belongsToRestaurant) {
    return (
      <ErrorState
        title="This order belongs to another restaurant"
        description="Restaurant owners can only inspect orders linked to their own restaurant."
        action={
          <Link
            to={ROUTES.dashboardOrders}
            className="rounded-full bg-olive-700 px-4 py-2 text-[0.8125rem] font-medium text-cream"
          >
            Back to your orders
          </Link>
        }
      />
    );
  }

  const current = order.data;
  const itemCount = current.items.reduce((sum, item) => sum + item.quantity, 0);
  const currentDelivery = delivery.data;
  const historyEvents = history.data ?? [];

  const runAction = (nextAction: OrderAction) => {
    setPendingAction(nextAction);
    action.mutate(
      { orderId: current.id, action: nextAction },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title: 'Order updated',
            description: `${current.code} is now ${nextAction === 'READY' ? 'ready for pickup' : nextAction.toLowerCase()}.`,
          });
        },
        onError: (error) => {
          notify({ tone: 'error', title: 'Could not update order', description: getErrorMessage(error) });
        },
        onSettled: () => setPendingAction(null),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Link
        to={ROUTES.dashboardOrders}
        className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-500 transition hover:text-olive-900"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Back to order management
      </Link>

      <DashboardPageHeader
        eyebrow={`${itemCount} ${pluralise(itemCount, 'item')} · ${formatCurrency(current.totals.total)}`}
        title={current.code}
        description={`Placed ${formatDay(current.placedAt)} by ${current.customerName ?? 'a Savora customer'}.`}
        actions={
          <>
            <StatusBadge status={current.status} />
            <RestaurantOrderActions
              order={current}
              onAction={(nextAction) => {
                if (nextAction === 'REJECT') setRejectOpen(true);
                else runAction(nextAction);
              }}
              pendingAction={pendingAction}
            />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
        <div className="space-y-6">
          <DashboardPanel eyebrow="Kitchen ticket" title="Items ordered" bodyClassName="px-0 py-0">
            <div className="divide-y divide-olive-900/8">
              {current.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-olive-700/8 text-[0.75rem] font-semibold text-olive-700">
                      {item.quantity}×
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.875rem] font-medium text-olive-900">{item.name}</p>
                      {item.selectedOptions?.length ? (
                        <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                          {item.selectedOptions.map((option) => option.optionName).join(' · ')}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-[0.875rem] font-medium text-olive-800">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <dl className="space-y-2 border-t border-olive-900/10 bg-ivory-50/50 px-5 py-4 text-[0.8125rem]">
              <TotalRow label="Subtotal" value={formatCurrency(current.totals.subtotal)} />
              <TotalRow label="Delivery fee" value={formatCurrency(current.totals.deliveryFee)} />
              <TotalRow label="Service fee" value={formatCurrency(current.totals.serviceFee)} />
              {current.totals.discount > 0 ? (
                <TotalRow label="Discount" value={`−${formatCurrency(current.totals.discount)}`} />
              ) : null}
              <TotalRow label="Tax" value={formatCurrency(current.totals.tax)} />
              <div className="flex items-center justify-between border-t border-olive-900/10 pt-2 text-[0.9375rem] font-semibold text-olive-900">
                <dt>Total</dt>
                <dd>{formatCurrency(current.totals.total)}</dd>
              </div>
            </dl>
          </DashboardPanel>

          <DashboardPanel eyebrow="Audit" title="Order history">
            {historyEvents.length ? (
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[0.9375rem] before:top-2 before:w-px before:bg-olive-900/10">
                {historyEvents.map((event, index) => (
                  <li key={`${event.status}-${index}`} className="relative flex gap-3">
                    <span
                      className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-cream ${
                        event.completed ? 'bg-olive-700 text-cream' : 'bg-ivory-200 text-olive-400'
                      }`}
                    >
                      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 pb-1">
                      <p className="text-[0.8125rem] font-medium text-olive-900">{event.label}</p>
                      <p className="mt-0.5 text-[0.75rem] leading-relaxed text-olive-500">{event.description}</p>
                      {event.timestamp ? (
                        <p className="mt-1 text-[0.625rem] text-olive-500">
                          {formatDay(event.timestamp)} · {formatTime(event.timestamp)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[0.8125rem] text-olive-500">No history events are available for this order yet.</p>
            )}
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel eyebrow="Customer" title="Delivery details">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-olive-700/8 text-olive-700">
                <UserRound aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-medium text-olive-900">
                  {current.customerName ?? 'Savora customer'}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-olive-500">
                  <Phone aria-hidden="true" className="h-3 w-3" />
                  {current.customerPhone ?? 'Demo contact not supplied'}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-olive-900/10 bg-ivory-50/60 p-3.5">
              <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
                <MapPin aria-hidden="true" className="h-3 w-3" />
                {current.deliveryAddress.label} address
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-olive-700">
                {formatAddress(current.deliveryAddress)}
              </p>
              {current.deliveryAddress.instructions ? (
                <p className="mt-2 border-t border-olive-900/10 pt-2 text-[0.6875rem] leading-relaxed text-olive-500">
                  <span className="font-medium text-olive-700">Instructions:</span>{' '}
                  {current.deliveryAddress.instructions}
                </p>
              ) : null}
            </div>
          </DashboardPanel>

          <DashboardPanel eyebrow="Platform delivery" title="Driver & ETA">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-olive-700/8 text-olive-700">
                  <Truck aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[0.75rem] text-olive-500">Delivery status</p>
                  {currentDelivery ? (
                    <StatusBadge status={currentDelivery.status} className="mt-1" />
                  ) : (
                    <p className="text-[0.8125rem] text-olive-500">No delivery record</p>
                  )}
                </div>
              </div>
            </div>

            {assignedDriver ? (
              <div className="mt-4 rounded-xl border border-olive-900/10 bg-ivory-50/60 p-3.5">
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">Assigned driver</p>
                <p className="mt-1.5 text-[0.8125rem] font-medium text-olive-900">{assignedDriver.name}</p>
                <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                  {assignedDriver.vehicle} · {assignedDriver.phone}
                </p>
              </div>
            ) : null}

            {currentDelivery?.estimatedArrivalAt ? (
              <p className="mt-4 flex items-center gap-1.5 text-[0.75rem] text-olive-600">
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-terracotta" />
                Estimated arrival {formatTime(currentDelivery.estimatedArrivalAt)}
              </p>
            ) : (
              <p className="mt-4 text-[0.75rem] text-olive-500">
                No reliable ETA until Savora assigns a driver.
              </p>
            )}

            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-gold-50/70 px-3.5 py-3 text-[0.6875rem] leading-relaxed text-olive-600">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
              <p>
                Driver assignment belongs to Savora operations, not the restaurant. Your kitchen only prepares the
                food and marks it ready.
              </p>
            </div>
          </DashboardPanel>
        </div>
      </div>

      <ConfirmDialog
        open={rejectOpen}
        title={`Reject ${current.code}?`}
        description="The customer will be notified and the delivery will be cancelled. This cannot be undone."
        confirmLabel="Reject order"
        tone="danger"
        isLoading={action.isPending && pendingAction === 'REJECT'}
        onCancel={() => setRejectOpen(false)}
        onConfirm={() => {
          setRejectOpen(false);
          runAction('REJECT');
        }}
      />
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-olive-600">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
