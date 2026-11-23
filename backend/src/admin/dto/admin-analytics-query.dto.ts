import { IsIn, IsOptional } from 'class-validator';
import type { AdminAnalyticsRange } from '../analytics/admin-analytics.interface';

const RANGES: AdminAnalyticsRange[] = ['7d', '30d', '12m'];

/**
 * Fixed analytics windows keep the aggregation bounded. Arbitrary or unbounded
 * date ranges are rejected so a caller cannot request an expensive scan.
 */
export class AdminAnalyticsQueryDto {
  @IsOptional()
  @IsIn(RANGES)
  range: AdminAnalyticsRange = '30d';
}
