import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  CookingPot,
  DollarSign,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { ButtonLink } from '@/components/ui/Button';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { averageOrderValue, completedRevenue } from '@/features/dashboard/lib/dashboard-utils';
import { useRestaurantOrders } from '../hooks/useRestaurantDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency, formatDay, pluralise } from '@/lib/format';
import { ROUTES } from '@/config/routes';
import type { Order } from '@/types';

export default function RestaurantOverviewPage() {
  useDocumentTitle('Restaurant overview');
  const orders = useRestaurantOrders();

  if (orders.isLoading) return <PageLoader label="Opening your kitchen…" />;

  if (orders.isError) {
    return (
      <ErrorState
        title="We could not load your orders"
        description="The demo order service did not respond. Try again in a moment."
        action={
          <button
            type="button"
            onClick={() => void orders.refetch()}
            className="rounded-full bg-olive-700 px-4 py-2 text-[0.8125rem] font-medium text-cream"
          >
            Try again
          </button>
        }
      />
    );
  }

  const allOrders = orders.data ?? [];
  const pending = allOrders.filter((order) => order.status === 'PENDING');
  const preparing = allOrders.filter((order) => order.status === 'PREPARING');
  const ready = allOrders.filter((order) => order.status === 'READY');
  const completed = allOrders.filter((order) => order.status === 'COMPLETED');
  const revenue = completedRevenue(allOrders);
  const average = averageOrderValue(allOrders);
  const recent = [...allOrders].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()).slice(0, 6);
  const activity = buildActivity(allOrders).slice(0, 6);

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        eyebrow="Today at a glance"
        title="Restaurant overview"
        description="Live demo snapshot of your kitchen queue, revenue and recent order activity."
        actions={
          <ButtonLink to={ROUTES.dashboardOrders} size="sm" variant="secondary">
            Manage orders
          </ButtonLink>
        }
      />

      {!allOrders.length ? (
        <EmptyState
          title="No orders yet"
          description="Incoming Savora orders will appear here as soon as a customer checks out."
          action={
            <ButtonLink to={ROUTES.dashboardOrders} size="sm" variant="outline">
              Open order management
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total orders"
              value={allOrders.length}
              hint={`${completed.length} completed · ${allOrders.length - completed.length} in progress or closed`}
              icon={<ShoppingBag aria-hidden="true" className="h-4 w-4" />}
            />
            <StatCard
              label="New orders"
              value={pending.length}
              hint="Waiting for your decision"
              icon={<Clock3 aria-hidden="true" className="h-4 w-4" />}
              tone={pending.length ? 'warning' : 'default'}
            />
            <StatCard
              label="Being prepared"
              value={preparing.length}
              hint="In the kitchen right now"
              icon={<CookingPot aria-hidden="true" className="h-4 w-4" />}
              tone={preparing.length ? 'warning' : 'default'}
            />
            <StatCard
              label="Ready for pickup"
              value={ready.length}
              hint="Waiting for a platform driver"
              icon={<PackageCheck aria-hidden="true" className="h-4 w-4" />}
              tone={ready.length ? 'danger' : 'default'}
            />
            <StatCard
              label="Completed"
              value={completed.length}
              hint={`${formatCurrency(revenue)} of delivered revenue`}
              icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
              tone="success"
            />
            <StatCard
              label="Revenue summary"
              value={formatCurrency(revenue)}
              hint={`Average completed order ${formatCurrency(average)}`}
              icon={<DollarSign aria-hidden="true" className="h-4 w-4" />}
              tone="success"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)]">
            <DashboardPanel
              eyebrow="Incoming"
              title="Recent orders"
              description="The latest orders for your restaurant only."
              action={
                <ButtonLink to={ROUTES.dashboardOrders} variant="ghost" size="sm">
                  View all
                </ButtonLink>
              }
              bodyClassName="px-0 py-0"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[0.8125rem]">
                  <thead className="border-b border-olive-900/10 bg-ivory-50/60 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Placed</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Total</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-olive-900/8">
                    {recent.map((order) => (
                      <tr key={order.id} className="transition hover:bg-ivory-50/60">
                        <td className="px-5 py-3.5">
                          <Link
                            to={ROUTES.dashboardOrder(order.id)}
                            className="font-medium text-olive-900 underline-offset-4 hover:text-terracotta-600 hover:underline"
                          >
                            {order.code}
                          </Link>
                          <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                            {pluralise(order.items.reduce((sum, item) => sum + item.quantity, 0), 'item')}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-olive-600">{order.customerName ?? 'Savora customer'}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[0.75rem] text-olive-500">
                          {formatDay(order.placedAt)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium text-olive-800">
                          {formatCurrency(order.totals.total)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>

            <DashboardPanel eyebrow="Timeline" title="Order activity" description="Recent status changes across your queue.">
              <ol className="space-y-4">
                {activity.map((event, index) => (
                  <li key={`${event.orderId}-${event.label}-${index}`} className="flex gap-3">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive-700/8 text-olive-700">
                      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.8125rem] font-medium text-olive-900">
                        {event.label} · {event.orderCode}
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] text-olive-500">{event.customer}</p>
                      <p className="mt-0.5 text-[0.625rem] text-olive-500">{formatDay(event.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </DashboardPanel>
          </div>
        </>
      )}
    </div>
  );
}

interface ActivityEvent {
  orderId: string;
  orderCode: string;
  customer: string;
  label: string;
  at: string;
}

function buildActivity(orders: Order[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const order of orders) {
    const push = (label: string, at?: string) => {
      if (!at) return;
      events.push({
        orderId: order.id,
        orderCode: order.code,
        customer: order.customerName ?? 'Savora customer',
        label,
        at,
      });
    };

    push('Order placed', order.placedAt);
    push('Order accepted', order.acceptedAt);
    push('Preparation started', order.preparingAt);
    push('Marked ready', order.readyAt);
    push('Order completed', order.completedAt);
    push('Order rejected', order.rejectedAt);
    push('Order cancelled', order.cancelledAt);
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
