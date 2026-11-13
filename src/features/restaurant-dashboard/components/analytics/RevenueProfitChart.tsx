import { useMemo, useState } from 'react';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import type { AnalyticsSeriesPoint } from '@/types';

const WIDTH = 720;
const HEIGHT = 300;
const PADDING = { top: 18, right: 18, bottom: 34, left: 58 };
const REVENUE_COLOR = '#C65D3B';
const PROFIT_COLOR = '#3F7A52';

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-olive-900/15 bg-ivory-50/60 px-6 text-center">
      <p className="text-sm font-medium text-olive-800">Nothing to chart yet</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-olive-500">{message}</p>
    </div>
  );
}

function labelIndices(count: number): number[] {
  if (count <= 8) return Array.from({ length: count }, (_, index) => index);
  const step = Math.ceil(count / 6);
  const indices = new Set<number>();
  for (let index = 0; index < count; index += step) indices.add(index);
  indices.add(count - 1);
  return [...indices].sort((a, b) => a - b);
}

/**
 * Hand-built SVG line chart — the project has no chart dependency and adding
 * one was not approved. Values come straight from the analytics read model;
 * this component only projects them into SVG coordinates.
 */
export function RevenueProfitChart({ points }: { points: AnalyticsSeriesPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const maxValue = Math.max(
      0,
      ...points.map((point) => Math.max(point.revenue, point.netProfit)),
    );
    const minValue = Math.min(0, ...points.map((point) => point.netProfit));
    const span = maxValue - minValue || 1;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const x = (index: number) =>
      points.length <= 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (points.length - 1)) * plotWidth;
    const y = (value: number) =>
      PADDING.top + (1 - (value - minValue) / span) * plotHeight;

    const line = (selector: (point: AnalyticsSeriesPoint) => number) =>
      points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(selector(point)).toFixed(2)}`)
        .join(' ');

    const revenueLine = line((point) => point.revenue);
    const profitLine = line((point) => point.netProfit);
    const baseline = y(0);
    const revenueArea =
      points.length > 0
        ? `${revenueLine} L ${x(points.length - 1).toFixed(2)} ${baseline.toFixed(2)} L ${x(0).toFixed(2)} ${baseline.toFixed(2)} Z`
        : '';

    const ticks = Array.from({ length: 5 }, (_, index) => {
      const value = minValue + ((maxValue - minValue) * index) / 4;
      return { value, y: y(value) };
    }).reverse();

    return { x, y, revenueLine, profitLine, revenueArea, ticks, plotHeight };
  }, [points]);

  const hasData = points.some((point) => point.revenue !== 0 || point.netProfit !== 0);

  if (!hasData) {
    return (
      <ChartEmpty message="Completed orders in this range will appear here. Cancelled and rejected orders are never counted as revenue." />
    );
  }

  const active = activeIndex !== null ? points[activeIndex] : null;
  const labelSet = new Set(labelIndices(points.length));
  const showDots = points.length <= 12;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[0.75rem] text-olive-600">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: REVENUE_COLOR }} />
          Revenue
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: PROFIT_COLOR }} />
          Net profit
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[260px] w-full sm:h-[300px]"
          role="img"
          aria-label="Line chart comparing revenue and net profit across the selected period"
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
              <text
                x={PADDING.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#5C6B52"
              >
                {formatCompactCurrency(tick.value)}
              </text>
            </g>
          ))}

          <path d={geometry.revenueArea} fill={REVENUE_COLOR} fillOpacity={0.08} />
          <path
            d={geometry.revenueLine}
            fill="none"
            stroke={REVENUE_COLOR}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={geometry.profitLine}
            fill="none"
            stroke={PROFIT_COLOR}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />

          {points.map((point, index) =>
            showDots ? (
              <g key={point.key}>
                <circle cx={geometry.x(index)} cy={geometry.y(point.revenue)} r={3} fill={REVENUE_COLOR} />
                <circle cx={geometry.x(index)} cy={geometry.y(point.netProfit)} r={3} fill={PROFIT_COLOR} />
              </g>
            ) : null,
          )}

          {activeIndex !== null ? (
            <line
              x1={geometry.x(activeIndex)}
              x2={geometry.x(activeIndex)}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke="#1E2A21"
              strokeOpacity={0.2}
            />
          ) : null}

          {points.map((point, index) => {
            const columnWidth = (WIDTH - PADDING.left - PADDING.right) / Math.max(1, points.length - 1);
            return (
              <rect
                key={`hit-${point.key}`}
                x={geometry.x(index) - columnWidth / 2}
                y={PADDING.top}
                width={columnWidth}
                height={HEIGHT - PADDING.top - PADDING.bottom}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: revenue ${formatCurrency(point.revenue)}, net profit ${formatCurrency(point.netProfit)}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="cursor-crosshair outline-none"
              />
            );
          })}

          {points.map((point, index) =>
            labelSet.has(index) ? (
              <text
                key={`label-${point.key}`}
                x={geometry.x(index)}
                y={HEIGHT - 10}
                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                fontSize="11"
                fill="#5C6B52"
              >
                {point.label}
              </text>
            ) : null,
          )}
        </svg>

        {active ? (
          <div className="pointer-events-none absolute right-2 top-0 rounded-xl border border-olive-900/10 bg-cream/95 px-3 py-2 text-[0.6875rem] shadow-soft backdrop-blur">
            <p className="font-semibold text-olive-900">{active.label}</p>
            <p className="mt-1 flex items-center gap-2 text-olive-600">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: REVENUE_COLOR }} />
              Revenue <span className="ml-auto font-semibold text-olive-900">{formatCurrency(active.revenue)}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-olive-600">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: PROFIT_COLOR }} />
              Net profit <span className="ml-auto font-semibold text-olive-900">{formatCurrency(active.netProfit)}</span>
            </p>
            <p className="mt-1 text-olive-500">
              {active.completedOrders} completed · {active.totalOrders} placed
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
