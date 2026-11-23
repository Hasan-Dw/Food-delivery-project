import type { OrderStatus } from '../../common/enums/order.enum';
import type { DeliveryStatus } from '../../common/enums/delivery.enum';

/**
 * Platform-wide analytics read model for the admin control room.
 *
 * Entity totals and status counts are current snapshots taken from MongoDB.
 * Revenue and the time series are scoped to the selected window and recognise
 * revenue on `completedAt`, so cancelled or rejected orders never inflate the
 * figure. No cost or profit metric is exposed because the platform has no
 * reliable expense feed.
 */
export type AdminAnalyticsRange = '7d' | '30d' | '12m';

export type AdminAnalyticsGranularity = 'day' | 'month';

export interface AdminAnalyticsPeriod {
  /** Inclusive start of the period. */
  start: string;
  /** Exclusive end of the period. */
  end: string;
}

export interface AdminAnalyticsSummary {
  totalCustomers: number;
  totalOwners: number;
  totalDrivers: number;
  totalRestaurants: number;
  totalOrders: number;
  pendingOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalDeliveries: number;
  activeDeliveries: number;
  unassignedDeliveries: number;
  completedDeliveries: number;
  availableDrivers: number;
  pendingApprovals: number;
  /** Completed-order value recognised inside the selected window. */
  revenue: number;
  averageOrderValue: number;
  previousRevenue: number;
  /** `null` when the previous window had no completed revenue. */
  revenueGrowthPercent: number | null;
}

export interface AdminAnalyticsSeriesPoint {
  /** Stable bucket key: `YYYY-MM-DD` for days, `YYYY-MM` for months. */
  key: string;
  label: string;
  bucketStart: string;
  bucketEnd: string;
  totalOrders: number;
  completedOrders: number;
  revenue: number;
}

export interface AdminOrderStatusSlice {
  status: OrderStatus;
  count: number;
}

export interface AdminDeliveryStatusSlice {
  status: DeliveryStatus;
  count: number;
}

export interface AdminAnalyticsResponse {
  range: AdminAnalyticsRange;
  granularity: AdminAnalyticsGranularity;
  period: AdminAnalyticsPeriod;
  previousPeriod: AdminAnalyticsPeriod;
  summary: AdminAnalyticsSummary;
  series: AdminAnalyticsSeriesPoint[];
  orderDistribution: AdminOrderStatusSlice[];
  deliveryDistribution: AdminDeliveryStatusSlice[];
  /** Current database totals; the series carries the time dimension. */
  generatedAt: string;
}
