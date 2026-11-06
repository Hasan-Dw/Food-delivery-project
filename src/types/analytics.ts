import type { ISODateString, OrderStatus } from './models';

/**
 * Restaurant analytics contracts.
 *
 * The numbers in this read model are deliberately split into:
 * - order-derived values (revenue, order counts) taken from completed orders;
 * - an explicitly labelled cost model that is illustrative mock data;
 * - a calculated estimated profit (`revenue - operationalCost`).
 *
 * Revenue is never inferred from cancelled or rejected orders. A backend should
 * return the same shape so the dashboard can switch data sources without
 * changing a component.
 */

export type AnalyticsRange = '7d' | '30d' | '12m';

export type AnalyticsGranularity = 'day' | 'month';

export interface AnalyticsPeriod {
  /** Inclusive start of the period. */
  start: ISODateString;
  /** Exclusive end of the period (the moment `now` was sampled). */
  end: ISODateString;
}

export interface AnalyticsSeriesPoint {
  /** Stable bucket key: `YYYY-MM-DD` for days, `YYYY-MM` for months. */
  key: string;
  /** Human label used on the chart axis. */
  label: string;
  bucketStart: ISODateString;
  bucketEnd: ISODateString;
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

export interface OrderStatusSlice {
  status: OrderStatus;
  count: number;
}

export interface AnalyticsSummary {
  revenue: number;
  operationalCost: number;
  netProfit: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  averageOrderValue: number;
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

export interface OperationalCostModel {
  /** Makes it impossible to mistake the demo assumptions for real accounts. */
  source: 'MOCK_ASSUMPTION';
  ingredientRateOfSubtotal: number;
  packagingPerOrder: number;
  platformCommissionRateOfTotal: number;
  /** Fixed daily overhead is not modelled in this demo. */
  fixedOverheadPerDay: number;
  currency: 'USD';
  note: string;
}

export interface RestaurantAnalytics {
  restaurantId: string;
  range: AnalyticsRange;
  granularity: AnalyticsGranularity;
  period: AnalyticsPeriod;
  previousPeriod: AnalyticsPeriod;
  summary: AnalyticsSummary;
  series: AnalyticsSeriesPoint[];
  /** Always the trailing twelve months, independent of the selected range. */
  monthlySales: MonthlySalesPoint[];
  orderDistribution: OrderStatusSlice[];
  costModel: OperationalCostModel;
  generatedAt: ISODateString;
}

export interface RestaurantAnalyticsQuery {
  range: AnalyticsRange;
}
