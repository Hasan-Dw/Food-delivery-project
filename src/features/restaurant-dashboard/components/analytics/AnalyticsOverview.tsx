import {
  CheckCircle2,
  DollarSign,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { formatCompactCurrency, formatCurrency, formatCount } from '@/lib/format';
import type { AnalyticsRange, AnalyticsSummary } from '@/types';

function growth(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function signedPercent(value: number | null): string {
  if (value === null) return '—';
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`;
}

/**
 * Six overview cards. Every comparison is against the previous equivalent
 * period returned by the analytics service; nothing is computed from other
 * restaurants' orders here.
 */
export function AnalyticsOverview({
  summary,
  range,
}: {
  summary: AnalyticsSummary;
  range: AnalyticsRange;
}) {
  const periodHint =
    range === '12m' ? 'vs previous 12 months' : `vs previous ${range === '7d' ? '7' : '30'} days`;

  const revenueGrowth = summary.revenueGrowthPercent;
  const profitGrowth = summary.profitGrowthPercent;
  const ordersGrowth = growth(summary.totalOrders, summary.previousTotalOrders);
  const aovGrowth = growth(summary.averageOrderValue, summary.previousAverageOrderValue);
  const completedGrowth = growth(summary.completedOrders, summary.previousCompletedOrders);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        label="Total revenue"
        value={formatCompactCurrency(summary.revenue)}
        hint={`${formatCurrency(summary.revenue)} from completed orders`}
        icon={<DollarSign aria-hidden="true" className="h-4 w-4" />}
        tone="success"
        trend={{ value: revenueGrowth, label: periodHint }}
      />
      <StatCard
        label="Net profit"
        value={formatCompactCurrency(summary.netProfit)}
        hint={`After ${formatCompactCurrency(summary.operationalCost)} estimated operating cost`}
        icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
        tone={summary.netProfit >= 0 ? 'success' : 'danger'}
        trend={{ value: profitGrowth, label: periodHint }}
      />
      <StatCard
        label="Total orders"
        value={formatCount(summary.totalOrders)}
        hint={`${summary.completedOrders} completed · ${summary.cancelledOrders} cancelled · ${summary.rejectedOrders} rejected`}
        icon={<ShoppingBag aria-hidden="true" className="h-4 w-4" />}
        trend={{ value: ordersGrowth, label: periodHint }}
      />
      <StatCard
        label="Average order value"
        value={formatCurrency(summary.averageOrderValue)}
        hint="Completed order revenue divided by completed orders"
        icon={<ReceiptText aria-hidden="true" className="h-4 w-4" />}
        trend={{ value: aovGrowth, label: periodHint }}
      />
      <StatCard
        label="Completed orders"
        value={formatCount(summary.completedOrders)}
        hint={`${summary.totalOrders > 0 ? Math.round((summary.completedOrders / summary.totalOrders) * 100) : 0}% completion rate in this period`}
        icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
        tone="success"
        trend={{ value: completedGrowth, label: periodHint }}
      />
      <StatCard
        label="Revenue growth"
        value={signedPercent(revenueGrowth)}
        hint={
          revenueGrowth === null
            ? 'No completed revenue in the previous period to compare against.'
            : `Previous period: ${formatCompactCurrency(summary.previousRevenue)}`
        }
        icon={<TrendingUp aria-hidden="true" className="h-4 w-4" />}
        tone={revenueGrowth === null || revenueGrowth >= 0 ? 'success' : 'danger'}
      />
    </div>
  );
}
