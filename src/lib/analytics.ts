import type {
  AnalyticsGranularity,
  AnalyticsPeriod,
  AnalyticsRange,
  AnalyticsSeriesPoint,
  AnalyticsSummary,
  MonthlySalesPoint,
  OperationalCostModel,
  Order,
  OrderStatus,
  OrderStatusSlice,
  RestaurantAnalytics,
} from '@/types';

/**
 * Restaurant analytics engine.
 *
 * Pure calculation only: it receives already-scoped orders and returns the
 * read model the dashboard renders. Keeping it here means the mock service, a
 * future server-side job and unit tests share one definition of revenue and
 * profit.
 *
 * Money rules:
 * - Revenue is recognised on `completedAt ?? placedAt` for COMPLETED orders.
 * - Cancelled and rejected orders never contribute revenue or cost.
 * - Net profit = revenue − operational cost.
 *
 * The cost model below is illustrative mock data (`source: MOCK_ASSUMPTION`).
 * It is not derived from any real accounting feed and must be replaced by a
 * restaurant-provided cost source before it is used for decisions.
 */

export const MOCK_OPERATIONAL_COST_MODEL: OperationalCostModel = {
  source: 'MOCK_ASSUMPTION',
  ingredientRateOfSubtotal: 0.32,
  packagingPerOrder: 0.85,
  platformCommissionRateOfTotal: 0.15,
  fixedOverheadPerDay: 0,
  currency: 'USD',
  note: 'Illustrative demo assumptions: 32% of the item subtotal for ingredients, $0.85 packaging per completed order, 15% platform commission on the customer total, and no fixed overhead. Replace with the restaurant accounting feed before using these figures for decisions.',
};

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '12m': 'Last 12 months',
};

const ORDER_STATUS_ORDER: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function monthLabel(date: Date): string {
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  const year = String(date.getFullYear()).slice(-2);
  return `${month} '${year}`;
}

function isoDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isoMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

/** When a completed order's revenue is recognised. */
function revenueRecognisedAt(order: Order): string {
  return order.completedAt ?? order.placedAt;
}

function isWithin(iso: string, start: Date, end: Date): boolean {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time < end.getTime();
}

/**
 * Illustrative operating cost for one completed order. Commission applies to
 * the customer total, ingredients to the item subtotal, plus per-order
 * packaging. No fixed overhead is modelled in this demo.
 */
export function estimateOperationalCost(
  order: Order,
  model: OperationalCostModel = MOCK_OPERATIONAL_COST_MODEL,
): number {
  const ingredients = order.totals.subtotal * model.ingredientRateOfSubtotal;
  const packaging = model.packagingPerOrder;
  const commission = order.totals.total * model.platformCommissionRateOfTotal;
  return Math.max(0, ingredients + packaging + commission);
}

interface RangeWindow {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  granularity: AnalyticsGranularity;
}

export function resolveRangeWindow(range: AnalyticsRange, now = new Date()): RangeWindow {
  if (range === '12m') {
    const start = startOfMonth(addMonths(now, -11));
    const end = addMonths(now, 1);
    return {
      start,
      end,
      previousStart: addMonths(start, -12),
      previousEnd: start,
      granularity: 'month',
    };
  }

  const days = range === '7d' ? 7 : 30;
  const start = startOfDay(addDays(now, -(days - 1)));
  const end = addDays(startOfDay(now), 1);
  return {
    start,
    end,
    previousStart: addDays(start, -days),
    previousEnd: start,
    granularity: 'day',
  };
}

function toPeriod(start: Date, end: Date): AnalyticsPeriod {
  return { start: start.toISOString(), end: end.toISOString() };
}

interface Bucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  revenue: number;
  operationalCost: number;
  completedOrders: number;
  totalOrders: number;
}

function buildBuckets(window: RangeWindow): Bucket[] {
  const buckets: Bucket[] = [];

  if (window.granularity === 'day') {
    for (let cursor = window.start; cursor < window.end; cursor = addDays(cursor, 1)) {
      const next = addDays(cursor, 1);
      buckets.push({
        key: isoDayKey(cursor),
        label: dayLabel(cursor),
        start: cursor,
        end: next,
        revenue: 0,
        operationalCost: 0,
        completedOrders: 0,
        totalOrders: 0,
      });
    }
    return buckets;
  }

  for (let cursor = window.start; cursor < window.end; cursor = addMonths(cursor, 1)) {
    const next = addMonths(cursor, 1);
    buckets.push({
      key: isoMonthKey(cursor),
      label: monthLabel(cursor),
      start: cursor,
      end: next,
      revenue: 0,
      operationalCost: 0,
      completedOrders: 0,
      totalOrders: 0,
    });
  }

  return buckets;
}

function bucketIndexFor(buckets: Bucket[], iso: string): number {
  const time = new Date(iso).getTime();
  return buckets.findIndex(
    (bucket) => time >= bucket.start.getTime() && time < bucket.end.getTime(),
  );
}

function summarise(orders: Order[], start: Date, end: Date): AnalyticsSummary {
  let revenue = 0;
  let operationalCost = 0;
  let completedOrders = 0;
  let totalOrders = 0;
  let cancelledOrders = 0;
  let rejectedOrders = 0;

  for (const order of orders) {
    if (isWithin(order.placedAt, start, end)) {
      totalOrders += 1;
      if (order.status === 'CANCELLED') cancelledOrders += 1;
      if (order.status === 'REJECTED') rejectedOrders += 1;
    }

    if (order.status !== 'COMPLETED') continue;
    if (!isWithin(revenueRecognisedAt(order), start, end)) continue;

    completedOrders += 1;
    revenue += order.totals.total;
    operationalCost += estimateOperationalCost(order);
  }

  return {
    revenue,
    operationalCost,
    netProfit: revenue - operationalCost,
    totalOrders,
    completedOrders,
    cancelledOrders,
    rejectedOrders,
    averageOrderValue: completedOrders > 0 ? revenue / completedOrders : 0,
    revenueGrowthPercent: 0,
    profitGrowthPercent: 0,
    previousRevenue: 0,
    previousNetProfit: 0,
    previousTotalOrders: 0,
    previousCompletedOrders: 0,
    previousAverageOrderValue: 0,
  };
}

function growthPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Build the trailing-twelve-month sales series for the bar chart. */
function buildMonthlySales(orders: Order[], now: Date): MonthlySalesPoint[] {
  const start = startOfMonth(addMonths(now, -11));
  const end = startOfMonth(addMonths(now, 1));
  const points: MonthlySalesPoint[] = [];

  for (let cursor = start; cursor < end; cursor = addMonths(cursor, 1)) {
    const next = addMonths(cursor, 1);
    let revenue = 0;
    let completedOrders = 0;
    let totalOrders = 0;

    for (const order of orders) {
      if (isWithin(order.placedAt, cursor, next)) totalOrders += 1;
      if (order.status !== 'COMPLETED') continue;
      if (!isWithin(revenueRecognisedAt(order), cursor, next)) continue;
      completedOrders += 1;
      revenue += order.totals.total;
    }

    points.push({
      key: isoMonthKey(cursor),
      label: monthLabel(cursor),
      revenue,
      completedOrders,
      totalOrders,
    });
  }

  return points;
}

function buildDistribution(orders: Order[], start: Date, end: Date): OrderStatusSlice[] {
  const counts = new Map<OrderStatus, number>();

  for (const order of orders) {
    if (!isWithin(order.placedAt, start, end)) continue;
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }

  return ORDER_STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

export interface BuildAnalyticsInput {
  restaurantId: string;
  /** Orders already scoped to this restaurant. Never pass another tenant. */
  orders: Order[];
  range: AnalyticsRange;
  now?: Date;
  costModel?: OperationalCostModel;
}

export function buildRestaurantAnalytics({
  restaurantId,
  orders,
  range,
  now = new Date(),
  costModel = MOCK_OPERATIONAL_COST_MODEL,
}: BuildAnalyticsInput): RestaurantAnalytics {
  const window = resolveRangeWindow(range, now);
  const buckets = buildBuckets(window);

  for (const order of orders) {
    // Total-order counts follow the purchase date.
    const placedIndex = bucketIndexFor(buckets, order.placedAt);
    if (placedIndex >= 0) buckets[placedIndex].totalOrders += 1;

    if (order.status !== 'COMPLETED') continue;
    const recognised = revenueRecognisedAt(order);
    const completedIndex = bucketIndexFor(buckets, recognised);
    if (completedIndex < 0) continue;

    const bucket = buckets[completedIndex];
    bucket.completedOrders += 1;
    bucket.revenue += order.totals.total;
    bucket.operationalCost += estimateOperationalCost(order, costModel);
  }

  const series: AnalyticsSeriesPoint[] = buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    bucketStart: bucket.start.toISOString(),
    bucketEnd: bucket.end.toISOString(),
    revenue: bucket.revenue,
    operationalCost: bucket.operationalCost,
    netProfit: bucket.revenue - bucket.operationalCost,
    totalOrders: bucket.totalOrders,
    completedOrders: bucket.completedOrders,
  }));

  const previous = summarise(orders, window.previousStart, window.previousEnd);
  const summary = summarise(orders, window.start, window.end);

  summary.previousRevenue = previous.revenue;
  summary.previousNetProfit = previous.netProfit;
  summary.previousTotalOrders = previous.totalOrders;
  summary.previousCompletedOrders = previous.completedOrders;
  summary.previousAverageOrderValue = previous.averageOrderValue;
  summary.revenueGrowthPercent = growthPercent(summary.revenue, previous.revenue);
  summary.profitGrowthPercent = growthPercent(summary.netProfit, previous.netProfit);

  return {
    restaurantId,
    range,
    granularity: window.granularity,
    period: toPeriod(window.start, window.end),
    previousPeriod: toPeriod(window.previousStart, window.previousEnd),
    summary,
    series,
    monthlySales: buildMonthlySales(orders, now),
    orderDistribution: buildDistribution(orders, window.start, window.end),
    costModel,
    generatedAt: now.toISOString(),
  };
}
