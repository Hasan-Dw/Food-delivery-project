import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { formatTime } from '@/lib/format';
import { getErrorMessage } from '@/services/api/errors';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AnalyticsRange } from '@/types';
import { useRestaurantAnalytics } from '../hooks/useRestaurantAnalytics';
import { AnalyticsDateFilter } from '../components/analytics/AnalyticsDateFilter';
import { AnalyticsOverview } from '../components/analytics/AnalyticsOverview';
import { MonthlySalesChart } from '../components/analytics/MonthlySalesChart';
import { OrderDistributionChart } from '../components/analytics/OrderDistributionChart';
import { OrderHealthPanel } from '../components/analytics/OrderHealthPanel';
import { PopularItemsPanel } from '../components/analytics/PopularItemsPanel';
import { RevenueProfitChart } from '../components/analytics/RevenueProfitChart';

function AnalyticsSkeleton() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Loading analytics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-olive-900/10 bg-cream p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-32" />
            <Skeleton className="mt-3 h-2.5 w-40" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)]">
        <div className="rounded-2xl border border-olive-900/10 bg-cream p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-6 h-[260px] w-full" />
        </div>
        <div className="rounded-2xl border border-olive-900/10 bg-cream p-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-6 h-[220px] w-full" />
        </div>
      </div>
      <div className="rounded-2xl border border-olive-900/10 bg-cream p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-[220px] w-full" />
      </div>
    </div>
  );
}

export default function RestaurantAnalyticsPage() {
  useDocumentTitle('Business analytics');
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const analytics = useRestaurantAnalytics(range);

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        eyebrow="Business analytics"
        title="Understand what your kitchen earns"
        description="Revenue comes from your completed orders only. Operating costs are illustrative mock assumptions, clearly separated from real order data."
        actions={
          <>
            <AnalyticsDateFilter value={range} onChange={setRange} disabled={analytics.isFetching} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void analytics.refetch()}
              isLoading={analytics.isFetching}
              aria-label="Refresh analytics"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      {analytics.isLoading ? (
        <AnalyticsSkeleton />
      ) : analytics.isError ? (
        <ErrorState
          title="We could not load your analytics"
          description={getErrorMessage(analytics.error)}
          action={
            <Button type="button" size="sm" onClick={() => void analytics.refetch()}>
              Try again
            </Button>
          }
        />
      ) : analytics.data ? (
        (() => {
          const data = analytics.data;
          const noOrdersEver =
            data.summary.totalOrders === 0 &&
            data.monthlySales.every((month) => month.totalOrders === 0);

          if (noOrdersEver) {
            return (
              <EmptyState
                title="No analytics yet"
                description="Once your restaurant receives orders, revenue, profit and status breakdowns will appear here. Nothing is inferred while you have no data."
              />
            );
          }

          return (
            <>
              <AnalyticsOverview summary={data.summary} range={range} />

              <OrderHealthPanel summary={data.summary} />

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)]">
                <DashboardPanel
                  eyebrow="Trend"
                  title="Revenue vs net profit"
                  description={`Completed order sales against estimated operating cost · ${data.summary.completedOrders} completed orders`}
                >
                  <RevenueProfitChart points={data.series} />
                </DashboardPanel>

                <DashboardPanel
                  eyebrow="Mix"
                  title="Order status distribution"
                  description="Every order placed in the selected period, by current status."
                >
                  <OrderDistributionChart slices={data.orderDistribution} />
                </DashboardPanel>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)]">
                <DashboardPanel
                  eyebrow="Sales"
                  title="Monthly sales"
                  description="Completed order revenue for the trailing twelve months."
                >
                  <MonthlySalesChart points={data.monthlySales} />
                </DashboardPanel>

                <PopularItemsPanel items={data.popularItems} />
              </div>

              <section
                aria-label="How these figures are calculated"
                className="rounded-2xl border border-olive-900/10 bg-ivory-50/70 p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                    <Info aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="space-y-2 text-[0.75rem] leading-relaxed text-olive-600">
                    <p className="font-semibold text-olive-900">How these numbers are calculated</p>
                    <p>
                      <span className="font-medium text-olive-900">Revenue</span> is the sum of customer
                      totals from completed orders, recognised when the delivery completed. Cancelled and
                      rejected orders are excluded. <span className="font-medium text-olive-900">Net profit</span>{' '}
                      is revenue minus the estimated operating cost below.
                    </p>
                    <p>
                      <span className="font-medium text-olive-900">Estimated operating cost</span> is{' '}
                      <span className="rounded-full bg-gold-100 px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-gold-700">
                        Illustrative mock data
                      </span>{' '}
                      — {Math.round(data.costModel.ingredientRateOfSubtotal * 100)}% of item subtotal for
                      ingredients, {data.costModel.currency === 'USD' ? '$' : ''}
                      {data.costModel.packagingPerOrder.toFixed(2)} packaging per order and{' '}
                      {Math.round(data.costModel.platformCommissionRateOfTotal * 100)}% platform commission on
                      the customer total. {data.costModel.note}
                    </p>
                    <p className="text-olive-500">
                      Updated {formatTime(data.generatedAt)} · {data.summary.totalOrders} orders placed in
                      this period · previous period comparison uses the equivalent preceding{' '}
                      {range === '12m' ? '12 months' : range === '7d' ? '7 days' : '30 days'}.
                    </p>
                  </div>
                </div>
              </section>
            </>
          );
        })()
      ) : null}
    </div>
  );
}
