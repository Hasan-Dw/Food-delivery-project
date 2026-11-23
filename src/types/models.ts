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

/**
 * Platform roles. These strings are part of the API contract, not just UI
 * labels, and must match the backend's authorization claims.
 */
export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER' | 'ADMIN';

/**
 * Account approval lifecycle. Customers are approved on registration;
 * restaurant owners and drivers start at `PENDING_APPROVAL`.
 */
export type AccountStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

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
  role: UserRole;
  accountStatus: AccountStatus;
  /** Restaurant owned by a `RESTAURANT_OWNER`, when one is already assigned. */
  restaurantId?: ID;
  /** Driver profile owned by a `DRIVER`. */
  driverId?: ID;
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
  /** Optional: Syrian addresses usually have no postal code. */
  postalCode?: string;
  country: string;
  instructions?: string;
  isDefault?: boolean;
  coordinates?: Coordinates;
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
  sortOrder?: number;
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
  /** Optional logo used in compact restaurant surfaces (uploaded URL or key). */
  logoKey?: string;
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
  /** Optional public description shown on the restaurant page. */
  description?: string;
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
  sortOrder?: number;
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

/**
 * The customer's purchase lifecycle. It answers "what is happening to the
 * order?" and is deliberately separate from the delivery lifecycle below.
 */
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * The transportation lifecycle. It answers "where is the delivery?" and is
 * owned by the platform delivery system, not by the restaurant.
 */
export type DeliveryStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ARRIVED_AT_RESTAURANT'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELLED';

/** Actions exposed to the frontend; the backend authorizes them per role. */
export type OrderAction =
  | 'ACCEPT'
  | 'REJECT'
  | 'PREPARE'
  | 'READY'
  | 'COMPLETE'
  | 'CANCEL';

/** Delivery actions available to drivers and the platform delivery system. */
export type DeliveryAction =
  | 'ASSIGN'
  | 'ARRIVE_AT_RESTAURANT'
  | 'PICK_UP'
  | 'START_TRANSIT'
  | 'DELIVER'
  | 'CANCEL';

/**
 * Platform-only assignment operations. These are deliberately separate from
 * the transportation lifecycle: unassigning returns an active delivery to
 * `PENDING_ASSIGNMENT` without cancelling the customer's order.
 */
export type DeliveryAssignmentAction = 'ASSIGN' | 'UNASSIGN' | 'REASSIGN';

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

export type DriverAvailability = 'OFFLINE' | 'AVAILABLE' | 'ON_DELIVERY';

/**
 * Platform-owned driver profile. Drivers are never owned by a restaurant:
 * there is intentionally no `restaurantId` field here. Assignment happens
 * through the delivery system.
 */
export interface Driver {
  id: ID;
  userId: ID;
  name: string;
  avatarKey: string;
  vehicle: VehicleType;
  rating: number;
  completedDeliveries: number;
  /** Mock earnings figure. A backend should expose a payout ledger instead. */
  totalEarnings: number;
  phone: string;
  /** Legacy field retained for API compatibility; never used for assignment. */
  serviceArea?: string;
  accountStatus: AccountStatus;
  availability: DriverAvailability;
  /** At most one active delivery in the initial version. */
  activeDeliveryId: ID | null;
  createdAt: ISODateString;
}

/** Latest known GPS point for a driver. Mock coordinates are illustrative. */
export interface DriverLocation extends Coordinates {
  driverId: ID;
  deliveryId?: ID;
  heading?: number;
  speedKph?: number;
  updatedAt: ISODateString;
}

/** Writable part of a driver location update. */
export interface DriverLocationInput extends Coordinates {
  heading?: number;
  speedKph?: number;
}

export interface Order {
  id: ID;
  code: string;
  customerId: ID;
  /** Denormalised snapshot so staff can identify the customer without an extra request. */
  customerName?: string;
  customerPhone?: string;
  restaurantId: ID;
  restaurantName: string;
  restaurantImageKey: string;
  items: OrderItem[];
  status: OrderStatus;
  placedAt: ISODateString;
  acceptedAt?: ISODateString;
  preparingAt?: ISODateString;
  readyAt?: ISODateString;
  completedAt?: ISODateString;
  rejectedAt?: ISODateString;
  cancelledAt?: ISODateString;
  deliveryAddress: Address;
  /** Link to the separate delivery entity. */
  deliveryId?: ID;
  totals: OrderTotals;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

/** Who made an assignment decision. */
export type AssignmentSource = 'AUTOMATIC' | 'MANUAL';

/**
 * Append-only audit trail of platform assignment decisions. The initial mock
 * stores this on the delivery so an unassign/reassign operation is visible
 * without inventing a second entity. A backend should persist the same events
 * and never overwrite earlier rows.
 *
 * `previousDriverId` / `newDriverId` describe a transition. For an `ASSIGNED`
 * event `previousDriverId` is null, for `UNASSIGNED` `newDriverId` is null, and
 * a `REASSIGNED` event records both ends of the swap in one row.
 */
export interface DeliveryAssignmentEvent {
  id: ID;
  deliveryId: ID;
  previousDriverId: ID | null;
  newDriverId: ID | null;
  /**
   * Backwards-compatible alias for the driver the event is about. For an
   * assignment it is the new driver; for a release it is the released driver.
   */
  driverId: ID | null;
  driverName: string | null;
  action: 'ASSIGNED' | 'UNASSIGNED' | 'REASSIGNED';
  source: AssignmentSource;
  /** Administrator who performed a manual operation, when known. */
  adminId?: ID | null;
  reason?: string;
  at: ISODateString;
}

/** Event that caused an automatic assignment attempt. */
export type AutoAssignmentTrigger =
  | 'ORDER_READY'
  | 'DRIVER_AVAILABLE'
  | 'DRIVER_LOCATION_UPDATED'
  | 'AFTER_UNASSIGN'
  | 'ADMIN_RETRY';

export type AutoAssignmentStatus =
  | 'ASSIGNED'
  | 'NO_ELIGIBLE_DRIVER'
  | 'SKIPPED'
  | 'COOLDOWN'
  | 'EXHAUSTED';

/** Last automatic-assignment outcome stored for operational visibility. */
export interface DeliveryAutoAssignmentState {
  attempts: number;
  lastAttemptAt?: ISODateString;
  lastTrigger?: AutoAssignmentTrigger;
  status: AutoAssignmentStatus;
  reason?: string;
}

/** Result returned by `DeliveryService.autoAssign`. */
export interface DeliveryAutoAssignmentResult {
  assigned: boolean;
  deliveryId: ID;
  status: AutoAssignmentStatus;
  reason?: string;
  driverId?: ID;
  driverName?: string;
  distanceKm?: number | null;
  etaMinutes?: number | null;
}

/**
 * Transportation of an order. Delivery status and driver assignment live
 * here, never on the order purchase itself.
 */
export interface Delivery {
  id: ID;
  orderId: ID;
  driverId: ID | null;
  restaurantId: ID;
  customerId: ID;
  status: DeliveryStatus;
  /** Only reliable once a driver is assigned; absent while unassigned. */
  estimatedArrivalAt?: ISODateString;
  assignedAt?: ISODateString;
  pickedUpAt?: ISODateString;
  deliveredAt?: ISODateString;
  cancelledAt?: ISODateString;
  driverLocation: DriverLocation | null;
  assignmentHistory?: DeliveryAssignmentEvent[];
  /** Last automatic-assignment attempt, for admin visibility and retries. */
  autoAssignment?: DeliveryAutoAssignmentState;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Customer-facing tracking milestone. It is a read model that can contain
 * either an order event or a delivery event; the domain entities themselves
 * never share a status field.
 */
export interface TrackingEvent {
  kind: 'order' | 'delivery';
  status: OrderStatus | DeliveryStatus;
  label: string;
  description: string;
  timestamp?: ISODateString;
  completed: boolean;
}

/** Backwards-compatible alias for consumers that still use the old name. */
export type OrderStatusEvent = TrackingEvent;

export interface TrackingLocation {
  label: string;
  address: string;
  coordinates: Coordinates | null;
}

/** GeoJSON LineString in `[longitude, latitude]` order, as OSRM returns it. */
export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export interface TrackingRoute {
  /** Ordered polyline of geographic points for a real map provider. */
  points: Coordinates[];
  distanceKm: number;
  /** Where the distance came from: real road routing or a labelled estimate. */
  source?: 'osrm' | 'straight-line' | 'none';
  /**
   * Real road geometry when `source` is `osrm`. `null` means the map is drawing
   * the two-point straight-line fallback and must label it as such.
   */
  geometry?: GeoJsonLineString | null;
}

/** Where an ETA or distance was derived from. */
export type EtaSource = 'osrm' | 'straight-line' | 'none';

export interface TrackingSnapshot {
  orderId: ID;
  deliveryId?: ID;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  driver?: Driver;
  /** Latest known position, when a driver has shared one. */
  driverLocation: DriverLocation | null;
  /** `null` while there are no coordinates to estimate between. */
  etaMinutes: number | null;
  estimatedArrivalAt?: ISODateString;
  deliveredAt?: ISODateString;
  destination: TrackingLocation;
  restaurant: TrackingLocation;
  navigationStage?: 'TO_RESTAURANT' | 'TO_CUSTOMER';
  navigationDestination?: TrackingLocation | null;
  route: TrackingRoute;
  /** Remaining road distance still to travel, in kilometres. */
  remainingDistanceKm?: number | null;
  etaSource?: EtaSource;
  /** 0–1 along the route, derived from the delivery lifecycle. */
  progress: number;
  lastUpdated: ISODateString;
  live: boolean;
}

/* ── Ratings & reviews ──────────────────────────────────────────────────── */

/**
 * Reviews are scoped to a dimension so one delivered order can carry a
 * restaurant rating, a rating for each purchased dish and a delivery/service
 * rating without overwriting each other.
 */
export type ReviewType = 'restaurant' | 'menu_item' | 'delivery';
export type ReviewStatus = 'visible' | 'hidden';

export interface ReviewAuthor {
  id: ID;
  name: string;
  avatarKey: string;
}

export interface Review {
  id: ID;
  type: ReviewType;
  /** Restaurant / dish rating, or the delivery+service average. */
  rating: number;
  deliveryRating: number | null;
  serviceRating: number | null;
  comment: string;
  status: ReviewStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  restaurantId: ID;
  restaurantName: string;
  restaurantImageKey: string;
  menuItemId: ID | null;
  menuItemName: string;
  menuItemImageKey: string;
  orderId: ID;
  orderCode: string;
  customer: ReviewAuthor;
}

/** Counts of visible reviews for each whole-star score. */
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: RatingDistribution;
}

export interface DriverReviewSummary extends ReviewSummary {
  deliveryAverage: number | null;
  serviceAverage: number | null;
}

export interface ReviewQuery {
  page?: number;
  perPage?: number;
  orderId?: ID;
  type?: ReviewType;
}

export interface AdminReviewQuery extends ReviewQuery {
  status?: ReviewStatus;
  restaurantId?: ID;
}

export interface CreateReviewInput {
  orderId: ID;
  /** Defaults to a restaurant review when omitted. */
  type?: ReviewType;
  rating?: number;
  menuItemId?: ID;
  deliveryRating?: number;
  serviceRating?: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  deliveryRating?: number;
  serviceRating?: number;
  comment?: string;
}

/* ── Promotions ─────────────────────────────────────────────────────────── */

export type PromotionAccent = 'terracotta' | 'olive' | 'gold';
export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY';
export type PromotionScope = 'GLOBAL' | 'RESTAURANT';
export type PromotionStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SCHEDULED';

export interface Promotion {
  id: ID;
  title: string;
  subtitle: string;
  description: string;
  code: string;
  imageKey: string;
  expiresAt: ISODateString;
  accent: PromotionAccent;
  minOrder?: number;
  restaurantId?: ID;
  restaurantName?: string;
  discountType?: PromotionDiscountType;
  /** Percent for PERCENTAGE, decimal currency for FIXED, 0 for FREE_DELIVERY. */
  discountValue?: number;
  maxDiscount?: number;
  freeDelivery?: boolean;
  startsAt?: ISODateString;
  scope?: PromotionScope;
  status?: PromotionStatus;
  firstOrderOnly?: boolean;
  usageLimit?: number;
  usageCount?: number;
  perCustomerLimit?: number;
  active?: boolean;
  discountGranted?: number;
  redemptionCount?: number;
  createdBy?: ID;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

/** Create/update payload shared by the admin and owner coupon editors. */
export interface PromotionInput {
  code: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageKey?: string;
  accent?: PromotionAccent;
  discountType: PromotionDiscountType;
  value?: number;
  minOrder?: number;
  maxDiscount?: number;
  startsAt?: string;
  expiresAt: string;
  restaurantId?: string;
  scope?: PromotionScope;
  usageLimit?: number;
  perCustomerLimit?: number;
  firstOrderOnly?: boolean;
  active?: boolean;
}

export interface PromotionQuery {
  scope?: PromotionScope;
  status?: PromotionStatus;
  restaurantId?: string;
  q?: string;
}

/** Platform limits applied to restaurant-owned coupons. */
export interface PromotionPolicy {
  maxPercentage: number;
  maxFixedDiscount: number;
  maxDiscountCap: number;
  maxMinimumOrder: number;
  maxTotalUses: number;
  maxUsesPerCustomer: number;
}

export interface PromotionUsageRedemption {
  id: ID;
  orderId: ID;
  code: string;
  discount: number;
  redeemedAt: ISODateString;
}

export interface PromotionUsage {
  promotion: Promotion;
  totalRedemptions: number;
  totalDiscount: number;
  lastRedeemedAt?: ISODateString;
  recent: PromotionUsageRedemption[];
}

/** Server evaluation of a coupon code at checkout. */
export interface PromotionValidation {
  valid: boolean;
  code: string;
  title?: string;
  description?: string;
  discount: number;
  discountType?: PromotionDiscountType;
  freeDelivery?: boolean;
  message?: string;
}

/** One priced line returned by the checkout quote endpoint. */
export interface CheckoutQuoteLineItem {
  productId: ID;
  name: string;
  imageKey: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: SelectedOption[];
  notes?: string;
}

/**
 * Server-authoritative cart totals. The browser's own calculation is only a
 * draft; totals shown at checkout come from this response.
 */
export interface CheckoutQuote {
  restaurantId: ID;
  restaurantName: string;
  restaurantImageKey: string;
  items: CheckoutQuoteLineItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
  minOrder: number;
  currency: 'USD';
  couponCode?: string;
  promotion?: PromotionValidation;
}

/* ── Auth ───────────────────────────────────────────────────────────────── */

export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

/** Roles a member of the public may request. ADMIN can never be self-selected. */
export type RegistrationRole = Extract<UserRole, 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER'>;

export interface RestaurantRegistrationDetails {
  name: string;
  address: string;
  phone: string;
  description?: string;
  /** Location details captured from the registration map. */
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface DriverRegistrationDetails {
  phone: string;
  vehicle: VehicleType;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  /**
   * Requested account type. A backend must treat this as a request and
   * independently derive the authoritative role and permissions.
   */
  role?: RegistrationRole;
  /** Required when registering a restaurant owner account. */
  restaurant?: RestaurantRegistrationDetails;
  /** Required when registering a driver account. */
  driver?: DriverRegistrationDetails;
  /** Optional default delivery address captured during customer registration. */
  defaultAddress?: AddressInput;
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
