import { env } from '@/config/env';
import { apiClient } from './api';
import { MockAdminService } from '@/mocks/services/MockAdminService';
import { MockAuthService } from '@/mocks/services/MockAuthService';
import { MockCheckoutService } from '@/mocks/services/MockCheckoutService';
import { MockDeliveryService } from '@/mocks/services/MockDeliveryService';
import { MockDriverService } from '@/mocks/services/MockDriverService';
import { MockOrderService } from '@/mocks/services/MockOrderService';
import { MockProductService } from '@/mocks/services/MockProductService';
import { MockPromotionService } from '@/mocks/services/MockPromotionService';
import { MockRestaurantAnalyticsService } from '@/mocks/services/MockRestaurantAnalyticsService';
import { MockRestaurantService } from '@/mocks/services/MockRestaurantService';
import { MockTrackingService } from '@/mocks/services/MockTrackingService';
import { MockUserService } from '@/mocks/services/MockUserService';
import { HttpAuthService } from './auth/HttpAuthService';
import { HttpCheckoutService } from './checkout/HttpCheckoutService';
import { HttpDeliveryService } from './deliveries/HttpDeliveryService';
import { HttpDriverService } from './drivers/HttpDriverService';
import { HttpOrderService } from './orders/HttpOrderService';
import { HttpProductService } from './products/HttpProductService';
import { HttpPromotionService } from './promotions/HttpPromotionService';
import { HttpRestaurantService } from './restaurants/HttpRestaurantService';
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
import type { TrackingService } from './tracking/TrackingService';
import type { UserService } from './users/UserService';

export interface Services {
  auth: AuthService;
  restaurants: RestaurantService;
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
 * Set `VITE_DATA_SOURCE=http` and `VITE_API_BASE_URL` to send the Phase 1 and
 * Phase 2 domains (auth, profile, restaurants, menu, orders, deliveries,
 * drivers, promotions, checkout and tracking) to the NestJS API. Only the
 * analytics and admin-dashboard read models remain local; they are Phase 3.
 */
const useBackend = !env.useMocks;

export const services: Services = {
  auth: useBackend ? new HttpAuthService(apiClient) : new MockAuthService(),
  users: useBackend ? new HttpUserService(apiClient) : new MockUserService(),
  restaurants: useBackend ? new HttpRestaurantService(apiClient) : new MockRestaurantService(),
  products: useBackend ? new HttpProductService(apiClient) : new MockProductService(),

  orders: useBackend ? new HttpOrderService(apiClient) : new MockOrderService(),
  deliveries: useBackend ? new HttpDeliveryService(apiClient) : new MockDeliveryService(),
  drivers: useBackend ? new HttpDriverService(apiClient) : new MockDriverService(),
  tracking: useBackend ? new HttpTrackingService(apiClient) : new MockTrackingService(),
  promotions: useBackend ? new HttpPromotionService(apiClient) : new MockPromotionService(),
  checkout: useBackend ? new HttpCheckoutService(apiClient) : new MockCheckoutService(),

  // Phase 3 read models. The dashboards stay on local fixtures for now.
  analytics: new MockRestaurantAnalyticsService(),
  admin: new MockAdminService(),
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
  TrackingService,
  UserService,
};
