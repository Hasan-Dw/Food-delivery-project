import { formatCount } from '@/lib/format';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import type { AnalyticsSummary } from '@/types';

/**
 * Operational order metrics that complement the headline revenue cards.
 * Counts are placed orders; completion/cancellation rates use the same
 * denominator so the two percentages are directly comparable.
 */
export function OrderHealthPanel({ summary }: { summary: AnalyticsSummary }) {
  const stats = [
    {
      label: 'Pending',
      value: formatCount(summary.pendingOrders),
      hint: 'Awaiting owner acceptance',
    },
    {
      label: 'Active',
      value: formatCount(summary.activeOrders),
      hint: 'Accepted, preparing or ready',
    },
    {
      label: 'Completion rate',
      value: `${summary.completionRatePercent.toFixed(1)}%`,
      hint: `${formatCount(summary.completedOrders)} of ${formatCount(summary.totalOrders)} orders`,
    },
    {
      label: 'Cancellation rate',
      value: `${summary.cancellationRatePercent.toFixed(1)}%`,
      hint: `${formatCount(summary.cancelledOrders)} cancelled · ${formatCount(summary.rejectedOrders)} rejected`,
    },
  ];

  return (
    <DashboardPanel
      eyebrow="Fulfilment"
      title="Order operations"
      description="Current queue and fulfilment rates for orders placed in the selected period."
    >
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-olive-900/10 bg-ivory-50/70 p-4">
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
              {stat.label}
            </dt>
            <dd className="mt-2 font-display text-2xl text-olive-900">{stat.value}</dd>
            <dd className="mt-1 text-[0.6875rem] leading-relaxed text-olive-500">{stat.hint}</dd>
          </div>
        ))}
      </dl>
    </DashboardPanel>
  );
}
