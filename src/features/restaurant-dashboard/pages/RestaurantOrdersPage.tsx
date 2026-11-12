import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel, FilterTabs } from '@/features/dashboard/components/DashboardPanel';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { RestaurantOrderActions } from '../components/RestaurantOrderActions';
import { useRestaurantOrderAction, useRestaurantOrders } from '../hooks/useRestaurantDashboard';
import { useToast } from '@/stores/toast-store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { formatCurrency, formatDay, pluralise } from '@/lib/format';
import { ROUTES } from '@/config/routes';
import type { Order, OrderAction } from '@/types';

type Filter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CLOSED';

const actionSuccess: Record<OrderAction, string> = {
  ACCEPT: 'Order accepted',
  REJECT: 'Order rejected',
  PREPARE: 'Preparation started',
  READY: 'Order marked ready',
  COMPLETE: 'Order completed',
  CANCEL: 'Order cancelled',
};

export default function RestaurantOrdersPage() {
  useDocumentTitle('Order management');
  const orders = useRestaurantOrders();
  const action = useRestaurantOrderAction();
  const notify = useToast();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null);
  const [pending, setPending] = useState<{ orderId: string; action: OrderAction } | null>(null);

  const allOrders = useMemo(() => orders.data ?? [], [orders.data]);
  const filtered = useMemo(() => {
    return allOrders.filter((order) => {
      if (filter === 'ALL') return true;
      if (filter === 'CLOSED') return order.status === 'REJECTED' || order.status === 'CANCELLED';
      return order.status === filter;
    });
  }, [allOrders, filter]);

  const counts = {
    ALL: allOrders.length,
    PENDING: allOrders.filter((order) => order.status === 'PENDING').length,
    ACCEPTED: allOrders.filter((order) => order.status === 'ACCEPTED').length,
    PREPARING: allOrders.filter((order) => order.status === 'PREPARING').length,
    READY: allOrders.filter((order) => order.status === 'READY').length,
    COMPLETED: allOrders.filter((order) => order.status === 'COMPLETED').length,
    CLOSED: allOrders.filter((order) => order.status === 'REJECTED' || order.status === 'CANCELLED').length,
  };

  const runAction = (order: Order, nextAction: OrderAction) => {
    setPending({ orderId: order.id, action: nextAction });
    action.mutate(
      { orderId: order.id, action: nextAction },
      {
        onSuccess: () => {
          notify({ tone: 'success', title: actionSuccess[nextAction], description: `${order.code} was updated.` });
        },
        onError: (error) => {
          notify({ tone: 'error', title: 'Could not update order', description: getErrorMessage(error) });
        },
        onSettled: () => setPending(null),
      },
    );
  };

  if (orders.isLoading) return <PageLoader label="Loading your orders…" />;

  if (orders.isError) {
    return (
      <ErrorState
        title="Orders could not be loaded"
        description="The order service did not respond."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void orders.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Kitchen queue"
        title="Order management"
        description="Only orders for your restaurant appear here. Accept, reject, start preparing and hand food over when it is ready."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void orders.refetch()}
            isLoading={orders.isFetching}
            iconLeft={<RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      <FilterTabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'All orders', count: counts.ALL },
          { value: 'PENDING', label: 'New', count: counts.PENDING },
          { value: 'ACCEPTED', label: 'Accepted', count: counts.ACCEPTED },
          { value: 'PREPARING', label: 'Preparing', count: counts.PREPARING },
          { value: 'READY', label: 'Ready', count: counts.READY },
          { value: 'COMPLETED', label: 'Completed', count: counts.COMPLETED },
          { value: 'CLOSED', label: 'Closed', count: counts.CLOSED },
        ]}
      />

      <DashboardPanel bodyClassName="px-0 py-0">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[54rem] w-full text-left text-[0.8125rem]">
              <thead className="border-b border-olive-900/10 bg-ivory-50/70 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Items</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Total</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Placed</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-900/8">
                {filtered.map((order) => {
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr key={order.id} className="align-top transition hover:bg-ivory-50/60">
                      <td className="px-5 py-4">
                        <Link
                          to={ROUTES.dashboardOrder(order.id)}
                          className="font-medium text-olive-900 underline-offset-4 hover:text-terracotta-600 hover:underline"
                        >
                          {order.code}
                        </Link>
                        <p className="mt-0.5 text-[0.6875rem] text-olive-500">{order.restaurantName}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-olive-800">{order.customerName ?? 'Savora customer'}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-olive-500">{order.customerPhone ?? 'Contact not supplied'}</p>
                      </td>
                      <td className="px-5 py-4 text-olive-600">
                        {itemCount} {pluralise(itemCount, 'item')}
                        <p className="mt-0.5 max-w-[15rem] truncate text-[0.6875rem] text-olive-500">
                          {order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-olive-800">
                        {formatCurrency(order.totals.total)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[0.75rem] text-olive-500">
                        {formatDay(order.placedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        <RestaurantOrderActions
                          order={order}
                          onAction={(nextAction) => {
                            if (nextAction === 'REJECT') setRejectTarget(order);
                            else runAction(order, nextAction);
                          }}
                          pendingAction={pending?.orderId === order.id ? pending.action : null}
                        />
                        {['COMPLETED', 'REJECTED', 'CANCELLED'].includes(order.status) ? (
                          <Link
                            to={ROUTES.dashboardOrder(order.id)}
                            className="inline-flex text-[0.75rem] font-medium text-olive-600 underline-offset-4 hover:text-olive-900 hover:underline"
                          >
                            View details
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title={filter === 'ALL' ? 'No orders yet' : 'Nothing in this filter'}
            description={
              filter === 'ALL'
                ? 'Orders will appear here when customers check out.'
                : 'Try a different order status to see more of your queue.'
            }
            className="border-0 bg-transparent"
          />
        )}
      </DashboardPanel>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title={`Reject ${rejectTarget?.code ?? 'this order'}?`}
        description="The customer will be told the restaurant could not accept this order. The linked delivery is cancelled. This cannot be undone."
        confirmLabel="Reject order"
        tone="danger"
        isLoading={action.isPending && pending?.action === 'REJECT'}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => {
          if (!rejectTarget) return;
          runAction(rejectTarget, 'REJECT');
          setRejectTarget(null);
        }}
      />
    </div>
  );
}
