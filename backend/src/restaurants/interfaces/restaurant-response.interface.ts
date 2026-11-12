export interface RestaurantAddressResponse {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions?: string;
  isDefault: boolean;
  coordinates?: { lat: number; lng: number };
}

export interface OpeningHoursResponse {
  day: string;
  open: string;
  close: string;
}

export interface RestaurantResponse {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  cuisines: string[];
  categorySlugs: string[];
  imageKey: string;
  rating: number;
  reviewCount: number;
  deliveryFee: number;
  estimatedDeliveryMinutes: [number, number];
  distanceKm: number;
  minOrder: number;
  priceLevel: number;
  isOpen: boolean;
  badges: string[];
  address: RestaurantAddressResponse;
  openingHours: OpeningHoursResponse[];
  featured?: boolean;
  offerLabel?: string;
}

export interface RestaurantCategoryResponse {
  id: string;
  name: string;
  slug: string;
  imageKey: string;
  itemCount: number;
  description?: string;
}

export interface MenuCategoryResponse {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
}
