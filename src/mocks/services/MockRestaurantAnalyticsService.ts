import type { RestaurantAnalytics, RestaurantAnalyticsQuery } from '@/types';
import { buildRestaurantAnalytics } from '@/lib/analytics';
import { orders } from '@/mocks/data/orders';
import { restaurants } from '@/mocks/data/restaurants';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { RestaurantAnalyticsService } from '@/services/analytics/RestaurantAnalyticsService';

/**
 * Demo analytics. Orders are filtered by restaurant before they reach the pure
 * engine, so one owner can never see another restaurant's financials. A future
 * HTTP implementation must enforce the same isolation from the session.
 */
export class MockRestaurantAnalyticsService implements RestaurantAnalyticsService {
  async getAnalytics(
    restaurantId: string,
    query: RestaurantAnalyticsQuery = { range: '7d' },
  ): Promise<RestaurantAnalytics> {
    await delay(420);

    const restaurant = restaurants.find((entry) => entry.id === restaurantId);
    if (!restaurant) {
      throw new ApiError(
        { code: 'restaurant_not_found', message: 'We could not find that restaurant.' },
        404,
      );
    }

    const scopedOrders = orders.filter((order) => order.restaurantId === restaurantId);

    return buildRestaurantAnalytics({
      restaurantId,
      orders: scopedOrders,
      range: query.range,
    });
  }
}
