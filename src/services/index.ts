import { apiClient } from './api';
import { HttpAuthService } from './auth/HttpAuthService';
import { HttpAdminService } from './admin/HttpAdminService';
import { HttpCheckoutService } from './checkout/HttpCheckoutService';
import { HttpDeliveryService } from './deliveries/HttpDeliveryService';
import { HttpDriverService } from './drivers/HttpDriverService';
import { HttpOrderService } from './orders/HttpOrderService';
import { HttpProductService } from './products/HttpProductService';
import { HttpPromotionService } from './promotions/HttpPromotionService';
import { HttpRestaurantAnalyticsService } from './analytics/HttpRestaurantAnalyticsService';
import { HttpRestaurantService } from './restaurants/HttpRestaurantService';
import { HttpReviewService } from './reviews/HttpReviewService';
import { HttpTrackingService } from './tracking/HttpTrackingService';
import { HttpUserService } from './users/HttpUserService';
import type { AdminService } from './admin/AdminService';
import type { AuthService } from './auth/AuthService';
import type { CheckoutService } from './checkout/CheckoutService';
import type { DeliveryService } from './deliveries/DeliveryService';
import type { DriverService } from './drivers/DriverService';
import type { OrderService } from './orders/OrderService';
import type { ProductService } from './products/ProductService';
import type { PromotionService } from './promotions/PromotionService';
import type { RestaurantAnalyticsService } from './analytics/RestaurantAnalyticsService';
import type { RestaurantService } from './restaurants/RestaurantService';
import type { ReviewService } from './reviews/ReviewService';
import type { TrackingService } from './tracking/TrackingService';
import type { UserService } from './users/UserService';

export interface Services {
  auth: AuthService;
  restaurants: RestaurantService;
  reviews: ReviewService;
  analytics: RestaurantAnalyticsService;
  products: ProductService;
  orders: OrderService;
  deliveries: DeliveryService;
  drivers: DriverService;
  admin: AdminService;
  users: UserService;
  tracking: TrackingService;
  promotions: PromotionService;
  checkout: CheckoutService;
}

/**
 * Single composition root for data access.
 *
 * Every feature — auth, profiles, restaurants, analytics, menus, orders,
 * deliveries, drivers, promotions, checkout, tracking and administration — is
 * served by the NestJS API. There is no mock composition path, so an API
 * failure surfaces as an error state instead of fabricated data.
 */
export const services: Services = {
  auth: new HttpAuthService(apiClient),
  users: new HttpUserService(apiClient),
  restaurants: new HttpRestaurantService(apiClient),
  reviews: new HttpReviewService(apiClient),
  products: new HttpProductService(apiClient),
  orders: new HttpOrderService(apiClient),
  deliveries: new HttpDeliveryService(apiClient),
  drivers: new HttpDriverService(apiClient),
  tracking: new HttpTrackingService(apiClient),
  promotions: new HttpPromotionService(apiClient),
  checkout: new HttpCheckoutService(apiClient),
  analytics: new HttpRestaurantAnalyticsService(apiClient),
  admin: new HttpAdminService(apiClient),
};

export type {
  AdminService,
  AuthService,
  CheckoutService,
  DeliveryService,
  DriverService,
  OrderService,
  ProductService,
  PromotionService,
  RestaurantAnalyticsService,
  RestaurantService,
  ReviewService,
  TrackingService,
  UserService,
};
