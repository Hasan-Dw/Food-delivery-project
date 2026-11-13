import type { Paginated, Restaurant, RestaurantCategory, RestaurantQuery } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { RestaurantService, RestaurantUpdateInput } from './RestaurantService';

function imageBody(file: File): FormData {
  const form = new FormData();
  form.append('image', file, file.name || 'image');
  return form;
}

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

  async update(restaurantId: string, input: RestaurantUpdateInput): Promise<Restaurant> {
    // The API stores the address pin as flat latitude/longitude fields.
    const body = {
      ...input,
      address: input.address
        ? {
            ...input.address,
            latitude: input.address.coordinates?.lat,
            longitude: input.address.coordinates?.lng,
            coordinates: undefined,
          }
        : undefined,
    };

    const response = await this.client.patch<Restaurant>(
      `/restaurants/${encodeURIComponent(restaurantId)}`,
      body,
    );
    return response.data;
  }

  async uploadCoverImage(restaurantId: string, file: File): Promise<Restaurant> {
    const response = await this.client.post<Restaurant>(
      `/restaurants/${encodeURIComponent(restaurantId)}/image`,
      imageBody(file),
    );
    return response.data;
  }

  async removeCoverImage(restaurantId: string): Promise<Restaurant> {
    const response = await this.client.delete<Restaurant>(
      `/restaurants/${encodeURIComponent(restaurantId)}/image`,
    );
    return response.data;
  }

  async uploadLogo(restaurantId: string, file: File): Promise<Restaurant> {
    const response = await this.client.post<Restaurant>(
      `/restaurants/${encodeURIComponent(restaurantId)}/logo`,
      imageBody(file),
    );
    return response.data;
  }

  async removeLogo(restaurantId: string): Promise<Restaurant> {
    const response = await this.client.delete<Restaurant>(
      `/restaurants/${encodeURIComponent(restaurantId)}/logo`,
    );
    return response.data;
  }
}
