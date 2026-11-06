import { orderStatusLabel } from '@/features/dashboard/components/StatusBadge';
import type { OrderStatus, OrderStatusSlice } from '@/types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: '#D6AA70',
  ACCEPTED: '#93A18A',
  PREPARING: '#E0947A',
  READY: '#C65D3B',
  COMPLETED: '#3F7A52',
  CANCELLED: '#B0968A',
  REJECTED: '#B3452F',
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function OrderDistributionChart({ slices }: { slices: OrderStatusSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-olive-900/15 bg-ivory-50/60 px-6 text-center">
        <p className="text-sm font-medium text-olive-800">No orders in this period</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-olive-500">
          Status distribution will appear once this restaurant receives an order.
        </p>
      </div>
    );
  }

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg
          viewBox="0 0 140 140"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`Order status distribution across ${total} orders`}
        >
          <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#1E2A21" strokeOpacity={0.06} strokeWidth="16" />
          {slices.map((slice) => {
            const length = (slice.count / total) * CIRCUMFERENCE;
            const segment = (
              <circle
                key={slice.status}
                cx="70"
                cy="70"
                r={RADIUS}
                fill="none"
                stroke={STATUS_COLORS[slice.status]}
                strokeWidth="16"
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl leading-none text-olive-900">{total}</span>
          <span className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-500">
            Orders
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {slices.map((slice) => {
          const percent = Math.round((slice.count / total) * 100);
          return (
            <li key={slice.status} className="flex items-center gap-2.5 text-[0.75rem]">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[slice.status] }}
              />
              <span className="text-olive-700">{orderStatusLabel(slice.status)}</span>
              <span className="ml-auto font-semibold text-olive-900">{slice.count}</span>
              <span className="w-10 text-right text-olive-500">{percent}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
