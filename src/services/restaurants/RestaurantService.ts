import type { Paginated, Restaurant, RestaurantCategory, RestaurantQuery } from '@/types';

export interface RestaurantService {
  listCategories(): Promise<RestaurantCategory[]>;
  list(query?: RestaurantQuery): Promise<Paginated<Restaurant>>;
  getById(idOrSlug: string): Promise<Restaurant>;
  getFeatured(): Promise<Restaurant[]>;
}
