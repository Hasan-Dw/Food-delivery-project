import type { Coordinates, Paginated, Restaurant, RestaurantCategory, RestaurantQuery } from '@/types';

export interface RestaurantAddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: Coordinates;
}

export interface RestaurantUpdateInput {
  name?: string;
  tagline?: string;
  description?: string;
  isOpen?: boolean;
  deliveryFee?: number;
  minOrder?: number;
  address?: RestaurantAddressInput;
}

export interface RestaurantService {
  listCategories(): Promise<RestaurantCategory[]>;
  list(query?: RestaurantQuery): Promise<Paginated<Restaurant>>;
  getById(idOrSlug: string): Promise<Restaurant>;
  getFeatured(): Promise<Restaurant[]>;
  /** Owner/admin: update profile fields and the saved map coordinates. */
  update(restaurantId: string, input: RestaurantUpdateInput): Promise<Restaurant>;
  /** Owner-only: upload/replace the restaurant cover image. */
  uploadCoverImage(restaurantId: string, file: File): Promise<Restaurant>;
  removeCoverImage(restaurantId: string): Promise<Restaurant>;
  /** Owner-only: upload/replace the compact restaurant logo. */
  uploadLogo(restaurantId: string, file: File): Promise<Restaurant>;
  removeLogo(restaurantId: string): Promise<Restaurant>;
}
