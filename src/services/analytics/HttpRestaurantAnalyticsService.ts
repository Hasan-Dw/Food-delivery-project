import type { RestaurantAnalytics, RestaurantAnalyticsQuery } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { RestaurantAnalyticsService } from './RestaurantAnalyticsService';

export class HttpRestaurantAnalyticsService implements RestaurantAnalyticsService {
  constructor(private readonly client: ApiClient) {}

  async getAnalytics(
    restaurantId: string,
    query: RestaurantAnalyticsQuery = { range: '7d' },
  ): Promise<RestaurantAnalytics> {
    const response = await this.client.get<RestaurantAnalytics>(
      `/restaurants/${encodeURIComponent(restaurantId)}/analytics`,
      { query: { range: query.range } },
    );
    return response.data;
  }
}
