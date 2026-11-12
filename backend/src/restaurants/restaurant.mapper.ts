import type { Types } from 'mongoose';
import type {
  MenuCategoryResponse,
  OpeningHoursResponse,
  RestaurantAddressResponse,
  RestaurantCategoryResponse,
  RestaurantResponse,
} from './interfaces/restaurant-response.interface';
import type {
  MenuCategory,
  Restaurant,
  RestaurantCategory,
  RestaurantDocument,
} from './schemas';

function idOf(value: unknown): string {
  return String((value as { _id: Types.ObjectId })._id);
}

function toAddressResponse(document: RestaurantDocument): RestaurantAddressResponse {
  const address = document.address;
  const response: RestaurantAddressResponse = {
    id: idOf(address),
    label: address.label ?? 'Other',
    line1: address.line1,
    city: address.city ?? '',
    state: address.state ?? '',
    postalCode: address.postalCode ?? '',
    country: address.country ?? '',
    isDefault: Boolean(address.isDefault),
  };

  if (address.line2) response.line2 = address.line2;
  if (address.instructions) response.instructions = address.instructions;
  if (address.coordinates) {
    response.coordinates = {
      lat: address.coordinates.lat,
      lng: address.coordinates.lng,
    };
  }

  return response;
}

export function toRestaurantResponse(document: RestaurantDocument): RestaurantResponse {
  const minutes = document.estimatedDeliveryMinutes ?? [25, 40];
  const response: RestaurantResponse = {
    id: document._id.toString(),
    slug: document.slug,
    name: document.name,
    tagline: document.tagline ?? '',
    cuisines: document.cuisines ?? [],
    categorySlugs: document.categorySlugs ?? [],
    imageKey: document.imageKey,
    rating: document.rating ?? 0,
    reviewCount: document.reviewCount ?? 0,
    deliveryFee: document.deliveryFee ?? 0,
    estimatedDeliveryMinutes: [minutes[0] ?? 25, minutes[1] ?? 40],
    distanceKm: document.distanceKm ?? 0,
    minOrder: document.minOrder ?? 0,
    priceLevel: document.priceLevel ?? 2,
    isOpen: Boolean(document.isOpen),
    badges: document.badges ?? [],
    address: toAddressResponse(document),
    openingHours: (document.openingHours ?? []).map(toOpeningHoursResponse),
  };

  if (document.featured) response.featured = true;
  if (document.offerLabel) response.offerLabel = document.offerLabel;

  return response;
}

function toOpeningHoursResponse(hours: {
  day: string;
  open: string;
  close: string;
}): OpeningHoursResponse {
  return { day: hours.day, open: hours.open, close: hours.close };
}

export function toRestaurantCategoryResponse(
  category: RestaurantCategory,
  itemCount: number,
): RestaurantCategoryResponse {
  const response: RestaurantCategoryResponse = {
    id: idOf(category),
    name: category.name,
    slug: category.slug,
    imageKey: category.imageKey,
    itemCount,
  };

  if (category.description) response.description = category.description;
  return response;
}

export function toMenuCategoryResponse(category: MenuCategory): MenuCategoryResponse {
  const response: MenuCategoryResponse = {
    id: idOf(category),
    restaurantId: category.restaurantId.toString(),
    name: category.name,
  };

  if (category.description) response.description = category.description;
  return response;
}

export type { Restaurant, RestaurantCategory, RestaurantDocument, MenuCategory };
