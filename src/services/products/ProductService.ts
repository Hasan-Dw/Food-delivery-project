import type { Paginated, Product, ProductCategory } from '@/types';

export interface ProductQuery {
  search?: string;
  restaurantId?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}

export interface ProductService {
  listPopular(limit?: number): Promise<Product[]>;
  listByRestaurant(restaurantId: string): Promise<Product[]>;
  listCategories(restaurantId: string): Promise<ProductCategory[]>;
  list(query?: ProductQuery): Promise<Paginated<Product>>;
  getById(id: string): Promise<Product>;
}
