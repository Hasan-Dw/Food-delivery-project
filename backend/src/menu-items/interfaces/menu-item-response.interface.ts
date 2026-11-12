export interface MenuOptionResponse {
  id: string;
  name: string;
  priceDelta: number;
  isDefault?: boolean;
}

export interface MenuOptionGroupResponse {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: MenuOptionResponse[];
}

export interface MenuItemResponse {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageKey: string;
  calories?: number;
  rating?: number;
  reviewCount?: number;
  isPopular: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  available: boolean;
  optionGroups: MenuOptionGroupResponse[];
}
