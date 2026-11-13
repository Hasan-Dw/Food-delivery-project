import type { Types } from 'mongoose';
import type {
  MenuItemResponse,
  MenuOptionGroupResponse,
  MenuOptionResponse,
} from './interfaces/menu-item-response.interface';
import type { MenuItem, MenuOption, MenuOptionGroup, MenuItemDocument } from './schemas/menu-item.schema';

function idOf(value: unknown): string {
  return String((value as { _id: Types.ObjectId })._id);
}

function toOptionResponse(option: MenuOption): MenuOptionResponse {
  const response: MenuOptionResponse = {
    id: idOf(option),
    name: option.name,
    priceDelta: option.priceDeltaCents / 100,
  };

  if (option.isDefault) response.isDefault = true;
  return response;
}

function toOptionGroupResponse(group: MenuOptionGroup): MenuOptionGroupResponse {
  return {
    id: idOf(group),
    name: group.name,
    required: Boolean(group.required),
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    options: (group.options ?? []).map(toOptionResponse),
  };
}

export function toMenuItemResponse(document: MenuItemDocument): MenuItemResponse {
  const response: MenuItemResponse = {
    id: document._id.toString(),
    restaurantId: document.restaurantId.toString(),
    categoryId: document.categoryId.toString(),
    name: document.name,
    description: document.description ?? '',
    price: document.priceCents / 100,
    imageKey: document.imageKey,
    isPopular: Boolean(document.isPopular),
    isVegetarian: Boolean(document.isVegetarian),
    isSpicy: Boolean(document.isSpicy),
    available: Boolean(document.available),
    optionGroups: (document.optionGroups ?? []).map(toOptionGroupResponse),
    rating: document.rating ?? 0,
    reviewCount: document.reviewCount ?? 0,
  };

  if (document.calories !== undefined) response.calories = document.calories;
  return response;
}

export type { MenuItem };
