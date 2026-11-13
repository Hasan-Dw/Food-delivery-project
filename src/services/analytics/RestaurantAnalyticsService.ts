import type { RestaurantAnalytics, RestaurantAnalyticsQuery } from '@/types';

/**
 * Restaurant business analytics.
 *
 * The caller is always the authenticated restaurant owner; a backend must
 * derive the restaurant scope from the session and reject cross-tenant reads.
 * `restaurantId` is sent explicitly so the HTTP adapter can be tested, but it
 * must never be trusted as authorization.
 */
export interface RestaurantAnalyticsService {
  getAnalytics(
    restaurantId: string,
    query?: RestaurantAnalyticsQuery,
  ): Promise<RestaurantAnalytics>;
}
