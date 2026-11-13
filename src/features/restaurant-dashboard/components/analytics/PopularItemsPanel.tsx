import { Flame } from 'lucide-react';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { formatCompactCurrency, formatCount, formatCurrency } from '@/lib/format';
import type { PopularMenuItem } from '@/types';

/**
 * Best-selling menu items from completed orders in the selected period.
 * Revenue is item-level (`unit price × quantity`) and never includes cancelled
 * or rejected orders.
 */
export function PopularItemsPanel({ items }: { items: PopularMenuItem[] }) {
  const highestQuantity = Math.max(0, ...items.map((item) => item.quantitySold));

  return (
    <DashboardPanel
      eyebrow="Menu"
      title="Popular menu items"
      description="Best sellers by quantity sold in completed orders for the selected period."
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-olive-900/15 bg-ivory-50/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-olive-800">No completed items in this period</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-olive-500">
            Best-selling dishes will appear once orders are delivered and completed.
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={item.productId}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="w-4 shrink-0 text-[0.6875rem] font-semibold tabular-nums text-olive-400">
                    {index + 1}
                  </span>
                  <span className="truncate text-[0.8125rem] font-medium text-olive-900">
                    {item.name}
                  </span>
                  {index === 0 ? (
                    <Flame aria-label="Best seller" className="h-3.5 w-3.5 shrink-0 text-terracotta" />
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[0.8125rem] font-semibold tabular-nums text-olive-900">
                    {formatCurrency(item.revenue)}
                  </span>
                  <span className="block text-[0.6875rem] tabular-nums text-olive-500">
                    {formatCount(item.quantitySold)} sold
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-olive-900/8">
                <div
                  className="h-full rounded-full bg-terracotta"
                  style={{
                    width: `${highestQuantity > 0 ? Math.max(4, (item.quantitySold / highestQuantity) * 100) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {items.length > 0 ? (
        <p className="mt-5 border-t border-olive-900/8 pt-3 text-[0.6875rem] text-olive-500">
          Item revenue totals{' '}
          {formatCompactCurrency(items.reduce((sum, item) => sum + item.revenue, 0))} before fees and
          discounts.
        </p>
      ) : null}
    </DashboardPanel>
  );
}
