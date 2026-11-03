/**
 * Shared domain contracts.
 *
 * These types describe what the frontend expects from a future backend.
 * Services return these shapes; mock implementations and HTTP implementations
 * are interchangeable. No UI component should invent its own data shape.
 */

export type ID = string;
export type ISODateString = string;
export type CurrencyCode = 'USD';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/* ── Users & addresses ─────────────────────────────────────────────────── */

export type DietaryPreference = 'vegetarian' | 'vegan' | 'gluten-free' | 'halal';

export interface UserPreferences {
  dietary: DietaryPreference[];
  emailReceipts: boolean;
  orderUpdates: boolean;
  marketing: boolean;
}

export interface User {
  id: ID;
  fullName: string;
  email: string;
  phone: string;
  avatarKey?: string;
  memberSince: ISODateString;
  role: 'customer' | 'restaurant_owner' | 'admin';
  preferences: UserPreferences;
}

export type AddressLabel = 'Home' | 'Work' | 'Other';

export interface Address {
  id: ID;
  label: AddressLabel;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions?: string;
  isDefault: boolean;
  coordinates?: Coordinates;
}

export interface AddressInput {
  label: AddressLabel;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions?: string;
  isDefault?: boolean;
}

/* ── Restaurants ────────────────────────────────────────────────────────── */

export type PriceLevel = 1 | 2 | 3 | 4;

export type RestaurantBadge =
  | 'Top rated'
  | 'Free delivery'
  | 'New'
  | 'Savora pick'
  | 'Offer';

export interface RestaurantCategory {
  id: ID;
  name: string;
  slug: string;
  imageKey: string;
  itemCount: number;
  description?: string;
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
}

export interface Restaurant {
  id: ID;
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
  priceLevel: PriceLevel;
  isOpen: boolean;
  badges: RestaurantBadge[];
  address: Address;
  openingHours: OpeningHours[];
  featured?: boolean;
  /** Denormalised offer line, e.g. "20% off your first order". */
  offerLabel?: string;
}

export interface RestaurantQuery {
  search?: string;
  category?: string;
  sort?: 'recommended' | 'rating' | 'delivery_time' | 'delivery_fee';
  page?: number;
  perPage?: number;
}

/* ── Menu & products ────────────────────────────────────────────────────── */

export interface ProductCategory {
  id: ID;
  restaurantId: ID;
  name: string;
  description?: string;
}

export interface ProductOption {
  id: ID;
  name: string;
  priceDelta: number;
  isDefault?: boolean;
}

export interface ProductOptionGroup {
  id: ID;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ProductOption[];
}

export interface Product {
  id: ID;
  restaurantId: ID;
  categoryId: ID;
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
  optionGroups: ProductOptionGroup[];
}

/* ── Cart ───────────────────────────────────────────────────────────────── */

export interface SelectedOption {
  groupId: ID;
  groupName: string;
  optionId: ID;
  optionName: string;
  priceDelta: number;
}

export interface CartItem {
  id: ID;
  productId: ID;
  restaurantId: ID;
  name: string;
  imageKey: string;
  unitPrice: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  notes?: string;
}

export interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
}

export interface Cart {
  restaurantId: ID | null;
  items: CartItem[];
  couponCode?: string;
  totals: CartTotals;
}

/* ── Orders & delivery ──────────────────────────────────────────────────── */

export type DeliveryStatus =
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type PaymentType = 'card' | 'cash' | 'wallet';

export interface PaymentMethod {
  id: ID;
  type: PaymentType;
  label: string;
  brand?: 'visa' | 'mastercard' | 'amex';
  last4?: string;
  expiry?: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: ID;
  productId: ID;
  name: string;
  imageKey: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: SelectedOption[];
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
}

export type VehicleType = 'bike' | 'scooter' | 'car';

export interface Driver {
  id: ID;
  name: string;
  avatarKey: string;
  vehicle: VehicleType;
  rating: number;
  completedDeliveries: number;
  phone: string;
}

export interface Order {
  id: ID;
  code: string;
  restaurantId: ID;
  restaurantName: string;
  restaurantImageKey: string;
  items: OrderItem[];
  status: DeliveryStatus;
  placedAt: ISODateString;
  estimatedDeliveryAt: ISODateString;
  deliveredAt?: ISODateString;
  deliveryAddress: Address;
  driverId?: ID;
  totals: OrderTotals;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

export interface OrderStatusEvent {
  status: DeliveryStatus;
  label: string;
  description: string;
  timestamp?: ISODateString;
  completed: boolean;
}

export interface TrackingLocation {
  label: string;
  address: string;
  coordinates: Coordinates;
}

export interface TrackingRoute {
  /** Ordered polyline of geographic points for a real map provider. */
  points: Coordinates[];
  distanceKm: number;
}

export interface TrackingSnapshot {
  orderId: ID;
  status: DeliveryStatus;
  driver?: Driver;
  etaMinutes: number;
  destination: TrackingLocation;
  restaurant: TrackingLocation;
  route: TrackingRoute;
  /** 0–1 along the route. Demo values are illustrative, never live GPS. */
  progress: number;
  lastUpdated: ISODateString;
  live: boolean;
}

/* ── Promotions ─────────────────────────────────────────────────────────── */

export interface Promotion {
  id: ID;
  title: string;
  subtitle: string;
  description: string;
  code: string;
  imageKey: string;
  expiresAt: ISODateString;
  accent: 'terracotta' | 'olive' | 'gold';
  minOrder?: number;
  restaurantId?: ID;
}

/* ── Auth ───────────────────────────────────────────────────────────────── */

export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  user: User;
  expiresAt: ISODateString;
}

export interface PasswordResetRequest {
  email: string;
}

/* ── Profile updates ────────────────────────────────────────────────────── */

export interface ProfileUpdate {
  fullName: string;
  email: string;
  phone: string;
  preferences?: Partial<UserPreferences>;
}

/* ── API envelopes ──────────────────────────────────────────────────────── */

export interface ApiMeta {
  page?: number;
  perPage?: number;
  total?: number;
  requestId?: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}
