import type { Paginated, Restaurant, RestaurantCategory, RestaurantQuery } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { RestaurantService } from './RestaurantService';

export class HttpRestaurantService implements RestaurantService {
  constructor(private readonly client: ApiClient) {}

  async listCategories(): Promise<RestaurantCategory[]> {
    const response = await this.client.get<RestaurantCategory[]>('/restaurant-categories');
    return response.data;
  }

  async list(query: RestaurantQuery = {}): Promise<Paginated<Restaurant>> {
    const response = await this.client.get<Paginated<Restaurant>>('/restaurants', {
      query: {
        search: query.search,
        category: query.category,
        sort: query.sort,
        page: query.page,
        perPage: query.perPage,
      },
    });
    return response.data;
  }

  async getById(idOrSlug: string): Promise<Restaurant> {
    const response = await this.client.get<Restaurant>(`/restaurants/${encodeURIComponent(idOrSlug)}`);
    return response.data;
  }

  async getFeatured(): Promise<Restaurant[]> {
    const response = await this.client.get<Restaurant[]>('/restaurants/featured');
    return response.data;
  }
}
