import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, FlaskConical, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanel';
import { TrackingMap } from '@/features/tracking/components/TrackingMap';
import { DriverCard } from '@/features/tracking/components/DriverCard';
import { OrderSummary } from '@/features/tracking/components/OrderSummary';
import { TrackingTimeline } from '@/features/tracking/components/TrackingTimeline';
import { useOrderTracking } from '@/features/tracking/hooks/useOrderTracking';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/stores/toast-store';
import { trackingStatusMeta } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { resolveTrackingPhase, type TrackingPhase } from '@/lib/order-lifecycle';
import { formatEta, formatTime } from '@/lib/format';
import { getErrorMessage } from '@/services/api/errors';
import { cn } from '@/lib/cn';

const headlines: Record<TrackingPhase, { lead: string; accent: string }> = {
  PENDING: { lead: 'Your order is', accent: 'placed.' },
  ACCEPTED: { lead: 'Your order is', accent: 'confirmed.' },
  REJECTED: { lead: 'This order was', accent: 'rejected.' },
  PREPARING: { lead: 'The kitchen is', accent: 'on it.' },
  READY: { lead: 'Packed and', accent: 'ready to go.' },
  COMPLETED: { lead: 'Dinner has', accent: 'arrived.' },
  CANCELLED: { lead: 'This order was', accent: 'cancelled.' },
  PENDING_ASSIGNMENT: { lead: 'Finding your', accent: 'delivery partner.' },
  ASSIGNED: { lead: 'Your driver is', accent: 'on the way.' },
  PICKED_UP: { lead: 'Dinner has been', accent: 'picked up.' },
  ON_THE_WAY: { lead: 'Dinner is', accent: 'on the way.' },
  DELIVERED: { lead: 'Dinner has', accent: 'arrived.' },
  INCONSISTENT: { lead: 'Tracking needs', accent: 'a check.' },
};

/**
 * Order tracking: map first, then the story and the receipt.
 *
 * Only the order's customer (or the restaurant/driver/admin) may open it; the
 * route guard and the API both enforce that. The map is a real tile map for
 * API-backed data and a labelled illustration for the in-browser demo.
 */
export default function OrderTrackingPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { order, tracking, history } = useOrderTracking(orderId);
  const notify = useToast();
  const [refreshing, setRefreshing] = useState(false);

  useDocumentTitle(order.data ? `Order ${order.data.code}` : 'Order tracking');

  const isLoading = order.isLoading || tracking.isLoading || history.isLoading;
  const hasError = order.isError || tracking.isError || history.isError;

  if (isLoading && !order.data) {
    return <PageLoader label="Finding your delivery…" />;
  }

  if (hasError || !order.data || !tracking.data || !history.data) {
    const error = order.error ?? tracking.error ?? history.error;
    return (
      <div className="shell py-16">
        <ErrorState
          title="We could not find that delivery"
          description={getErrorMessage(error, 'The order link may be incomplete, or this order is no longer available.')}
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" size="sm" onClick={() => { order.refetch(); tracking.refetch(); history.refetch(); }}>
                Try again
              </Button>
              <ButtonLink to={ROUTES.orderHistory} size="sm">
                View my orders
              </ButtonLink>
            </div>
          }
        />
        <p className="mt-6 text-center text-[0.75rem] text-olive-500">
          <Link to={ROUTES.home} className="font-medium text-olive-600 underline-offset-4 hover:underline">
            Back to the marketplace
          </Link>
        </p>
      </div>
    );
  }

  const currentOrder = order.data;
  const snapshot = tracking.data;
  const status = resolveTrackingPhase(currentOrder.status, snapshot.deliveryStatus);
  const headline = headlines[status];
  const meta =
    status === 'INCONSISTENT'
      ? {
          label: 'Order and delivery mismatch',
          short: 'Needs review',
          description:
            'The order and its delivery disagree. Savora operations must reconcile this before it is treated as complete.',
        }
      : trackingStatusMeta[status];
  const isDelivered = status === 'DELIVERED' || status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';
  const isInconsistent = status === 'INCONSISTENT';
  const isDone = isDelivered || isCancelled || isInconsistent;
  const isDemo = !snapshot.live;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([order.refetch(), tracking.refetch(), history.refetch()]);
      notify({
        tone: 'info',
        title: 'Tracking refreshed',
        description: 'The latest order and driver position are now shown.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-olive-900/8 bg-cream">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-36 h-[26rem] w-[26rem] rounded-full border border-olive-900/6"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-gold-100/50 blur-3xl"
        />

        <div className="shell relative py-7 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={ROUTES.home}
              className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-500 transition hover:text-olive-900"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back to the marketplace
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/50 bg-gold-50 px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-gold-700">
              {isDemo ? <FlaskConical aria-hidden="true" className="h-3 w-3" /> : null}
              {isDemo ? 'Snapshot tracking' : 'Live tracking'}
            </span>
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="eyebrow text-terracotta-600">Order tracking</p>
              <h1 className="mt-4 text-[clamp(2.5rem,4.6vw,4rem)] leading-[1.02]">
                {headline.lead} <em className="italic text-terracotta">{headline.accent}</em>
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-olive-500">
                <Badge tone={isDelivered ? 'success' : isCancelled || isInconsistent ? 'terracotta' : 'olive'}>
                  {meta.label}
                </Badge>
                <span>{currentOrder.restaurantName}</span>
                <span className="hidden h-1 w-1 rounded-full bg-olive-300 sm:block" aria-hidden="true" />
                <span>
                  Order {currentOrder.code} · placed {formatTime(currentOrder.placedAt)}
                </span>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-olive-900/10 bg-ivory p-5 shadow-[0_1px_0_rgba(73,56,46,0.03)] lg:w-[19rem]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-olive-500">
                    {isDelivered
                      ? 'Delivered'
                      : isCancelled
                        ? 'Order status'
                        : isInconsistent
                          ? 'Needs attention'
                          : 'Arriving in'}
                  </p>
                  <p
                    className={cn(
                      'mt-1.5 font-display leading-none text-olive-900',
                      isDone ? 'text-[1.85rem]' : 'text-[2.6rem]',
                    )}
                  >
                    {isDelivered
                      ? snapshot.deliveredAt
                        ? formatTime(snapshot.deliveredAt)
                        : 'Delivered'
                      : isCancelled
                        ? 'Cancelled'
                        : isInconsistent
                          ? 'Mismatch'
                          : snapshot.estimatedArrivalAt
                            ? formatEta(snapshot.etaMinutes)
                            : 'Awaiting driver'}
                  </p>
                  <p className="mt-2 text-[0.6875rem] leading-relaxed text-olive-500">
                    {isDelivered
                      ? 'Enjoy your meal. This receipt stays available in this preview.'
                      : isCancelled
                        ? 'No delivery is in progress for this order.'
                        : isInconsistent
                          ? 'Order and delivery states conflict. This is shown explicitly instead of hiding it.'
                          : snapshot.estimatedArrivalAt
                            ? `Estimated by ${formatTime(snapshot.estimatedArrivalAt)} · ${meta.description}`
                            : 'A reliable arrival estimate appears once a driver is assigned.'}
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-terracotta ring-1 ring-inset ring-olive-900/8">
                  <span className="h-2 w-2 rounded-full bg-terracotta" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-olive-900/8 pt-3">
                <span className="text-[0.625rem] text-olive-500">
                  {isDemo ? 'Illustrative snapshot' : 'Live connection'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={refresh}
                  isLoading={refreshing || order.isFetching || tracking.isFetching}
                  iconLeft={<RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isInconsistent ? (
        <div className="shell pt-6">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3.5 text-[0.8125rem] leading-relaxed text-danger"
          >
            <RefreshCw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The order status and delivery status do not agree. Savora never presents this as a completed delivery;
              operations must reconcile the two records in the backend.
            </p>
          </div>
        </div>
      ) : null}

      <div className="shell grid items-start gap-6 py-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,1fr)] lg:gap-7 lg:py-10">
        <div className="min-w-0 space-y-6">
          <TrackingMap snapshot={snapshot} />
          <TrackingTimeline
            events={history.data}
            currentStatus={status}
            lastUpdated={snapshot.lastUpdated}
          />
        </div>

        <aside className="min-w-0 space-y-6">
          <DriverCard snapshot={snapshot} />
          <OrderSummary order={currentOrder} />

          <div className="rounded-2xl border border-olive-900/10 bg-cream px-5 py-4">
            <p className="flex items-start gap-2.5 text-[0.75rem] leading-relaxed text-olive-500">
              <FlaskConical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              <span>
                {isDemo
                  ? 'Tracking is served from a saved snapshot. Refresh to fetch the latest order state.'
                  : 'This page receives live driver positions and status changes from the Savora tracking channel.'}
              </span>
            </p>
            <Link
              to={ROUTES.home}
              className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-600 underline-offset-4 hover:underline"
            >
              Keep exploring
              <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
