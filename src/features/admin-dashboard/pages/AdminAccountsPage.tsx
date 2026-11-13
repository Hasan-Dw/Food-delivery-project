import { useMemo, useState } from 'react';
import { Search, ShieldCheck, UserCheck, Users, UserX } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import type { AccountStatus, User, UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel, FilterTabs } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge, accountStatusLabel } from '@/features/dashboard/components/StatusBadge';
import { AdminAccountStatusDialog } from '../components/AdminAccountStatusDialog';
import { useAdminAccounts, useUpdateAccountStatus } from '../hooks/useAdminDashboard';
import { useToast } from '@/stores/toast-store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { roleLabels } from '@/lib/permissions';
import { formatDate, formatMemberSince } from '@/lib/format';

type StatusFilter = AccountStatus | 'ALL';
type RoleFilter = UserRole | 'ALL';

const roleOptions = [
  { value: 'ALL', label: 'All roles' },
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'RESTAURANT_OWNER', label: 'Restaurant owners' },
  { value: 'DRIVER', label: 'Drivers' },
  { value: 'ADMIN', label: 'Administrators' },
];

export default function AdminAccountsPage() {
  useDocumentTitle('Accounts');
  const { user } = useAuth();
  const accounts = useAdminAccounts();
  const updateStatus = useUpdateAccountStatus();
  const notify = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ account: User; nextStatus: AccountStatus } | null>(null);

  const allAccounts = useMemo(() => accounts.data ?? [], [accounts.data]);
  const counts = {
    ALL: allAccounts.length,
    PENDING_APPROVAL: allAccounts.filter((account) => account.accountStatus === 'PENDING_APPROVAL').length,
    APPROVED: allAccounts.filter((account) => account.accountStatus === 'APPROVED').length,
    REJECTED: allAccounts.filter((account) => account.accountStatus === 'REJECTED').length,
    SUSPENDED: allAccounts.filter((account) => account.accountStatus === 'SUSPENDED').length,
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allAccounts.filter((account) => {
      if (statusFilter !== 'ALL' && account.accountStatus !== statusFilter) return false;
      if (roleFilter !== 'ALL' && account.role !== roleFilter) return false;
      if (query) {
        const haystack = `${account.fullName} ${account.email}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [allAccounts, roleFilter, search, statusFilter]);

  if (accounts.isLoading) return <PageLoader label="Loading platform accounts…" />;

  if (accounts.isError) {
    return (
      <ErrorState
        title="Accounts could not be loaded"
        description={getErrorMessage(accounts.error)}
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void accounts.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const requestChange = (account: User, nextStatus: AccountStatus) => {
    setDialog({ account, nextStatus });
  };

  const submitChange = (reason?: string) => {
    if (!dialog) return;
    updateStatus.mutate(
      { userId: dialog.account.id, status: dialog.nextStatus, reason, actorId: user?.id ?? null },
      {
        onSuccess: (updated) => {
          notify({
            tone: 'success',
            title: `${updated.fullName} is now ${accountStatusLabel(updated.accountStatus).toLowerCase()}`,
            description: reason ? `Reason recorded: ${reason}` : 'The account status was updated.',
          });
          setDialog(null);
        },
        onError: (error) => {
          notify({ tone: 'error', title: 'Could not update account', description: getErrorMessage(error) });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Access control"
        title="Accounts"
        description="Approve, reject, suspend and reinstate restaurant owners and drivers. Administrator accounts are intentionally locked from this screen."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="All accounts"
          value={counts.ALL}
          hint="Every role in the directory"
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard
          label="Pending approval"
          value={counts.PENDING_APPROVAL}
          hint="Waiting for an operations decision"
          icon={<UserCheck aria-hidden="true" className="h-4 w-4" />}
          tone={counts.PENDING_APPROVAL ? 'warning' : 'default'}
        />
        <StatCard
          label="Approved"
          value={counts.APPROVED}
          hint="Active accounts"
          icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Suspended or rejected"
          value={counts.SUSPENDED + counts.REJECTED}
          hint={`${counts.SUSPENDED} suspended · ${counts.REJECTED} rejected`}
          icon={<UserX aria-hidden="true" className="h-4 w-4" />}
          tone={counts.SUSPENDED + counts.REJECTED ? 'danger' : 'default'}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: 'All', count: counts.ALL },
            { value: 'PENDING_APPROVAL', label: 'Pending', count: counts.PENDING_APPROVAL },
            { value: 'APPROVED', label: 'Approved', count: counts.APPROVED },
            { value: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
            { value: 'SUSPENDED', label: 'Suspended', count: counts.SUSPENDED },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            aria-label="Search accounts"
            placeholder="Search name or email"
            value={search}
            leading={<Search aria-hidden="true" className="h-4 w-4" />}
            className="h-10 sm:w-60"
            containerClassName="space-y-0"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            options={roleOptions}
            className="h-10 sm:w-48"
            containerClassName="space-y-0"
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
          />
        </div>
      </div>

      <DashboardPanel bodyClassName="px-0 py-0">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[52rem] w-full text-left text-[0.8125rem]">
              <thead className="border-b border-olive-900/10 bg-ivory-50/70 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Account</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Joined</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-900/8">
                {filtered.map((account) => (
                  <tr key={account.id} className="align-top transition hover:bg-ivory-50/60">
                    <td className="px-5 py-4">
                      <p className="font-medium text-olive-900">{account.fullName}</p>
                      <p className="mt-0.5 text-[0.6875rem] text-olive-500">{account.email}</p>
                      {account.restaurantId ? (
                        <p className="mt-0.5 text-[0.625rem] text-olive-500">Restaurant {account.restaurantId}</p>
                      ) : account.driverId ? (
                        <p className="mt-0.5 text-[0.625rem] text-olive-500">Driver {account.driverId}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-olive-600">{roleLabels[account.role]}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={account.accountStatus} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[0.75rem] text-olive-500">
                      {formatDate(account.memberSince)}
                      <p className="mt-0.5 text-[0.625rem] text-olive-500">
                        Member since {formatMemberSince(account.memberSince)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <AccountActions account={account} onChange={requestChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No accounts match these filters"
            description="Clear the search or choose a different role and status."
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

function AccountActions({
  account,
  onChange,
}: {
  account: User;
  onChange: (account: User, status: AccountStatus) => void;
}) {
  if (account.role === 'ADMIN') {
    return <span className="text-[0.6875rem] text-olive-500">Administrator accounts are locked</span>;
  }

  if (account.accountStatus === 'PENDING_APPROVAL') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange(account, 'APPROVED')}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={() => onChange(account, 'REJECTED')}>
          Reject
        </Button>
      </div>
    );
  }

  if (account.accountStatus === 'APPROVED') {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => onChange(account, 'SUSPENDED')}>
        Suspend
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={() => onChange(account, 'APPROVED')}>
      Reactivate
    </Button>
  );
}
