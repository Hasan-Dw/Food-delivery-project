import type { Paginated, Product, ProductCategory } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { ProductQuery, ProductService, ProductInput } from './ProductService';
/**
 * Menu items and menu sections exposed by the Savora API.
 *
 * The backend calls these "menu items" because a restaurant menu is not a
 * generic product catalogue. The frontend domain type stays `Product`.
 */
export class HttpProductService implements ProductService {
  constructor(private readonly client: ApiClient) {}

  async listPopular(limit = 8): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/menu-items/popular', {
      query: { limit },
    });
    return response.data;
  }

  async listByRestaurant(restaurantId: string): Promise<Product[]> {
    const response = await this.client.get<Product[]>(
      `/restaurants/${encodeURIComponent(restaurantId)}/menu-items`,
    );
    return response.data;
  }

  async listCategories(restaurantId: string): Promise<ProductCategory[]> {
    const response = await this.client.get<ProductCategory[]>(
      `/restaurants/${encodeURIComponent(restaurantId)}/menu-categories`,
    );
    return response.data;
  }

  async list(query: ProductQuery = {}): Promise<Paginated<Product>> {
    const response = await this.client.get<Paginated<Product>>('/menu-items', {
      query: {
        search: query.search,
        restaurantId: query.restaurantId,
        categoryId: query.categoryId,
        page: query.page,
        perPage: query.perPage,
      },
    });
    return response.data;
  }

  async getById(id: string): Promise<Product> {
    const response = await this.client.get<Product>(
      `/menu-items/${encodeURIComponent(id)}`,
    );
    return response.data;
  }

  async uploadImage(productId: string, file: File): Promise<Product> {
    const form = new FormData();
    form.append('image', file, file.name || 'image');
    const response = await this.client.post<Product>(
      `/menu-items/${encodeURIComponent(productId)}/image`,
      form,
    );
    return response.data;
  }

  async removeImage(productId: string): Promise<Product> {
    const response = await this.client.delete<Product>(
      `/menu-items/${encodeURIComponent(productId)}/image`,
    );
    return response.data;
  }

  async create(restaurantId: string, input: ProductInput): Promise<Product> {
    const response = await this.client.post<Product>('/menu-items', {
      restaurantId,
      ...toProductPayload(input, 'dish-default'),
    });
    return response.data;
  }

  async update(productId: string, input: Partial<ProductInput>): Promise<Product> {
    const response = await this.client.patch<Product>(
      `/menu-items/${encodeURIComponent(productId)}`,
      toProductPayload(input),
    );
    return response.data;
  }

  async setAvailability(productId: string, available: boolean): Promise<Product> {
    const response = await this.client.patch<Product>(
      `/menu-items/${encodeURIComponent(productId)}/availability`,
      { available },
    );
    return response.data;
  }

  async remove(productId: string): Promise<void> {
    await this.client.delete(`/menu-items/${encodeURIComponent(productId)}`);
  }
}

/** Keeps the browser payload to fields the API accepts. */
function toProductPayload(input: Partial<ProductInput>, defaultImageKey?: string) {
  return {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.imageKey !== undefined || defaultImageKey
      ? { imageKey: input.imageKey ?? defaultImageKey }
      : {}),
    ...(input.calories !== undefined ? { calories: input.calories } : {}),
    ...(input.isPopular !== undefined ? { isPopular: input.isPopular } : {}),
    ...(input.isVegetarian !== undefined ? { isVegetarian: input.isVegetarian } : {}),
    ...(input.isSpicy !== undefined ? { isSpicy: input.isSpicy } : {}),
    ...(input.available !== undefined ? { available: input.available } : {}),
  };
}
