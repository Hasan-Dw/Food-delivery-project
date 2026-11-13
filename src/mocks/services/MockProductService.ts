import type { Product, ProductCategory } from '@/types';
import { productCategories, products } from '@/mocks/data/products';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { ProductService, ProductQuery, ProductInput } from '@/services/products/ProductService';

export class MockProductService implements ProductService {
  async listPopular(limit = 8): Promise<Product[]> {
    await delay(380);
    return products.filter((product) => product.isPopular).slice(0, limit);
  }

  async listByRestaurant(restaurantId: string): Promise<Product[]> {
    await delay(340);
    return products.filter((product) => product.restaurantId === restaurantId && product.available);
  }

  async listCategories(restaurantId: string): Promise<ProductCategory[]> {
    await delay(240);
    return productCategories.filter((category) => category.restaurantId === restaurantId);
  }

  async list(query: ProductQuery = {}) {
    await delay(360);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 24;
    const search = query.search?.trim().toLowerCase();
    const filtered = products.filter((product) => {
      if (!product.available) return false;
      if (query.restaurantId && product.restaurantId !== query.restaurantId) return false;
      if (query.categoryId && product.categoryId !== query.categoryId) return false;
      if (search && !`${product.name} ${product.description}`.toLowerCase().includes(search)) return false;
      return true;
    });
    const start = (page - 1) * perPage;
    const items = filtered.slice(start, start + perPage);
    return {
      items,
      page,
      perPage,
      total: filtered.length,
      hasMore: start + items.length < filtered.length,
    };
  }

  async getById(id: string): Promise<Product> {
    await delay(260);
    const product = products.find((entry) => entry.id === id);
    if (!product) {
      throw new ApiError({ code: 'product_not_found', message: 'That dish is no longer available.' }, 404);
    }
    return product;
  }

  async uploadImage(productId: string, file: File): Promise<Product> {
    await delay(400);
    const product = await this.getById(productId);
    return { ...product, imageKey: URL.createObjectURL(file) };
  }

  async removeImage(productId: string): Promise<Product> {
    await delay(300);
    const product = await this.getById(productId);
    return { ...product, imageKey: 'dish-default' };
  }

  async create(restaurantId: string, input: ProductInput): Promise<Product> {
    await delay(550);
    return {
      id: `prod_${Date.now().toString(36)}`,
      restaurantId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      imageKey: input.imageKey ?? 'dish-default',
      calories: input.calories,
      isPopular: input.isPopular ?? false,
      isVegetarian: input.isVegetarian,
      isSpicy: input.isSpicy,
      available: input.available ?? true,
      optionGroups: [],
    };
  }

  async update(productId: string, input: Partial<ProductInput>): Promise<Product> {
    await delay(450);
    const product = await this.getById(productId);
    return { ...product, ...input, imageKey: input.imageKey ?? product.imageKey };
  }

  async setAvailability(productId: string, available: boolean): Promise<Product> {
    await delay(300);
    const product = await this.getById(productId);
    return { ...product, available };
  }

  async remove(productId: string): Promise<void> {
    await delay(300);
    await this.getById(productId);
  }
}
