import type { Paginated, Product, ProductCategory } from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { ProductQuery, ProductService } from './ProductService';

export class HttpProductService implements ProductService {
  constructor(private readonly client: ApiClient) {}

  async listPopular(limit = 8): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/products/popular', { query: { limit } });
    return response.data;
  }

  async listByRestaurant(restaurantId: string): Promise<Product[]> {
    const response = await this.client.get<Product[]>(
      `/restaurants/${encodeURIComponent(restaurantId)}/products`,
    );
    return response.data;
  }

  async listCategories(restaurantId: string): Promise<ProductCategory[]> {
    const response = await this.client.get<ProductCategory[]>(
      `/restaurants/${encodeURIComponent(restaurantId)}/product-categories`,
    );
    return response.data;
  }

  async list(query: ProductQuery = {}): Promise<Paginated<Product>> {
    const response = await this.client.get<Paginated<Product>>('/products', {
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
    const response = await this.client.get<Product>(`/products/${encodeURIComponent(id)}`);
    return response.data;
  }
}
