import type { Paginated, Product, ProductCategory } from '@/types';

export interface ProductQuery {
  search?: string;
  restaurantId?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}

export interface ProductInput {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageKey?: string;
  calories?: number;
  isPopular?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  available?: boolean;
}

export interface ProductService {
  listPopular(limit?: number): Promise<Product[]>;
  listByRestaurant(restaurantId: string): Promise<Product[]>;
  listCategories(restaurantId: string): Promise<ProductCategory[]>;
  list(query?: ProductQuery): Promise<Paginated<Product>>;
  getById(id: string): Promise<Product>;
  /** Owner-only: upload/replace the menu item image. */
  uploadImage(productId: string, file: File): Promise<Product>;
  removeImage(productId: string): Promise<Product>;
  /** Owner-only: create and edit menu items. */
  create(restaurantId: string, input: ProductInput): Promise<Product>;
  update(productId: string, input: Partial<ProductInput>): Promise<Product>;
  setAvailability(productId: string, available: boolean): Promise<Product>;
  remove(productId: string): Promise<void>;
}
