import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageSearch,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react';
import type { Delivery, Order, OrderStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel, FilterTabs } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { completedRevenue } from '@/features/dashboard/lib/dashboard-utils';
import { useAdminOrders } from '../hooks/useAdminDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { formatCurrency, formatDay, formatTime, pluralise } from '@/lib/format';

type Filter = OrderStatus | 'ALL';

interface OrderRow {
  order: Order;
  delivery?: Delivery;
}

export default function AdminOrdersPage() {
  useDocumentTitle('Orders');
  const { orders, deliveries } = useAdminOrders();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');

  const deliveryByOrder = useMemo(() => {
    const map = new Map<string, Delivery>();
    (deliveries.data ?? []).forEach((delivery) => map.set(delivery.orderId, delivery));
    return map;
  }, [deliveries.data]);

  const rows = useMemo<OrderRow[]>(() => {
    return [...(orders.data ?? [])]
      .map((order) => ({ order, delivery: deliveryByOrder.get(order.id) }))
      .sort((a, b) => new Date(b.order.placedAt).getTime() - new Date(a.order.placedAt).getTime());
  }, [deliveryByOrder, orders.data]);

  const counts = useMemo(() => {
    const byStatus = (status: OrderStatus) => rows.filter((row) => row.order.status === status).length;
    return {
      ALL: rows.length,
      PENDING: byStatus('PENDING'),
      ACCEPTED: byStatus('ACCEPTED'),
      PREPARING: byStatus('PREPARING'),
      READY: byStatus('READY'),
      COMPLETED: byStatus('COMPLETED'),
      REJECTED: byStatus('REJECTED'),
      CANCELLED: byStatus('CANCELLED'),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== 'ALL' && row.order.status !== filter) return false;
      if (!query) return true;
      const haystack = [
        row.order.code,
        row.order.restaurantName,
        row.order.customerName,
        row.delivery?.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filter, rows, search]);

  if (orders.isLoading || deliveries.isLoading) {
    return <PageLoader label="Loading the order book…" />;
  }

  if (orders.isError || deliveries.isError) {
    return (
      <ErrorState
        title="Orders could not be loaded"
        description={getErrorMessage(orders.error ?? deliveries.error)}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void orders.refetch();
              void deliveries.refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const activeRows = rows.filter(
    (row) => row.order.status !== 'COMPLETED' && row.order.status !== 'CANCELLED' && row.order.status !== 'REJECTED',
  );
  const awaitingDriver = rows.filter((row) => row.delivery?.status === 'PENDING_ASSIGNMENT').length;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Platform order book"
        title="Orders"
        description="Read-only view across every restaurant. Status changes stay with the restaurant and the delivery system; no administrator can manually complete an order."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders in progress"
          value={activeRows.length}
          hint="Pending, accepted, preparing or ready"
          icon={<ShoppingBag aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting a driver"
          value={awaitingDriver}
          hint="Delivery returned to PENDING_ASSIGNMENT"
          icon={<PackageSearch aria-hidden="true" className="h-4 w-4" />}
          tone={awaitingDriver ? 'warning' : 'default'}
        />
        <StatCard
          label="Completed"
          value={counts.COMPLETED}
          hint="Closed by a successful delivery"
          icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Completed value"
          value={formatCurrency(completedRevenue(orders.data ?? []))}
          hint="Demo figure, not a settlement ledger"
          icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'All', count: counts.ALL },
            { value: 'PENDING', label: 'Pending', count: counts.PENDING },
            { value: 'ACCEPTED', label: 'Accepted', count: counts.ACCEPTED },
            { value: 'PREPARING', label: 'Preparing', count: counts.PREPARING },
            { value: 'READY', label: 'Ready', count: counts.READY },
            { value: 'COMPLETED', label: 'Completed', count: counts.COMPLETED },
            { value: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED },
            { value: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
          ]}
        />
        <Input
          aria-label="Search orders"
          placeholder="Search order, restaurant or customer"
          value={search}
          leading={<Search aria-hidden="true" className="h-4 w-4" />}
          className="h-10 lg:w-72"
          containerClassName="space-y-0"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <DashboardPanel bodyClassName="px-0 py-0">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[62rem] w-full text-left text-[0.8125rem]">
              <thead className="border-b border-olive-900/10 bg-ivory-50/70 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Restaurant / customer</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Placed</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Items</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Total</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Order status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-900/8">
                {filtered.map(({ order, delivery }) => {
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr key={order.id} className="align-top transition hover:bg-ivory-50/60">
                      <td className="px-5 py-4">
                        <p className="font-medium text-olive-900">{order.code}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                          {order.restaurantName} · {order.restaurantId}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-olive-600">
                        <p>{order.customerName ?? 'Savora customer'}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                          {order.customerPhone ?? 'Contact hidden'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[0.75rem] text-olive-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 aria-hidden="true" className="h-3 w-3" />
                          {formatDay(order.placedAt)}
                        </span>
                        <p className="mt-0.5 text-[0.625rem] text-olive-500">{formatTime(order.placedAt)}</p>
                      </td>
                      <td className="px-5 py-4 text-olive-600">
                        {itemCount}
                        <span className="ml-1 text-[0.6875rem] text-olive-500">
                          {pluralise(itemCount, 'item')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-olive-800">
                        {formatCurrency(order.totals.total)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        {delivery ? (
                          <div className="space-y-1.5">
                            <StatusBadge status={delivery.status} />
                            <p className="text-[0.625rem] text-olive-500">
                              {delivery.driverId
                                ? `Driver ${delivery.driverId}`
                                : 'No driver assigned'}
                            </p>
                            <p className="inline-flex items-center gap-1 text-[0.625rem] text-olive-500">
                              {delivery.status === 'DELIVERED' ? (
                                <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-success" />
                              ) : delivery.status === 'CANCELLED' ? (
                                <XCircle aria-hidden="true" className="h-3 w-3 text-danger" />
                              ) : (
                                <Truck aria-hidden="true" className="h-3 w-3 text-olive-400" />
                              )}
                              {delivery.deliveredAt
                                ? `Delivered ${formatTime(delivery.deliveredAt)}`
                                : delivery.estimatedArrivalAt
                                  ? `ETA ${formatTime(delivery.estimatedArrivalAt)}`
                                  : 'No ETA yet'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[0.75rem] text-olive-500">No delivery record</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="No orders match these filters"
            description="Clear the search or choose another order status."
            className="border-0 bg-transparent"
          />
        )}
      </DashboardPanel>

      <p className="rounded-2xl border border-olive-900/10 bg-cream px-4 py-3.5 text-[0.75rem] leading-relaxed text-olive-500">
        Order status is owned by the restaurant lifecycle. Delivery status is owned by the platform delivery system.
        The order only reaches <span className="font-medium text-olive-700">Completed</span> when a driver confirms a
        successful drop-off; there is intentionally no manual completion action here.
      </p>
    </div>
  );
}
