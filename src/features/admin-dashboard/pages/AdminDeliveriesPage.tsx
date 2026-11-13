import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  Truck,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import type { Delivery, DeliveryAssignmentAction, DeliveryStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel, FilterTabs } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { AdminAssignmentDialog } from '../components/AdminAssignmentDialog';
import {
  buildAdminDeliveryRows,
  useAdminDeliveries,
  useAssignDelivery,
  useAutoAssignDelivery,
  useReassignDelivery,
  useUnassignDelivery,
  type AdminDeliveryRow,
} from '../hooks/useAdminDashboard';
import {
  assignmentMeta,
  buildDeliveryOperationStats,
  matchesAssignmentFilter,
  type AssignmentFilter,
} from '../lib/delivery-operations';
import { useToast } from '@/stores/toast-store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { actorFromUser, canManageDeliveryAssignment } from '@/lib/permissions';
import { requiresExceptionalHandover } from '@/lib/order-lifecycle';
import { getErrorMessage } from '@/services/api/errors';
import { formatCurrency, formatDay, formatEta, formatTime } from '@/lib/format';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';

type StatusFilter = DeliveryStatus | 'ALL';

const PAGE_SIZE = 8;

const assignmentFilterOptions: Array<{ value: AssignmentFilter; label: string }> = [
  { value: 'ALL', label: 'All assignment types' },
  { value: 'AUTOMATIC', label: 'Automatic' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
];

const autoStatusCopy: Record<string, string> = {
  NO_ELIGIBLE_DRIVER: 'No eligible driver',
  EXHAUSTED: 'Retry limit reached',
  COOLDOWN: 'Cooling down',
  SKIPPED: 'Not applicable',
  ASSIGNED: 'Assigned',
};

export default function AdminDeliveriesPage() {
  useDocumentTitle('Delivery operations');
  const { user } = useAuth();
  const { deliveries, orders, drivers, restaurants } = useAdminDeliveries();
  const assign = useAssignDelivery();
  const autoAssign = useAutoAssignDelivery();
  const unassign = useUnassignDelivery();
  const reassign = useReassignDelivery();
  const notify = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: DeliveryAssignmentAction; delivery: Delivery } | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  /**
   * Derived on every render rather than memoised: demo services mutate their
   * stored objects in place, so a memo keyed on the same array reference can
   * retain a driver that was just unassigned. A real HTTP adapter returns new
   * arrays and would be safe either way.
   */
  const rows = buildAdminDeliveryRows(
    deliveries.data ?? [],
    orders.data ?? [],
    drivers.data ?? [],
    restaurants.data ?? [],
  );

  const stats = buildDeliveryOperationStats(deliveries.data ?? [], drivers.data ?? []);

  const statusCounts = {
    ALL: rows.length,
    PENDING_ASSIGNMENT: rows.filter((row) => row.delivery.status === 'PENDING_ASSIGNMENT').length,
    ASSIGNED: rows.filter((row) => row.delivery.status === 'ASSIGNED').length,
    PICKED_UP: rows.filter((row) => row.delivery.status === 'PICKED_UP').length,
    ON_THE_WAY: rows.filter((row) => row.delivery.status === 'ON_THE_WAY').length,
    DELIVERED: rows.filter((row) => row.delivery.status === 'DELIVERED').length,
    CANCELLED: rows.filter((row) => row.delivery.status === 'CANCELLED').length,
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.delivery.status !== statusFilter) return false;
      if (!matchesAssignmentFilter(row.delivery, assignmentFilter)) return false;
      if (!query) return true;
      const haystack = [
        row.order?.code,
        row.order?.restaurantName,
        row.order?.customerName,
        row.driver?.name,
        row.delivery.id,
        row.delivery.orderId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [assignmentFilter, rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (
    deliveries.isLoading ||
    orders.isLoading ||
    drivers.isLoading ||
    restaurants.isLoading
  ) {
    return <PageLoader label="Loading the delivery board…" />;
  }

  if (deliveries.isError || orders.isError || drivers.isError || restaurants.isError) {
    return (
      <ErrorState
        title="Delivery operations could not be loaded"
        description={getErrorMessage(
          deliveries.error ?? orders.error ?? drivers.error ?? restaurants.error,
        )}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void deliveries.refetch();
              void orders.refetch();
              void drivers.refetch();
              void restaurants.refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const actor = actorFromUser(user);
  const dialogRow = dialog ? rows.find((row) => row.delivery.id === dialog.delivery.id) : undefined;
  const isMutating =
    assign.isPending || unassign.isPending || reassign.isPending || autoAssign.isPending;

  const closeDialog = () => {
    if (isMutating) return;
    setDialog(null);
  };

  const refreshAll = () => {
    void deliveries.refetch();
    void orders.refetch();
    void drivers.refetch();
  };

  const handleAssignment = ({ driverId, reason }: { driverId?: string; reason: string }) => {
    if (!dialog) return;
    const deliveryId = dialog.delivery.id;
    const actorId = actor?.userId ?? null;

    const onError = (error: unknown) => {
      notify({
        tone: 'error',
        title: 'Could not update assignment',
        description: getErrorMessage(error),
      });
    };

    if (dialog.mode === 'ASSIGN' && driverId) {
      assign.mutate(
        { deliveryId, driverId, actorId },
        {
          onSuccess: () => {
            notify({
              tone: 'success',
              title: 'Driver assigned',
              description: 'The delivery left the assignment pool.',
            });
            setDialog(null);
          },
          onError,
        },
      );
      return;
    }

    if (dialog.mode === 'UNASSIGN') {
      unassign.mutate(
        { deliveryId, reason, actorId },
        {
          onSuccess: (delivery) => {
            notify({
              tone: 'success',
              title: 'Delivery unassigned',
              description: delivery.driverId
                ? 'The previous driver was released and an automatic replacement was assigned.'
                : 'The driver was released and the delivery returned to PENDING_ASSIGNMENT. The order remains active; no replacement driver was found automatically.',
            });
            setDialog(null);
          },
          onError,
        },
      );
      return;
    }

    if (dialog.mode === 'REASSIGN' && driverId) {
      reassign.mutate(
        { deliveryId, driverId, reason, actorId },
        {
          onSuccess: () => {
            notify({
              tone: 'success',
              title: 'Delivery reassigned',
              description: 'The previous driver was released and the new driver assigned.',
            });
            setDialog(null);
          },
          onError,
        },
      );
    }
  };

  const handleAutoRetry = (delivery: Delivery) => {
    if (!actor) return;
    setRetryingId(delivery.id);
    autoAssign.mutate(
      { deliveryId: delivery.id, actorId: actor.userId },
      {
        onSuccess: (result) => {
          if (result.assigned) {
            notify({
              tone: 'success',
              title: 'Driver assigned automatically',
              description: `${result.driverName ?? 'A driver'} is now assigned to ${delivery.id}.`,
            });
          } else {
            notify({
              tone: 'info',
              title: autoStatusCopy[result.status] ?? 'No automatic assignment',
              description: result.reason ?? 'The delivery stays in PENDING_ASSIGNMENT.',
            });
          }
        },
        onError: (error) => {
          notify({
            tone: 'error',
            title: 'Automatic assignment failed',
            description: getErrorMessage(error),
          });
        },
        onSettled: () => setRetryingId(null),
      },
    );
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Platform delivery system"
        title="Delivery operations"
        description="Monitor driver capacity and control delivery assignments. Unassigning returns a delivery to the assignment pool without cancelling the customer’s order."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshAll}
            isLoading={deliveries.isFetching}
            iconLeft={<RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Available drivers"
          value={stats.availableDrivers}
          hint="Approved, available and without an active delivery"
          icon={<UserCheck aria-hidden="true" className="h-4 w-4" />}
          tone={stats.availableDrivers ? 'success' : 'warning'}
        />
        <StatCard
          label="Busy drivers"
          value={stats.busyDrivers}
          hint="Currently on a delivery"
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Unassigned deliveries"
          value={stats.unassignedDeliveries}
          hint={
            stats.awaitingRetry
              ? `${stats.awaitingRetry} awaiting an explicit retry`
              : 'Waiting for a driver'
          }
          icon={<PackageSearch aria-hidden="true" className="h-4 w-4" />}
          tone={stats.unassignedDeliveries ? 'danger' : 'default'}
        />
        <StatCard
          label="Active deliveries"
          value={stats.activeDeliveries}
          hint="Assigned through to on the way"
          icon={<Truck aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Total deliveries"
          value={stats.totalDeliveries}
          hint="All delivery records in this workspace"
          icon={<PackageCheck aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Auto-assignment success"
          value={
            stats.autoSuccessRate === null ? '—' : `${Math.round(stats.autoSuccessRate * 100)}%`
          }
          hint={
            stats.autoSuccessRate === null
              ? 'Insufficient data — no automatic attempts recorded yet'
              : `${stats.automaticSuccesses} assigned from ${stats.automaticAttempts} automatic attempts`
          }
          icon={<Bot aria-hidden="true" className="h-4 w-4" />}
          tone={stats.autoSuccessRate === null ? 'default' : 'success'}
        />
      </div>

      <div className="space-y-3">
        <FilterTabs
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'All', count: statusCounts.ALL },
            { value: 'PENDING_ASSIGNMENT', label: 'Awaiting', count: statusCounts.PENDING_ASSIGNMENT },
            { value: 'ASSIGNED', label: 'Assigned', count: statusCounts.ASSIGNED },
            { value: 'PICKED_UP', label: 'Picked up', count: statusCounts.PICKED_UP },
            { value: 'ON_THE_WAY', label: 'On the way', count: statusCounts.ON_THE_WAY },
            { value: 'DELIVERED', label: 'Delivered', count: statusCounts.DELIVERED },
            { value: 'CANCELLED', label: 'Cancelled', count: statusCounts.CANCELLED },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="assignment-filter" className="sr-only">
              Filter by assignment type
            </label>
            <select
              id="assignment-filter"
              value={assignmentFilter}
              onChange={(event) => {
                setAssignmentFilter(event.target.value as AssignmentFilter);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-olive-900/15 bg-cream px-3 text-[0.8125rem] text-ink transition hover:border-olive-900/25 focus:border-olive-600 focus:outline-none focus:ring-4 focus:ring-olive-600/10"
            >
              {assignmentFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-[0.6875rem] text-olive-500">
              {filtered.length} {filtered.length === 1 ? 'delivery' : 'deliveries'}
            </span>
          </div>

          <label className="w-full sm:w-80" htmlFor="delivery-search">
            <span className="sr-only">Search deliveries</span>
            <input
              id="delivery-search"
              type="search"
              placeholder="Search order, driver, restaurant or delivery ID"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-olive-900/15 bg-cream px-4 text-[0.8125rem] text-ink transition hover:border-olive-900/25 focus:border-olive-600 focus:outline-none focus:ring-4 focus:ring-olive-600/10"
            />
          </label>
        </div>
      </div>

      <DashboardPanel bodyClassName="px-0 py-0">
        {pageRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[68rem] text-left text-[0.8125rem]">
                <thead className="border-b border-olive-900/10 bg-ivory-50/70 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Delivery / order</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Restaurant</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Driver</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Assignment</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive-900/8">
                  {pageRows.map((row) => {
                    const expanded = expandedId === row.delivery.id;
                    const canAssign = Boolean(
                      actor && canManageDeliveryAssignment(actor, row.delivery, 'ASSIGN'),
                    );
                    const canUnassign = Boolean(
                      actor && canManageDeliveryAssignment(actor, row.delivery, 'UNASSIGN'),
                    );
                    const canReassign = Boolean(
                      actor && canManageDeliveryAssignment(actor, row.delivery, 'REASSIGN'),
                    );
                    const handoverRequired = requiresExceptionalHandover(row.delivery.status);
                    const meta = assignmentMeta(row.delivery);
                    const auto = row.delivery.autoAssignment;

                    return (
                      <Fragment key={row.delivery.id}>
                        <tr className="align-top transition hover:bg-ivory-50/60">
                        <td className="px-5 py-4">
                          <Link
                            to={ROUTES.adminOrders}
                            className="font-medium text-olive-900 underline-offset-4 hover:text-terracotta-600 hover:underline"
                          >
                            {row.order?.code ?? row.delivery.orderId}
                          </Link>
                          <p className="mt-0.5 font-mono text-[0.6875rem] text-olive-500">
                            {row.delivery.id}
                          </p>
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : row.delivery.id)}
                            className="mt-1 inline-flex items-center gap-1 text-[0.625rem] font-medium text-olive-500 transition hover:text-olive-900"
                            aria-expanded={expanded}
                          >
                            {expanded ? (
                              <ChevronUp aria-hidden="true" className="h-3 w-3" />
                            ) : (
                              <ChevronDown aria-hidden="true" className="h-3 w-3" />
                            )}
                            {expanded ? 'Hide audit' : 'Audit trail'}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-olive-700">
                            {row.restaurant?.name ?? row.order?.restaurantName ?? 'Savora restaurant'}
                          </p>
                          <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                            {row.restaurant?.address.city ?? 'Service area unknown'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-olive-700">{row.order?.customerName ?? 'Customer'}</p>
                          <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                            {row.order ? formatCurrency(row.order.totals.total) : 'Value pending'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {row.driver ? (
                            <>
                              <p className="inline-flex items-center gap-1.5 text-olive-800">
                                <UserRound aria-hidden="true" className="h-3.5 w-3.5 text-olive-500" />
                                {row.driver.name}
                              </p>
                              <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                                {row.driver.vehicle} · {row.driver.serviceArea ?? 'area not set'}
                              </p>
                            </>
                          ) : (
                            <>
                              <span className="text-[0.75rem] text-olive-500">Unassigned</span>
                              {auto?.lastAttemptAt ? (
                                <p className="mt-0.5 text-[0.625rem] text-olive-500">
                                  Auto attempt {auto.attempts} ·{' '}
                                  {autoStatusCopy[auto.status] ?? auto.status}
                                </p>
                              ) : null}
                            </>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={row.delivery.status} />
                          {auto?.status === 'NO_ELIGIBLE_DRIVER' &&
                          row.delivery.status === 'PENDING_ASSIGNMENT' ? (
                            <p className="mt-1 flex items-center gap-1 text-[0.625rem] text-gold-700">
                              <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                              Needs a driver
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-[0.75rem]">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em]',
                              meta.type === 'AUTOMATIC'
                                ? 'bg-success/10 text-success'
                                : meta.type === 'MANUAL'
                                  ? 'bg-terracotta-50 text-terracotta-700'
                                  : 'bg-olive-900/6 text-olive-600',
                            )}
                          >
                            {meta.label}
                          </span>
                          <p className="mt-1 text-[0.625rem] text-olive-500">
                            {meta.at
                              ? formatDay(meta.at)
                              : row.delivery.assignedAt
                                ? formatDay(row.delivery.assignedAt)
                                : 'No assignment time'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {handoverRequired ? (
                            <p className="inline-flex max-w-[13rem] items-start gap-1.5 text-[0.6875rem] leading-relaxed text-danger">
                              <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              In transit — exceptional handover required
                            </p>
                          ) : canAssign || canUnassign || canReassign ? (
                            <div className="flex flex-wrap gap-2">
                              {canAssign ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setDialog({ mode: 'ASSIGN', delivery: row.delivery })}
                                >
                                  Assign
                                </Button>
                              ) : null}
                              {row.delivery.status === 'PENDING_ASSIGNMENT' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  isLoading={retryingId === row.delivery.id}
                                  disabled={autoAssign.isPending}
                                  onClick={() => handleAutoRetry(row.delivery)}
                                >
                                  Retry auto
                                </Button>
                              ) : null}
                              {canReassign ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDialog({ mode: 'REASSIGN', delivery: row.delivery })}
                                >
                                  Reassign
                                </Button>
                              ) : null}
                              {canUnassign ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setDialog({ mode: 'UNASSIGN', delivery: row.delivery })}
                                >
                                  Unassign
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[0.6875rem] text-olive-500">No assignment action</span>
                          )}
                        </td>
                      </tr>

                      {expanded ? (
                        <tr className="bg-ivory-50/70">
                          <td colSpan={7} className="px-5 py-4">
                            <AuditPanel row={row} />
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-olive-900/10 px-5 py-3 text-[0.75rem] text-olive-500">
              <p>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-1 text-[0.6875rem]">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Truck className="h-6 w-6" />}
            title="No deliveries match these filters"
            description="Clear the search or choose another delivery status or assignment type."
            className="border-0 bg-transparent"
          />
        )}
      </DashboardPanel>

      <AdminAssignmentDialog
        open={Boolean(dialog)}
        mode={dialog?.mode ?? null}
        delivery={dialog?.delivery ?? null}
        order={dialogRow?.order}
        currentDriver={dialogRow?.driver}
        restaurantCity={dialogRow?.restaurant?.address.city}
        drivers={drivers.data ?? []}
        isLoading={isMutating}
        onCancel={closeDialog}
        onConfirm={handleAssignment}
      />
    </div>
  );
}

function AuditPanel({ row }: { row: AdminDeliveryRow }) {
  const history = row.delivery.assignmentHistory ?? [];
  const auto = row.delivery.autoAssignment;
  const handoverRequired = requiresExceptionalHandover(row.delivery.status);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
            Assignment history
          </p>
          <span className="text-[0.625rem] text-olive-500">Append-only</span>
        </div>

        {history.length ? (
          <ol className="mt-2 space-y-2">
            {[...history].reverse().map((event) => (
              <li key={event.id} className="rounded-xl border border-olive-900/10 bg-cream px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.75rem] font-medium text-olive-900">
                    {event.action === 'ASSIGNED'
                      ? `Assigned to ${event.driverName ?? 'a driver'}`
                      : event.action === 'UNASSIGNED'
                        ? `Unassigned${event.driverName ? ` from ${event.driverName}` : ''}`
                        : `Reassigned${event.previousDriverId ? ' from previous driver' : ''} to ${
                            event.driverName ?? 'a driver'
                          }`}
                  </p>
                  <span className="text-[0.625rem] text-olive-500">{formatDay(event.at)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.625rem]">
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-[0.06em]',
                      event.source === 'AUTOMATIC'
                        ? 'bg-success/10 text-success'
                        : 'bg-terracotta-50 text-terracotta-700',
                    )}
                  >
                    {event.source === 'AUTOMATIC' ? 'Automatic' : 'Manual'}
                  </span>
                  {event.previousDriverId ? (
                    <span className="font-mono text-olive-500">from {event.previousDriverId}</span>
                  ) : null}
                  {event.newDriverId ? (
                    <span className="font-mono text-olive-500">to {event.newDriverId}</span>
                  ) : null}
                  {event.adminId ? (
                    <span className="text-olive-500">Admin {event.adminId}</span>
                  ) : null}
                </div>
                {event.reason ? (
                  <p className="mt-1 text-[0.6875rem] leading-relaxed text-olive-500">
                    Reason: {event.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-[0.75rem] text-olive-500">
            No assignment history is recorded for this delivery yet.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-olive-900/10 bg-cream p-3.5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
            Automatic assignment
          </p>
          {auto ? (
            <dl className="mt-2 space-y-2 text-[0.75rem]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">Last outcome</dt>
                <dd className="text-right font-medium text-olive-800">
                  {autoStatusCopy[auto.status] ?? auto.status}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">Attempts</dt>
                <dd className="text-right font-medium text-olive-800">{auto.attempts} of 5</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">Trigger</dt>
                <dd className="text-right font-medium text-olive-800">
                  {auto.lastTrigger?.replaceAll('_', ' ').toLowerCase() ?? 'unknown'}
                </dd>
              </div>
              {auto.lastAttemptAt ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-olive-500">Last attempt</dt>
                  <dd className="text-right font-medium text-olive-800">
                    {formatTime(auto.lastAttemptAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-[0.75rem] text-olive-500">
              No automatic attempt has run for this delivery.
            </p>
          )}
          {auto?.reason ? (
            <p className="mt-2 border-t border-olive-900/10 pt-2 text-[0.625rem] leading-relaxed text-olive-500">
              {auto.reason}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-olive-900/10 bg-cream p-3.5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">Order state</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {row.order ? <StatusBadge status={row.order.status} /> : null}
            <StatusBadge status={row.delivery.status} />
          </div>
          <dl className="mt-3 space-y-2 text-[0.75rem]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-olive-500">Assigned</dt>
              <dd className="text-right font-medium text-olive-800">
                {row.delivery.assignedAt ? formatDay(row.delivery.assignedAt) : 'Never'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-olive-500">Picked up</dt>
              <dd className="text-right font-medium text-olive-800">
                {row.delivery.pickedUpAt ? formatDay(row.delivery.pickedUpAt) : 'Not yet'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-olive-500">Delivered / closed</dt>
              <dd className="text-right font-medium text-olive-800">
                {row.delivery.deliveredAt
                  ? formatDay(row.delivery.deliveredAt)
                  : row.delivery.cancelledAt
                    ? formatDay(row.delivery.cancelledAt)
                    : 'Not yet'}
              </dd>
            </div>
            {row.delivery.estimatedArrivalAt && !row.delivery.deliveredAt ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-olive-500">ETA</dt>
                <dd className="text-right font-medium text-olive-800">
                  {formatEta(
                    Math.max(
                      0,
                      Math.round(
                        (new Date(row.delivery.estimatedArrivalAt).getTime() - Date.now()) / 60_000,
                      ),
                    ),
                  )}
                </dd>
              </div>
            ) : null}
          </dl>

          {handoverRequired ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-danger/5 px-2.5 py-2 text-[0.625rem] leading-relaxed text-danger">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
              In transit. A safe custody handover is not modelled yet, so normal unassign/reassign is blocked.
            </p>
          ) : (
            <p className="mt-3 border-t border-olive-900/10 pt-2 text-[0.625rem] leading-relaxed text-olive-500">
              <Clock3 aria-hidden="true" className="mr-1 inline h-3 w-3" />
              Order completion is driven by delivery completion. No manual complete action exists for admins.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
