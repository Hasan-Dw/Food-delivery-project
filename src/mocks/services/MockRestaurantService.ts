import type { Paginated, Restaurant, RestaurantCategory, RestaurantQuery } from '@/types';
import { restaurantCategories } from '@/mocks/data/categories';
import { restaurants } from '@/mocks/data/restaurants';
import { delay } from '@/mocks/utils/delay';
import { ApiError } from '@/services/api/errors';
import type { RestaurantService } from '@/services/restaurants/RestaurantService';

function matchesQuery(restaurant: Restaurant, query: RestaurantQuery): boolean {
  const search = query.search?.trim().toLowerCase();
  if (search) {
    const haystack = [
      restaurant.name,
      restaurant.tagline,
      ...restaurant.cuisines,
      ...restaurant.categorySlugs,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  if (query.category && !restaurant.categorySlugs.includes(query.category)) return false;
  return true;
}

function sortRestaurants(list: Restaurant[], sort: RestaurantQuery['sort']): Restaurant[] {
  const sorted = [...list];
  switch (sort) {
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'delivery_time':
      return sorted.sort((a, b) => a.estimatedDeliveryMinutes[0] - b.estimatedDeliveryMinutes[0]);
    case 'delivery_fee':
      return sorted.sort((a, b) => a.deliveryFee - b.deliveryFee);
    default:
      return sorted.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }
}

export class MockRestaurantService implements RestaurantService {
  async listCategories(): Promise<RestaurantCategory[]> {
    await delay(260);
    return restaurantCategories;
  }

  async list(query: RestaurantQuery = {}): Promise<Paginated<Restaurant>> {
    await delay(420);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 24;
    const filtered = sortRestaurants(
      restaurants.filter((restaurant) => matchesQuery(restaurant, query)),
      query.sort,
    );
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

  async getById(idOrSlug: string): Promise<Restaurant> {
    await delay(360);
    const restaurant = restaurants.find((entry) => entry.id === idOrSlug || entry.slug === idOrSlug);
    if (!restaurant) {
      throw new ApiError({ code: 'restaurant_not_found', message: 'We could not find that restaurant.' }, 404);
    }
    return restaurant;
  }

  async getFeatured(): Promise<Restaurant[]> {
    await delay(320);
    return restaurants.filter((restaurant) => restaurant.featured);
  }
}
