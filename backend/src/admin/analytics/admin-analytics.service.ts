import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccountStatus,
  DriverAvailability,
  UserRole,
} from '../../common/enums/user.enum';
import { DeliveryStatus } from '../../common/enums/delivery.enum';
import { OrderStatus } from '../../common/enums/order.enum';
import { Delivery, type DeliveryDocument } from '../../deliveries/schemas/delivery.schema';
import { Order, type OrderDocument } from '../../orders/schemas/order.schema';
import {
  Restaurant,
  type RestaurantDocument,
} from '../../restaurants/schemas/restaurant.schema';
import { User, type UserDocument } from '../../users/schemas/user.schema';
import {
  DriverProfile,
  type DriverProfileDocument,
} from '../../users/schemas/driver-profile.schema';
import { resolveAnalyticsWindow } from '../../restaurants/analytics/restaurant-analytics.service';
import type { RestaurantAnalyticsRange } from '../../restaurants/analytics/restaurant-analytics.interface';
import type {
  AdminAnalyticsRange,
  AdminAnalyticsResponse,
  AdminAnalyticsSeriesPoint,
  AdminAnalyticsSummary,
  AdminDeliveryStatusSlice,
  AdminOrderStatusSlice,
} from './admin-analytics.interface';

interface RoleCountRow {
  _id: UserRole;
  count: number;
}

interface StatusCountRow {
  _id: string;
  count: number;
}

interface RevenueRow {
  _id: null;
  revenueCents: number;
  completedOrders: number;
}

interface PlacedBucketRow {
  _id: string;
  totalOrders: number;
}

interface CompletedBucketRow {
  _id: string;
  revenueCents: number;
  completedOrders: number;
}

interface AnalyticsFacet {
  placed: PlacedBucketRow[];
  completed: CompletedBucketRow[];
}

function centsToMoney(cents: number): number {
  return Math.round(cents) / 100;
}

function countOf(rows: StatusCountRow[], statuses: readonly string[]): number {
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return statuses.reduce((total, status) => total + (counts.get(status) ?? 0), 0);
}

function growthPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfileDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Delivery.name)
    private readonly deliveryModel: Model<DeliveryDocument>,
  ) {}

  async getPlatformAnalytics(
    range: AdminAnalyticsRange = '30d',
  ): Promise<AdminAnalyticsResponse> {
    const now = new Date();
    // Reuse the restaurant analytics window so both dashboards share the same
    // UTC bucket, comparison-period and timezone semantics.
    const window = resolveAnalyticsWindow(range as RestaurantAnalyticsRange, now);
    const bucketFormat = window.granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const recognizedIn = (start: Date, end: Date) => ({
      status: OrderStatus.COMPLETED,
      $or: [
        { completedAt: { $gte: start, $lt: end } },
        { completedAt: null, placedAt: { $gte: start, $lt: end } },
      ],
    });

    const [
      roleCounts,
      orderStatusRows,
      deliveryStatusRows,
      pendingApprovals,
      restaurantCount,
      availableDrivers,
      currentRevenue,
      previousRevenue,
      [facet],
    ] = await Promise.all([
      this.userModel.aggregate<RoleCountRow>([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      this.orderModel.aggregate<StatusCountRow>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.deliveryModel.aggregate<StatusCountRow>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.userModel.countDocuments({
        accountStatus: AccountStatus.PENDING_APPROVAL,
        role: { $ne: UserRole.CUSTOMER },
      }),
      this.restaurantModel.countDocuments({}),
      this.driverModel.countDocuments({
        accountStatus: AccountStatus.APPROVED,
        availability: DriverAvailability.AVAILABLE,
        activeDeliveryId: null,
      }),
      this.orderModel.aggregate<RevenueRow>([
        { $match: recognizedIn(window.start, window.end) },
        {
          $group: {
            _id: null,
            revenueCents: { $sum: '$totals.totalCents' },
            completedOrders: { $sum: 1 },
          },
        },
      ]),
      this.orderModel.aggregate<RevenueRow>([
        { $match: recognizedIn(window.previousStart, window.previousEnd) },
        {
          $group: {
            _id: null,
            revenueCents: { $sum: '$totals.totalCents' },
            completedOrders: { $sum: 1 },
          },
        },
      ]),
      this.orderModel
        .aggregate<AnalyticsFacet>([
          {
            $match: {
              $or: [
                { placedAt: { $gte: window.start, $lt: window.end } },
                recognizedIn(window.start, window.end),
              ],
            },
          },
          {
            $facet: {
              placed: [
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
              completed: [
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
                    completedOrders: { $sum: 1 },
                  },
                },
              ],
            },
          },
        ])
        .exec(),
    ]);

    const roles = new Map(roleCounts.map((row) => [row._id, row.count]));
    const revenueCents = currentRevenue[0]?.revenueCents ?? 0;
    const completedInWindow = currentRevenue[0]?.completedOrders ?? 0;
    const previousRevenueCents = previousRevenue[0]?.revenueCents ?? 0;

    const summary: AdminAnalyticsSummary = {
      totalCustomers: roles.get(UserRole.CUSTOMER) ?? 0,
      totalOwners: roles.get(UserRole.RESTAURANT_OWNER) ?? 0,
      totalDrivers: roles.get(UserRole.DRIVER) ?? 0,
      totalRestaurants: restaurantCount,
      totalOrders: orderStatusRows.reduce((total, row) => total + row.count, 0),
      pendingOrders: countOf(orderStatusRows, [OrderStatus.PENDING]),
      activeOrders: countOf(orderStatusRows, [
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
      ]),
      completedOrders: countOf(orderStatusRows, [OrderStatus.COMPLETED]),
      cancelledOrders: countOf(orderStatusRows, [OrderStatus.CANCELLED]),
      rejectedOrders: countOf(orderStatusRows, [OrderStatus.REJECTED]),
      totalDeliveries: deliveryStatusRows.reduce((total, row) => total + row.count, 0),
      activeDeliveries: countOf(deliveryStatusRows, [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.ON_THE_WAY,
      ]),
      unassignedDeliveries: countOf(deliveryStatusRows, [
        DeliveryStatus.PENDING_ASSIGNMENT,
      ]),
      completedDeliveries: countOf(deliveryStatusRows, [DeliveryStatus.DELIVERED]),
      availableDrivers,
      pendingApprovals,
      revenue: centsToMoney(revenueCents),
      averageOrderValue:
        completedInWindow > 0
          ? Math.round((revenueCents / 100 / completedInWindow) * 100) / 100
          : 0,
      previousRevenue: centsToMoney(previousRevenueCents),
      revenueGrowthPercent: growthPercent(revenueCents, previousRevenueCents),
    };

    const placed = new Map((facet?.placed ?? []).map((row) => [row._id, row.totalOrders]));
    const completed = new Map((facet?.completed ?? []).map((row) => [row._id, row]));

    const series: AdminAnalyticsSeriesPoint[] = window.buckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      bucketStart: bucket.start.toISOString(),
      bucketEnd: bucket.end.toISOString(),
      totalOrders: placed.get(bucket.key) ?? 0,
      completedOrders: completed.get(bucket.key)?.completedOrders ?? 0,
      revenue: centsToMoney(completed.get(bucket.key)?.revenueCents ?? 0),
    }));

    const orderDistribution: AdminOrderStatusSlice[] = orderStatusRows
      .map((row) => ({ status: row._id as OrderStatus, count: row.count }))
      .sort((a, b) => b.count - a.count);

    const deliveryDistribution: AdminDeliveryStatusSlice[] = deliveryStatusRows
      .map((row) => ({ status: row._id as DeliveryStatus, count: row.count }))
      .sort((a, b) => b.count - a.count);

    return {
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
      summary,
      series,
      orderDistribution,
      deliveryDistribution,
      generatedAt: now.toISOString(),
    };
  }
}
