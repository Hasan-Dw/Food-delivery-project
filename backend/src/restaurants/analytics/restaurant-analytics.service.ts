import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatus } from '../../common/enums/order.enum';
import { UserRole } from '../../common/enums/user.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Order, type OrderDocument } from '../../orders/schemas/order.schema';
import { Restaurant, type RestaurantDocument } from '../schemas/restaurant.schema';
import {
  RESTAURANT_COST_MODEL,
  type MonthlySalesPoint,
  type OrderStatusSlice,
  type PopularMenuItem,
  type RestaurantAnalyticsGranularity,
  type RestaurantAnalyticsRange,
  type RestaurantAnalyticsResponse,
  type RestaurantAnalyticsSeriesPoint,
  type RestaurantAnalyticsSummary,
  type WeeklySalesPoint,
} from './restaurant-analytics.interface';

const DAY_MS = 24 * 60 * 60 * 1000;
const COMMISSION_CENTS_RATE = RESTAURANT_COST_MODEL.platformCommissionRateOfTotal;
const INGREDIENT_CENTS_RATE = RESTAURANT_COST_MODEL.ingredientRateOfSubtotal;
const PACKAGING_CENTS = Math.round(RESTAURANT_COST_MODEL.packagingPerOrder * 100);

const ORDER_STATUS_ORDER: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
];

const PENDING_STATUSES: readonly string[] = [OrderStatus.PENDING];
const ACTIVE_STATUSES: readonly string[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

interface Bucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

interface AnalyticsWindow {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  granularity: RestaurantAnalyticsGranularity;
  buckets: Bucket[];
  monthlyStart: Date;
  monthlyBuckets: Bucket[];
  weeklyStart: Date;
  weeklyEnd: Date;
  weeklyBuckets: Bucket[];
}

interface StatusCountRow {
  _id: string;
  count: number;
}

interface CompletedTotalsRow {
  _id: null;
  revenueCents: number;
  subtotalCents: number;
  completedOrders: number;
}

interface BucketTotalRow {
  _id: string;
  totalOrders: number;
}

interface CompletedBucketRow {
  _id: string;
  revenueCents: number;
  subtotalCents: number;
  completedOrders: number;
}

interface PopularItemRow {
  _id: { productId: Types.ObjectId | string; name: string };
  quantitySold: number;
  revenueCents: number;
}

interface AnalyticsFacet {
  currentPlaced: StatusCountRow[];
  previousPlaced: StatusCountRow[];
  currentCompleted: CompletedTotalsRow[];
  previousCompleted: CompletedTotalsRow[];
  placedBuckets: BucketTotalRow[];
  completedBuckets: CompletedBucketRow[];
  popularItems: PopularItemRow[];
  monthlyPlaced: BucketTotalRow[];
  monthlyCompleted: CompletedBucketRow[];
  weeklyPlaced: BucketTotalRow[];
  weeklyCompleted: CompletedBucketRow[];
}

function utcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function utcStartOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

/** Monday-based UTC week, matching ISO week semantics. */
function utcStartOfWeek(date: Date): Date {
  const day = utcStartOfDay(date);
  const offset = (day.getUTCDay() + 6) % 7;
  return addUtcDays(day, -offset);
}

function isoDayKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function isoMonthKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

const dayLabelFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

const monthLabelFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
});

function dayLabel(date: Date): string {
  return dayLabelFormatter.format(date);
}

function monthLabel(date: Date): string {
  const month = monthLabelFormatter.format(date);
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month} '${year}`;
}

function weekLabel(date: Date): string {
  return `Week of ${dayLabel(date)}`;
}

function buildDayBuckets(start: Date, end: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let cursor = start; cursor < end; cursor = addUtcDays(cursor, 1)) {
    buckets.push({
      key: isoDayKey(cursor),
      label: dayLabel(cursor),
      start: cursor,
      end: addUtcDays(cursor, 1),
    });
  }
  return buckets;
}

function buildMonthBuckets(start: Date, end: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let cursor = start; cursor < end; cursor = addUtcMonths(cursor, 1)) {
    buckets.push({
      key: isoMonthKey(cursor),
      label: monthLabel(cursor),
      start: cursor,
      end: addUtcMonths(cursor, 1),
    });
  }
  return buckets;
}

function buildWeekBuckets(start: Date, end: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let cursor = start; cursor < end; cursor = addUtcDays(cursor, 7)) {
    buckets.push({
      key: isoDayKey(cursor),
      label: weekLabel(cursor),
      start: cursor,
      end: addUtcDays(cursor, 7),
    });
  }
  return buckets;
}

export function resolveAnalyticsWindow(
  range: RestaurantAnalyticsRange,
  now = new Date(),
): AnalyticsWindow {
  const today = utcStartOfDay(now);
  const monthlyStart = utcStartOfMonth(addUtcMonths(today, -11));
  const monthlyEnd = utcStartOfMonth(addUtcMonths(today, 1));
  const weeklyStart = addUtcDays(utcStartOfWeek(today), -7 * 7);
  const weeklyEnd = addUtcDays(utcStartOfWeek(today), 7);

  if (range === '12m') {
    const start = monthlyStart;
    const end = monthlyEnd;
    return {
      start,
      end,
      previousStart: addUtcMonths(start, -12),
      previousEnd: start,
      granularity: 'month',
      buckets: buildMonthBuckets(start, end),
      monthlyStart,
      monthlyBuckets: buildMonthBuckets(monthlyStart, monthlyEnd),
      weeklyStart,
      weeklyEnd,
      weeklyBuckets: buildWeekBuckets(weeklyStart, weeklyEnd),
    };
  }

  const days = range === '7d' ? 7 : 30;
  const start = addUtcDays(today, -(days - 1));
  const end = addUtcDays(today, 1);

  return {
    start,
    end,
    previousStart: addUtcDays(start, -days),
    previousEnd: start,
    granularity: 'day',
    buckets: buildDayBuckets(start, end),
    monthlyStart,
    monthlyBuckets: buildMonthBuckets(monthlyStart, monthlyEnd),
    weeklyStart,
    weeklyEnd,
    weeklyBuckets: buildWeekBuckets(weeklyStart, weeklyEnd),
  };
}

function centsToMoney(cents: number): number {
  return Math.round(cents) / 100;
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function growthPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function operationalCostCents(
  subtotalCents: number,
  revenueCents: number,
  completedOrders: number,
): number {
  return Math.round(
    subtotalCents * INGREDIENT_CENTS_RATE +
      completedOrders * PACKAGING_CENTS +
      revenueCents * COMMISSION_CENTS_RATE,
  );
}

function sumStatuses(rows: StatusCountRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row._id, row.count);
  return counts;
}

function countOf(counts: Map<string, number>, statuses: readonly string[]): number {
  return statuses.reduce((total, status) => total + (counts.get(status) ?? 0), 0);
}

function totalCount(counts: Map<string, number>): number {
  let total = 0;
  for (const count of counts.values()) total += count;
  return total;
}

function completedTotals(rows: CompletedTotalsRow[]): {
  revenueCents: number;
  subtotalCents: number;
  completedOrders: number;
} {
  const row = rows[0];
  return {
    revenueCents: row?.revenueCents ?? 0,
    subtotalCents: row?.subtotalCents ?? 0,
    completedOrders: row?.completedOrders ?? 0,
  };
}

function buildSummary(
  currentPlaced: StatusCountRow[],
  previousPlaced: StatusCountRow[],
  currentCompleted: CompletedTotalsRow[],
  previousCompleted: CompletedTotalsRow[],
): RestaurantAnalyticsSummary {
  const current = sumStatuses(currentPlaced);
  const previous = sumStatuses(previousPlaced);
  const currentRevenue = completedTotals(currentCompleted);
  const previousRevenueTotals = completedTotals(previousCompleted);

  const totalOrders = totalCount(current);
  const completedOrders = currentRevenue.completedOrders;
  const cancelledOrders = countOf(current, [OrderStatus.CANCELLED]);
  const rejectedOrders = countOf(current, [OrderStatus.REJECTED]);
  const pendingOrders = countOf(current, PENDING_STATUSES);
  const activeOrders = countOf(current, ACTIVE_STATUSES);

  const revenue = centsToMoney(currentRevenue.revenueCents);
  const operationalCost = centsToMoney(
    operationalCostCents(
      currentRevenue.subtotalCents,
      currentRevenue.revenueCents,
      completedOrders,
    ),
  );
  const netProfit = centsToMoney(
    currentRevenue.revenueCents -
      operationalCostCents(
        currentRevenue.subtotalCents,
        currentRevenue.revenueCents,
        completedOrders,
      ),
  );

  const previousRevenue = centsToMoney(previousRevenueTotals.revenueCents);
  const previousOperationalCost = operationalCostCents(
    previousRevenueTotals.subtotalCents,
    previousRevenueTotals.revenueCents,
    previousRevenueTotals.completedOrders,
  );
  const previousNetProfit = centsToMoney(
    previousRevenueTotals.revenueCents - previousOperationalCost,
  );
  const previousTotalOrders = totalCount(previous);

  return {
    revenue,
    operationalCost,
    netProfit,
    totalOrders,
    completedOrders,
    cancelledOrders,
    rejectedOrders,
    pendingOrders,
    activeOrders,
    averageOrderValue:
      completedOrders > 0
        ? Math.round((currentRevenue.revenueCents / 100 / completedOrders) * 100) / 100
        : 0,
    completionRatePercent: percent(completedOrders, totalOrders),
    cancellationRatePercent: percent(cancelledOrders, totalOrders),
    revenueGrowthPercent: growthPercent(
      currentRevenue.revenueCents,
      previousRevenueTotals.revenueCents,
    ),
    profitGrowthPercent: growthPercent(
      currentRevenue.revenueCents - operationalCostCents(
        currentRevenue.subtotalCents,
        currentRevenue.revenueCents,
        completedOrders,
      ),
      previousRevenueTotals.revenueCents - previousOperationalCost,
    ),
    previousRevenue,
    previousNetProfit,
    previousTotalOrders,
    previousCompletedOrders: previousRevenueTotals.completedOrders,
    previousAverageOrderValue:
      previousRevenueTotals.completedOrders > 0
        ? Math.round(
            (previousRevenueTotals.revenueCents /
              100 /
              previousRevenueTotals.completedOrders) *
              100,
          ) / 100
        : 0,
  };
}

function mapPlaced(rows: BucketTotalRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row._id, row.totalOrders]));
}

function mapCompleted(rows: CompletedBucketRow[]): Map<string, CompletedBucketRow> {
  return new Map(rows.map((row) => [row._id, row]));
}

function buildSeries(
  buckets: Bucket[],
  placed: Map<string, number>,
  completed: Map<string, CompletedBucketRow>,
): RestaurantAnalyticsSeriesPoint[] {
  return buckets.map((bucket) => {
    const completedRow = completed.get(bucket.key);
    const revenueCents = completedRow?.revenueCents ?? 0;
    const subtotalCents = completedRow?.subtotalCents ?? 0;
    const completedOrders = completedRow?.completedOrders ?? 0;
    const costCents = operationalCostCents(
      subtotalCents,
      revenueCents,
      completedOrders,
    );

    return {
      key: bucket.key,
      label: bucket.label,
      bucketStart: bucket.start.toISOString(),
      bucketEnd: bucket.end.toISOString(),
      revenue: centsToMoney(revenueCents),
      operationalCost: centsToMoney(costCents),
      netProfit: centsToMoney(revenueCents - costCents),
      totalOrders: placed.get(bucket.key) ?? 0,
      completedOrders,
    };
  });
}

function buildMonthlySales(
  buckets: Bucket[],
  placed: Map<string, number>,
  completed: Map<string, CompletedBucketRow>,
): MonthlySalesPoint[] {
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    revenue: centsToMoney(completed.get(bucket.key)?.revenueCents ?? 0),
    completedOrders: completed.get(bucket.key)?.completedOrders ?? 0,
    totalOrders: placed.get(bucket.key) ?? 0,
  }));
}

function buildWeeklySales(
  buckets: Bucket[],
  placed: Map<string, number>,
  completed: Map<string, CompletedBucketRow>,
): WeeklySalesPoint[] {
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    bucketStart: bucket.start.toISOString(),
    bucketEnd: bucket.end.toISOString(),
    revenue: centsToMoney(completed.get(bucket.key)?.revenueCents ?? 0),
    completedOrders: completed.get(bucket.key)?.completedOrders ?? 0,
    totalOrders: placed.get(bucket.key) ?? 0,
  }));
}

function buildDistribution(rows: StatusCountRow[]): OrderStatusSlice[] {
  const counts = sumStatuses(rows);
  return ORDER_STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map(
    (status) => ({ status, count: counts.get(status) ?? 0 }),
  );
}

function buildPopularItems(rows: PopularItemRow[]): PopularMenuItem[] {
  return rows.map((row) => ({
    productId: String(row._id.productId),
    name: row._id.name,
    quantitySold: row.quantitySold,
    revenue: centsToMoney(row.revenueCents),
  }));
}

@Injectable()
export class RestaurantAnalyticsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) {}

  /** Owner dashboard scope: the restaurant is taken from the session. */
  async getForOwner(
    actor: AuthenticatedUser,
    range: RestaurantAnalyticsRange,
  ): Promise<RestaurantAnalyticsResponse> {
    if (actor.role !== UserRole.RESTAURANT_OWNER || !actor.restaurantId) {
      throw new ForbiddenException({
        code: 'restaurant_not_owned',
        message: 'Your account is not linked to a restaurant.',
      });
    }

    return this.compute(actor.restaurantId, range);
  }

  /** Owners may read only their own restaurant; admins may read any. */
  async getForActor(
    actor: AuthenticatedUser,
    restaurantId: string,
    range: RestaurantAnalyticsRange,
  ): Promise<RestaurantAnalyticsResponse> {
    if (actor.role === UserRole.RESTAURANT_OWNER && actor.restaurantId !== restaurantId) {
      throw new ForbiddenException({
        code: 'restaurant_not_owned',
        message: 'You can only view analytics for your own restaurant.',
      });
    }

    if (actor.role !== UserRole.RESTAURANT_OWNER && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Your account cannot view restaurant analytics.',
      });
    }

    return this.compute(restaurantId, range);
  }

  private async compute(
    restaurantId: string,
    range: RestaurantAnalyticsRange,
  ): Promise<RestaurantAnalyticsResponse> {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new NotFoundException({
        code: 'restaurant_not_found',
        message: 'That restaurant could not be found.',
      });
    }

    const exists = await this.restaurantModel.exists({ _id: restaurantId });
    if (!exists) {
      throw new NotFoundException({
        code: 'restaurant_not_found',
        message: 'That restaurant could not be found.',
      });
    }

    const now = new Date();
    const window = resolveAnalyticsWindow(range, now);
    const restaurantObjectId = new Types.ObjectId(restaurantId);

    // Revenue is recognised on completedAt (falling back to placedAt), so an
    // order placed before the window still contributes if it completed inside.
    const recognizedIn = (start: Date, end: Date) => ({
      status: OrderStatus.COMPLETED,
      $or: [
        { completedAt: { $gte: start, $lt: end } },
        { completedAt: null, placedAt: { $gte: start, $lt: end } },
      ],
    });

    const baseMatch = {
      restaurantId: restaurantObjectId,
      $or: [
        { placedAt: { $gte: window.previousStart, $lt: window.end } },
        recognizedIn(window.previousStart, window.end),
      ],
    };

    const bucketFormat = window.granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const monthFormat = '%Y-%m';
    const weekFormat = '%Y-%m-%d';

    const [facet] = await this.orderModel
      .aggregate<AnalyticsFacet>([
        { $match: baseMatch },
        {
          $facet: {
            currentPlaced: [
              { $match: { placedAt: { $gte: window.start, $lt: window.end } } },
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ],
            previousPlaced: [
              {
                $match: {
                  placedAt: {
                    $gte: window.previousStart,
                    $lt: window.previousEnd,
                  },
                },
              },
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ],
            currentCompleted: [
              { $match: recognizedIn(window.start, window.end) },
              {
                $group: {
                  _id: null,
                  revenueCents: { $sum: '$totals.totalCents' },
                  subtotalCents: { $sum: '$totals.subtotalCents' },
                  completedOrders: { $sum: 1 },
                },
              },
            ],
            previousCompleted: [
              { $match: recognizedIn(window.previousStart, window.previousEnd) },
              {
                $group: {
                  _id: null,
                  revenueCents: { $sum: '$totals.totalCents' },
                  subtotalCents: { $sum: '$totals.subtotalCents' },
                  completedOrders: { $sum: 1 },
                },
              },
            ],
            placedBuckets: [
              { $match: { placedAt: { $gte: window.start, $lt: window.end } } },
              {
                $group: {
                  _id: {
                    $dateToString: { format: bucketFormat, date: '$placedAt' },
                  },
                  totalOrders: { $sum: 1 },
                },
              },
            ],
            completedBuckets: [
              { $match: recognizedIn(window.start, window.end) },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: bucketFormat,
                      date: { $ifNull: ['$completedAt', '$placedAt'] },
                    },
                  },
                  revenueCents: { $sum: '$totals.totalCents' },
                  subtotalCents: { $sum: '$totals.subtotalCents' },
                  completedOrders: { $sum: 1 },
                },
              },
            ],
            popularItems: [
              { $match: recognizedIn(window.start, window.end) },
              { $unwind: '$items' },
              {
                $group: {
                  _id: {
                    productId: '$items.productId',
                    name: '$items.name',
                  },
                  quantitySold: { $sum: '$items.quantity' },
                  revenueCents: {
                    $sum: { $multiply: ['$items.unitPriceCents', '$items.quantity'] },
                  },
                },
              },
              { $sort: { quantitySold: -1, revenueCents: -1 } },
              { $limit: 8 },
            ],
            monthlyPlaced: [
              {
                $match: {
                  placedAt: { $gte: window.monthlyStart, $lt: window.end },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: monthFormat, date: '$placedAt' },
                  },
                  totalOrders: { $sum: 1 },
                },
              },
            ],
            monthlyCompleted: [
              { $match: recognizedIn(window.monthlyStart, window.end) },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: monthFormat,
                      date: { $ifNull: ['$completedAt', '$placedAt'] },
                    },
                  },
                  revenueCents: { $sum: '$totals.totalCents' },
                  subtotalCents: { $sum: '$totals.subtotalCents' },
                  completedOrders: { $sum: 1 },
                },
              },
            ],
            weeklyPlaced: [
              {
                $match: {
                  placedAt: { $gte: window.weeklyStart, $lt: window.weeklyEnd },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: weekFormat,
                      date: {
                        $dateTrunc: {
                          date: '$placedAt',
                          unit: 'week',
                          startOfWeek: 'monday',
                        },
                      },
                    },
                  },
                  totalOrders: { $sum: 1 },
                },
              },
            ],
            weeklyCompleted: [
              { $match: recognizedIn(window.weeklyStart, window.weeklyEnd) },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: weekFormat,
                      date: {
                        $dateTrunc: {
                          date: { $ifNull: ['$completedAt', '$placedAt'] },
                          unit: 'week',
                          startOfWeek: 'monday',
                        },
                      },
                    },
                  },
                  revenueCents: { $sum: '$totals.totalCents' },
                  subtotalCents: { $sum: '$totals.subtotalCents' },
                  completedOrders: { $sum: 1 },
                },
              },
            ],
          },
        },
      ])
      .exec();

    const emptyFacet: AnalyticsFacet = {
      currentPlaced: [],
      previousPlaced: [],
      currentCompleted: [],
      previousCompleted: [],
      placedBuckets: [],
      completedBuckets: [],
      popularItems: [],
      monthlyPlaced: [],
      monthlyCompleted: [],
      weeklyPlaced: [],
      weeklyCompleted: [],
    };
    const data = facet ?? emptyFacet;

    return {
      restaurantId,
      range,
      granularity: window.granularity,
      period: {
        start: window.start.toISOString(),
        end: window.end.toISOString(),
      },
      previousPeriod: {
        start: window.previousStart.toISOString(),
        end: window.previousEnd.toISOString(),
      },
      summary: buildSummary(
        data.currentPlaced,
        data.previousPlaced,
        data.currentCompleted,
        data.previousCompleted,
      ),
      series: buildSeries(
        window.buckets,
        mapPlaced(data.placedBuckets),
        mapCompleted(data.completedBuckets),
      ),
      monthlySales: buildMonthlySales(
        window.monthlyBuckets,
        mapPlaced(data.monthlyPlaced),
        mapCompleted(data.monthlyCompleted),
      ),
      weeklySales: buildWeeklySales(
        window.weeklyBuckets,
        mapPlaced(data.weeklyPlaced),
        mapCompleted(data.weeklyCompleted),
      ),
      orderDistribution: buildDistribution(data.currentPlaced),
      popularItems: buildPopularItems(data.popularItems),
      costModel: RESTAURANT_COST_MODEL,
      generatedAt: now.toISOString(),
    };
  }
}
