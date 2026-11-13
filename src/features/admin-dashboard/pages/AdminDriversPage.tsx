import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Car, Search, Star, Truck, UserCheck, Users } from 'lucide-react';
import type { AccountStatus, DriverAvailability } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel, FilterTabs } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { AdminAccountStatusDialog } from '../components/AdminAccountStatusDialog';
import {
  useAdminAccounts,
  useAdminDrivers,
  useUpdateAccountStatus,
} from '../hooks/useAdminDashboard';
import { useToast } from '@/stores/toast-store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { canAssignDelivery } from '@/lib/permissions';
import { formatCurrency, formatDate, formatRating } from '@/lib/format';
import { ROUTES } from '@/config/routes';
import type { Driver, User } from '@/types';

type StatusFilter = AccountStatus | 'ALL';
type AvailabilityFilter = DriverAvailability | 'ALL';

const vehicleIcons = {
  bike: Bike,
  scooter: Truck,
  car: Car,
} as const;

export default function AdminDriversPage() {
  useDocumentTitle('Drivers');
  const drivers = useAdminDrivers();
  const accounts = useAdminAccounts();
  const updateStatus = useUpdateAccountStatus();
  const notify = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('ALL');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ account: User; nextStatus: AccountStatus } | null>(null);

  const allDrivers = useMemo(() => drivers.data ?? [], [drivers.data]);
  const allAccounts = useMemo(() => accounts.data ?? [], [accounts.data]);

  const accountForDriver = (driver: Driver): User | undefined =>
    allAccounts.find((account) => account.id === driver.userId);

  const counts = {
    ALL: allDrivers.length,
    APPROVED: allDrivers.filter((driver) => driver.accountStatus === 'APPROVED').length,
    PENDING_APPROVAL: allDrivers.filter((driver) => driver.accountStatus === 'PENDING_APPROVAL').length,
    SUSPENDED: allDrivers.filter((driver) => driver.accountStatus === 'SUSPENDED').length,
    REJECTED: allDrivers.filter((driver) => driver.accountStatus === 'REJECTED').length,
  };

  const available = allDrivers.filter((driver) => canAssignDelivery(driver));
  const onDelivery = allDrivers.filter((driver) => driver.availability === 'ON_DELIVERY');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allDrivers.filter((driver) => {
      if (statusFilter !== 'ALL' && driver.accountStatus !== statusFilter) return false;
      if (availabilityFilter !== 'ALL' && driver.availability !== availabilityFilter) return false;
      if (query) {
        const haystack = `${driver.name} ${driver.phone} ${driver.serviceArea ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [allDrivers, availabilityFilter, search, statusFilter]);

  if (drivers.isLoading || accounts.isLoading) return <PageLoader label="Loading the driver directory…" />;

  if (drivers.isError || accounts.isError) {
    return (
      <ErrorState
        title="Drivers could not be loaded"
        description={getErrorMessage(drivers.error ?? accounts.error)}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void drivers.refetch();
              void accounts.refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const submitChange = (reason?: string) => {
    if (!dialog) return;
    updateStatus.mutate(
      { userId: dialog.account.id, status: dialog.nextStatus, reason },
      {
        onSuccess: (updated) => {
          notify({
            tone: 'success',
            title: `${updated.fullName} is now ${updated.accountStatus.replace('_', ' ').toLowerCase()}`,
            description:
              dialog.nextStatus === 'SUSPENDED' || dialog.nextStatus === 'REJECTED'
                ? 'Any active delivery was released back to PENDING_ASSIGNMENT.'
                : 'The driver profile and linked account were updated together.',
          });
          setDialog(null);
        },
        onError: (error) => {
          notify({ tone: 'error', title: 'Could not update driver', description: getErrorMessage(error) });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Platform fleet"
        title="Drivers"
        description="Drivers belong to Savora, not to a restaurant. Approval, suspension and capacity are managed centrally."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Drivers"
          value={counts.ALL}
          hint="Every profile in the directory"
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Approved"
          value={counts.APPROVED}
          hint="Eligible to receive assignments"
          icon={<UserCheck aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Ready to assign"
          value={available.length}
          hint="Approved, online and no active delivery"
          icon={<Truck aria-hidden="true" className="h-4 w-4" />}
          tone={available.length ? 'success' : 'warning'}
        />
        <StatCard
          label="On delivery"
          value={onDelivery.length}
          hint="One active delivery per driver"
          icon={<Truck aria-hidden="true" className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: 'All', count: counts.ALL },
            { value: 'APPROVED', label: 'Approved', count: counts.APPROVED },
            { value: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL },
            { value: 'SUSPENDED', label: 'Suspended', count: counts.SUSPENDED },
            { value: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            aria-label="Search drivers"
            placeholder="Search name, phone or area"
            value={search}
            leading={<Search aria-hidden="true" className="h-4 w-4" />}
            className="h-10 sm:w-64"
            containerClassName="space-y-0"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            aria-label="Filter by availability"
            value={availabilityFilter}
            options={[
              { value: 'ALL', label: 'All availability' },
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'ON_DELIVERY', label: 'On delivery' },
              { value: 'OFFLINE', label: 'Offline' },
            ]}
            className="h-10 sm:w-52"
            containerClassName="space-y-0"
            onChange={(event) => setAvailabilityFilter(event.target.value as AvailabilityFilter)}
          />
        </div>
      </div>

      <DashboardPanel bodyClassName="px-0 py-0">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[56rem] w-full text-left text-[0.8125rem]">
              <thead className="border-b border-olive-900/10 bg-ivory-50/70 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Driver</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Vehicle</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Availability</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Delivery</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-900/8">
                {filtered.map((driver) => {
                  const account = accountForDriver(driver);
                  const VehicleIcon = vehicleIcons[driver.vehicle];
                  return (
                    <tr key={driver.id} className="align-top transition hover:bg-ivory-50/60">
                      <td className="px-5 py-4">
                        <p className="font-medium text-olive-900">{driver.name}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-olive-500">{driver.phone}</p>
                        <p className="mt-0.5 text-[0.625rem] text-olive-500">
                          {driver.serviceArea ?? 'Service area not set'} · joined {formatDate(driver.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-olive-600">
                        <span className="inline-flex items-center gap-1.5 capitalize">
                          <VehicleIcon aria-hidden="true" className="h-3.5 w-3.5 text-olive-500" />
                          {driver.vehicle}
                        </span>
                        <p className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] text-olive-500">
                          <Star aria-hidden="true" className="h-3 w-3 text-gold-600" />
                          {formatRating(driver.rating)} · {driver.completedDeliveries} deliveries
                        </p>
                        <p className="mt-0.5 text-[0.625rem] text-olive-500">
                          {formatCurrency(driver.totalEarnings)} sample earnings
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={driver.accountStatus} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={driver.availability} />
                      </td>
                      <td className="px-5 py-4 text-[0.75rem] text-olive-500">
                        {driver.activeDeliveryId ? (
                          <Link
                            to={ROUTES.adminDeliveries}
                            className="font-medium text-terracotta-600 underline-offset-4 hover:underline"
                          >
                            {driver.activeDeliveryId}
                          </Link>
                        ) : (
                          'No active delivery'
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {!account ? (
                          <span className="text-[0.6875rem] text-danger">Linked account missing</span>
                        ) : account.role === 'ADMIN' ? (
                          <span className="text-[0.6875rem] text-olive-500">Locked</span>
                        ) : (
                          <DriverActions
                            account={account}
                            onChange={(nextStatus) => setDialog({ account, nextStatus })}
                          />
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
            icon={<Truck className="h-6 w-6" />}
            title="No drivers match these filters"
            description="Clear the search or choose another status and availability."
            className="border-0 bg-transparent"
          />
        )}
      </DashboardPanel>

      <AdminAccountStatusDialog
        open={Boolean(dialog)}
        account={dialog?.account ?? null}
        nextStatus={dialog?.nextStatus ?? null}
        isLoading={updateStatus.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={submitChange}
      />
    </div>
  );
}

function DriverActions({
  account,
  onChange,
}: {
  account: User;
  onChange: (status: AccountStatus) => void;
}) {
  if (account.accountStatus === 'PENDING_APPROVAL') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange('APPROVED')}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={() => onChange('REJECTED')}>
          Reject
        </Button>
      </div>
    );
  }

  if (account.accountStatus === 'APPROVED') {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => onChange('SUSPENDED')}>
        Suspend
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={() => onChange('APPROVED')}>
      Reactivate
    </Button>
  );
}
