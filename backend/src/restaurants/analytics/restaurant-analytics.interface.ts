import type { OrderStatus } from '../../common/enums/order.enum';

/**
 * Restaurant analytics read model.
 *
 * Every order-derived number is calculated from the authenticated owner's
 * orders in MongoDB. The operating-cost assumptions remain explicitly labelled
 * (`source: 'MOCK_ASSUMPTION'`) because the platform has no accounting feed.
 */
export type RestaurantAnalyticsRange = '7d' | '30d' | '12m';

export type RestaurantAnalyticsGranularity = 'day' | 'month';

export interface RestaurantAnalyticsPeriod {
  /** Inclusive start of the period. */
  start: string;
  /** Exclusive end of the period. */
  end: string;
}

export interface RestaurantAnalyticsSummary {
  revenue: number;
  operationalCost: number;
  netProfit: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  pendingOrders: number;
  activeOrders: number;
  averageOrderValue: number;
  completionRatePercent: number;
  cancellationRatePercent: number;
  /** `null` when the previous period had no completed revenue. */
  revenueGrowthPercent: number | null;
  /** `null` when the previous period had no estimated profit. */
  profitGrowthPercent: number | null;
  previousRevenue: number;
  previousNetProfit: number;
  previousTotalOrders: number;
  previousCompletedOrders: number;
  previousAverageOrderValue: number;
}

export interface RestaurantAnalyticsSeriesPoint {
  /** Stable bucket key: `YYYY-MM-DD` for days, `YYYY-MM` for months. */
  key: string;
  /** Human label used on the chart axis. */
  label: string;
  bucketStart: string;
  bucketEnd: string;
  revenue: number;
  operationalCost: number;
  netProfit: number;
  totalOrders: number;
  completedOrders: number;
}

export interface MonthlySalesPoint {
  key: string;
  label: string;
  revenue: number;
  completedOrders: number;
  totalOrders: number;
}

export interface WeeklySalesPoint {
  key: string;
  label: string;
  bucketStart: string;
  bucketEnd: string;
  revenue: number;
  completedOrders: number;
  totalOrders: number;
}

export interface OrderStatusSlice {
  status: OrderStatus;
  count: number;
}

export interface PopularMenuItem {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface RestaurantAnalyticsCostModel {
  source: 'MOCK_ASSUMPTION';
  ingredientRateOfSubtotal: number;
  packagingPerOrder: number;
  platformCommissionRateOfTotal: number;
  fixedOverheadPerDay: number;
  currency: 'USD';
  note: string;
}

export interface RestaurantAnalyticsResponse {
  restaurantId: string;
  range: RestaurantAnalyticsRange;
  granularity: RestaurantAnalyticsGranularity;
  period: RestaurantAnalyticsPeriod;
  previousPeriod: RestaurantAnalyticsPeriod;
  summary: RestaurantAnalyticsSummary;
  series: RestaurantAnalyticsSeriesPoint[];
  /** Trailing twelve months, independent of the selected range. */
  monthlySales: MonthlySalesPoint[];
  /** Trailing eight weeks, independent of the selected range. */
  weeklySales: WeeklySalesPoint[];
  orderDistribution: OrderStatusSlice[];
  popularItems: PopularMenuItem[];
  costModel: RestaurantAnalyticsCostModel;
  generatedAt: string;
}

/** Mirrors the existing dashboard assumptions. Labelled, never presented as real accounts. */
export const RESTAURANT_COST_MODEL: RestaurantAnalyticsCostModel = {
  source: 'MOCK_ASSUMPTION',
  ingredientRateOfSubtotal: 0.32,
  packagingPerOrder: 0.85,
  platformCommissionRateOfTotal: 0.15,
  fixedOverheadPerDay: 0,
  currency: 'USD',
  note: 'Illustrative assumptions: 32% of the item subtotal for ingredients, $0.85 packaging per completed order, 15% platform commission on the customer total, and no fixed overhead. Replace with the restaurant accounting feed before using these figures for decisions.',
};
