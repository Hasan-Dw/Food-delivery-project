import { useMemo, useState } from 'react';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import type { MonthlySalesPoint } from '@/types';

const WIDTH = 720;
const HEIGHT = 260;
const PADDING = { top: 18, right: 14, bottom: 34, left: 58 };
const BAR_COLOR = '#B3813F';

export function MonthlySalesChart({ points }: { points: MonthlySalesPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const maxValue = Math.max(0, ...points.map((point) => point.revenue));
    const niceMax = maxValue > 0 ? maxValue * 1.1 : 1;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const slot = plotWidth / Math.max(1, points.length);
    const barWidth = Math.min(46, slot * 0.6);

    const x = (index: number) => PADDING.left + slot * index + (slot - barWidth) / 2;
    const y = (value: number) => PADDING.top + (1 - value / niceMax) * plotHeight;
    const height = (value: number) => Math.max(0, plotHeight - (y(value) - PADDING.top));

    const ticks = Array.from({ length: 5 }, (_, index) => {
      const value = (niceMax * index) / 4;
      return { value, y: y(value) };
    }).reverse();

    return { x, y, height, barWidth, plotWidth, slot, ticks };
  }, [points]);

  const hasData = points.some((point) => point.revenue > 0);

  if (!hasData) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-olive-900/15 bg-ivory-50/60 px-6 text-center">
        <p className="text-sm font-medium text-olive-800">No monthly sales yet</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-olive-500">
          The trailing twelve months will populate as orders are completed.
        </p>
      </div>
    );
  }

  const active = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[240px] w-full"
        role="img"
        aria-label="Bar chart of completed revenue for each of the trailing twelve months"
      >
        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#1E2A21"
              strokeOpacity={0.08}
              strokeDasharray="4 6"
            />
            <text x={PADDING.left - 10} y={tick.y + 4} textAnchor="end" fontSize="11" fill="#5C6B52">
              {formatCompactCurrency(tick.value)}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const barHeight = geometry.height(point.revenue);
          const isActive = activeIndex === index;
          return (
            <g key={point.key}>
              <rect
                x={geometry.x(index)}
                y={geometry.y(point.revenue)}
                width={geometry.barWidth}
                height={barHeight}
                rx={4}
                fill={BAR_COLOR}
                fillOpacity={isActive ? 1 : 0.82}
              />
              <rect
                x={geometry.x(index) - (geometry.slot - geometry.barWidth) / 2}
                y={PADDING.top}
                width={geometry.slot}
                height={HEIGHT - PADDING.top - PADDING.bottom}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: ${formatCurrency(point.revenue)} from ${point.completedOrders} completed orders`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="cursor-pointer outline-none"
              />
              <text
                x={geometry.x(index) + geometry.barWidth / 2}
                y={HEIGHT - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#5C6B52"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>

      {active ? (
        <div className="pointer-events-none absolute right-2 top-0 rounded-xl border border-olive-900/10 bg-cream/95 px-3 py-2 text-[0.6875rem] shadow-soft backdrop-blur">
          <p className="font-semibold text-olive-900">{active.label}</p>
          <p className="mt-1 text-olive-600">
            Sold <span className="font-semibold text-olive-900">{formatCurrency(active.revenue)}</span>
          </p>
          <p className="mt-0.5 text-olive-500">
            {active.completedOrders} completed · {active.totalOrders} placed
          </p>
        </div>
      ) : null}
    </div>
  );
}
