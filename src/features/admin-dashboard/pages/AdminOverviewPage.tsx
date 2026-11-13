import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  PackageSearch,
  ShoppingBag,
  Truck,
  UserCheck,
  Users,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanel';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { completedRevenue } from '@/features/dashboard/lib/dashboard-utils';
import {
  buildAdminDeliveryRows,
  useAdminAccounts,
  useAdminDeliveries,
  useAdminOrders,
} from '../hooks/useAdminDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { isActiveDeliveryStatus } from '@/lib/order-lifecycle';
import { roleLabels } from '@/lib/permissions';
import { formatCurrency, formatDay, formatMemberSince, pluralise } from '@/lib/format';
import { ROUTES } from '@/config/routes';

export default function AdminOverviewPage() {
  useDocumentTitle('Operations overview');
  const accounts = useAdminAccounts();
  const deliveries = useAdminDeliveries();
  const drivers = deliveries.drivers;
  const orders = useAdminOrders();

  const isLoading =
    accounts.isLoading || drivers.isLoading || deliveries.deliveries.isLoading || orders.orders.isLoading;
  const error =
    accounts.error ?? drivers.error ?? deliveries.deliveries.error ?? orders.orders.error;

  if (isLoading) return <PageLoader label="Opening the control room…" />;

  if (error) {
    return (
      <ErrorState
        title="Operations data could not be loaded"
        description={getErrorMessage(error)}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void accounts.refetch();
              void drivers.refetch();
              void deliveries.deliveries.refetch();
              void orders.orders.refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const allAccounts = accounts.data ?? [];
  const allDrivers = drivers.data ?? [];
  const allDeliveries = deliveries.deliveries.data ?? [];
  const allOrders = orders.orders.data ?? [];

  const pendingAccounts = allAccounts.filter(
    (account) => account.accountStatus === 'PENDING_APPROVAL' && account.role !== 'CUSTOMER',
  );
  const approvedDrivers = allDrivers.filter((driver) => driver.accountStatus === 'APPROVED');
  const availableDrivers = approvedDrivers.filter(
    (driver) => driver.availability === 'AVAILABLE' && !driver.activeDeliveryId,
  );
  const activeDeliveries = allDeliveries.filter((delivery) => isActiveDeliveryStatus(delivery.status));
  const awaitingAssignment = allDeliveries.filter(
    (delivery) => delivery.status === 'PENDING_ASSIGNMENT',
  );
  const activeOrders = allOrders.filter(
    (order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'REJECTED',
  );
  const deliveryRows = buildAdminDeliveryRows(allDeliveries, allOrders, allDrivers);
  const recentOrders = [...allOrders]
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        eyebrow="Platform operations"
        title="Control room"
        description="Approve accounts, watch delivery capacity and keep the order queue moving. Drivers are platform-owned; assignment is handled here, never by restaurants."
        actions={
          <ButtonLink to={ROUTES.adminDeliveries} size="sm" variant="secondary">
            Open delivery board
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Pending approvals"
          value={pendingAccounts.length}
          hint="Owners and drivers waiting on a decision"
          icon={<UserCheck aria-hidden="true" className="h-4 w-4" />}
          tone={pendingAccounts.length ? 'warning' : 'default'}
        />
        <StatCard
          label="Active deliveries"
          value={activeDeliveries.length}
          hint="Assigned, picked up or on the way"
          icon={<Truck aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting a driver"
          value={awaitingAssignment.length}
          hint="Returned to PENDING_ASSIGNMENT"
          icon={<PackageSearch aria-hidden="true" className="h-4 w-4" />}
          tone={awaitingAssignment.length ? 'danger' : 'default'}
        />
        <StatCard
          label="Orders in progress"
          value={activeOrders.length}
          hint="Across every restaurant"
          icon={<ShoppingBag aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Available drivers"
          value={availableDrivers.length}
          hint={`${approvedDrivers.length} approved drivers on the platform`}
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Completed order value"
          value={formatCurrency(completedRevenue(allOrders))}
          hint="Sample figure from completed orders"
          icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel
          eyebrow="Account queue"
          title="Pending approvals"
          description="Owner and driver applications waiting for review."
          action={
            <ButtonLink to={ROUTES.adminAccounts} variant="ghost" size="sm">
              Review all
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </ButtonLink>
          }
        >
          {pendingAccounts.length ? (
            <ul className="divide-y divide-olive-900/8">
              {pendingAccounts.slice(0, 5).map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-medium text-olive-900">{account.fullName}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                      {roleLabels[account.role]} · applied {formatMemberSince(account.memberSince)}
                    </p>
                  </div>
                  <StatusBadge status={account.accountStatus} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.8125rem] text-olive-500">No applications are waiting. Everything is reviewed.</p>
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="Capacity"
          title="Driver availability"
          description="Only AVAILABLE drivers without an active delivery can be assigned."
          action={
            <ButtonLink to={ROUTES.adminDrivers} variant="ghost" size="sm">
              Manage drivers
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </ButtonLink>
          }
        >
          {approvedDrivers.length ? (
            <ul className="divide-y divide-olive-900/8">
              {approvedDrivers.slice(0, 5).map((driver) => (
                <li key={driver.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-medium text-olive-900">{driver.name}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                      {driver.serviceArea ?? 'Service area not set'} · {driver.activeDeliveryId ? 'On delivery' : 'No active delivery'}
                    </p>
                  </div>
                  <StatusBadge status={driver.availability} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.8125rem] text-olive-500">No approved drivers are on the platform yet.</p>
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="Delivery queue"
          title="Awaiting assignment"
          description="Deliveries released by a driver or waiting for a first assignment."
          action={
            <ButtonLink to={ROUTES.adminDeliveries} variant="ghost" size="sm">
              Assign drivers
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </ButtonLink>
          }
        >
          {awaitingAssignment.length ? (
            <ul className="divide-y divide-olive-900/8">
              {deliveryRows
                .filter((row) => row.delivery.status === 'PENDING_ASSIGNMENT')
                .slice(0, 5)
                .map(({ delivery, order: deliveryOrder }) => (
                  <li key={delivery.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium text-olive-900">
                        {deliveryOrder?.code ?? delivery.id}
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                        {deliveryOrder?.restaurantName ?? 'Savora restaurant'} ·{' '}
                        {deliveryOrder
                          ? `${deliveryOrder.items.reduce((sum, item) => sum + item.quantity, 0)} ${pluralise(
                              deliveryOrder.items.reduce((sum, item) => sum + item.quantity, 0),
                              'item',
                            )}`
                          : 'Order details pending'}
                      </p>
                    </div>
                    <StatusBadge status={delivery.status} />
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-[0.8125rem] text-olive-500">Every active delivery has a driver assigned.</p>
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="Order flow"
          title="Recent orders"
          description="Read-only snapshot; order completion comes from successful delivery."
          action={
            <ButtonLink to={ROUTES.adminOrders} variant="ghost" size="sm">
              All orders
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </ButtonLink>
          }
          bodyClassName="px-0 py-0"
        >
          {recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[0.8125rem]">
                <thead className="border-b border-olive-900/10 bg-ivory-50/70 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Order</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Placed</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive-900/8">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-3">
                        <Link
                          to={ROUTES.adminOrders}
                          className="font-medium text-olive-900 underline-offset-4 hover:text-terracotta-600 hover:underline"
                        >
                          {order.code}
                        </Link>
                        <p className="mt-0.5 text-[0.625rem] text-olive-500">{order.restaurantName}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[0.6875rem] text-olive-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 aria-hidden="true" className="h-3 w-3" />
                          {formatDay(order.placedAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-6 text-[0.8125rem] text-olive-500">No orders have been placed yet.</p>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
