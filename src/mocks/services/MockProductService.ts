import type { Product, ProductCategory } from '@/types';
import { productCategories, products } from '@/mocks/data/products';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { ProductService, ProductQuery } from '@/services/products/ProductService';

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
}
