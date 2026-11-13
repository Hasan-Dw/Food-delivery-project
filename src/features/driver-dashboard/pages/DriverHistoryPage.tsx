import { useMemo, useState } from 'react';
import { CheckCircle2, History, XCircle } from 'lucide-react';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel, FilterTabs } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { StatusBadge } from '@/features/dashboard/components/StatusBadge';
import { useDriverHistory, useDriverProfile } from '../hooks/useDriverDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api/errors';
import { formatCurrency, formatDay, formatTime } from '@/lib/format';
import { ROUTES } from '@/config/routes';

type Filter = 'ALL' | 'DELIVERED' | 'CANCELLED';

export default function DriverHistoryPage() {
  useDocumentTitle('Delivery history');
  const profile = useDriverProfile();
  const history = useDriverHistory(profile.data?.id);
  const [filter, setFilter] = useState<Filter>('ALL');

  const rows = useMemo(() => {
    if (filter === 'ALL') return history.rows;
    return history.rows.filter((row) => row.delivery.status === filter);
  }, [filter, history.rows]);

  if (profile.isLoading) return <PageLoader label="Opening your delivery history…" />;

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

  if (history.deliveriesQuery.isError) {
    return (
      <ErrorState
        title="Delivery history could not be loaded"
        description={getErrorMessage(history.deliveriesQuery.error)}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void history.deliveriesQuery.refetch()}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const driver = profile.data;
  const delivered = history.rows.filter((row) => row.delivery.status === 'DELIVERED');
  const cancelled = history.rows.filter((row) => row.delivery.status === 'CANCELLED');
  const deliveredValue = delivered.reduce((sum, row) => sum + (row.order?.totals.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Completed work"
        title="Delivery history"
        description="Every delivery assigned to your profile that has finished, with its final order value."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Delivered"
          value={delivered.length}
          hint="Completed drops in this sample dataset"
          icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Cancelled"
          value={cancelled.length}
          hint="Deliveries cancelled before drop-off"
          icon={<XCircle aria-hidden="true" className="h-4 w-4" />}
          tone={cancelled.length ? 'danger' : 'default'}
        />
        <StatCard
          label="Order value delivered"
          value={formatCurrency(deliveredValue)}
          hint={`Lifetime sample earnings ${formatCurrency(driver.totalEarnings)}`}
          icon={<History aria-hidden="true" className="h-4 w-4" />}
        />
      </div>

      <FilterTabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'All finished', count: history.rows.length },
          { value: 'DELIVERED', label: 'Delivered', count: delivered.length },
          { value: 'CANCELLED', label: 'Cancelled', count: cancelled.length },
        ]}
      />

      <DashboardPanel bodyClassName="px-0 py-0">
        {history.deliveriesQuery.isLoading ? (
          <p className="px-5 py-8 text-[0.8125rem] text-olive-500">Loading delivery history…</p>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[48rem] w-full text-left text-[0.8125rem]">
              <thead className="border-b border-olive-900/10 bg-ivory-50/70 text-[0.625rem] uppercase tracking-[0.1em] text-olive-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Restaurant</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Finished</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Order value</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-900/8">
                {rows.map(({ delivery, order }) => (
                  <tr key={delivery.id} className="transition hover:bg-ivory-50/60">
                    <td className="px-5 py-4">
                      <p className="font-medium text-olive-900">{order?.code ?? delivery.orderId}</p>
                      <p className="mt-0.5 text-[0.6875rem] text-olive-500">{delivery.id}</p>
                    </td>
                    <td className="px-5 py-4 text-olive-600">{order?.restaurantName ?? 'Savora restaurant'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-[0.75rem] text-olive-500">
                      {delivery.deliveredAt ? formatDay(delivery.deliveredAt) : formatDay(delivery.updatedAt)}
                      <p className="mt-0.5 text-[0.625rem] text-olive-500">
                        {delivery.deliveredAt
                          ? formatTime(delivery.deliveredAt)
                          : formatTime(delivery.updatedAt)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-olive-800">
                      {order ? formatCurrency(order.totals.total) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={delivery.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title={filter === 'ALL' ? 'No finished deliveries yet' : 'Nothing in this filter'}
            description={
              filter === 'ALL'
                ? 'Completed and cancelled deliveries will appear here after your first assignment.'
                : 'Try another status to see more of your delivery history.'
            }
            className="border-0 bg-transparent"
          />
        )}
      </DashboardPanel>
    </div>
  );
}
