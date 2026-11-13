import { IsIn, IsOptional } from 'class-validator';
import type { RestaurantAnalyticsRange } from '../analytics/restaurant-analytics.interface';

const RANGES: RestaurantAnalyticsRange[] = ['7d', '30d', '12m'];

/**
 * Fixed date windows keep analytics queries bounded (at most 12 months plus
 * the equivalent comparison period). Arbitrary date ranges are rejected so a
 * client cannot request an expensive unbounded aggregation.
 */
export class RestaurantAnalyticsQueryDto {
  @IsOptional()
  @IsIn(RANGES)
  range: RestaurantAnalyticsRange = '30d';
}
