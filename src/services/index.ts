import { env } from '@/config/env';
import { apiClient } from './api';
import { MockAdminService } from '@/mocks/services/MockAdminService';
import { MockAuthService } from '@/mocks/services/MockAuthService';
import { MockDeliveryService } from '@/mocks/services/MockDeliveryService';
import { MockDriverService } from '@/mocks/services/MockDriverService';
import { MockOrderService } from '@/mocks/services/MockOrderService';
import { MockProductService } from '@/mocks/services/MockProductService';
import { MockPromotionService } from '@/mocks/services/MockPromotionService';
import { MockRestaurantAnalyticsService } from '@/mocks/services/MockRestaurantAnalyticsService';
import { MockRestaurantService } from '@/mocks/services/MockRestaurantService';
import { MockTrackingService } from '@/mocks/services/MockTrackingService';
import { MockUserService } from '@/mocks/services/MockUserService';
import { HttpAdminService } from './admin/HttpAdminService';
import { HttpAuthService } from './auth/HttpAuthService';
import { HttpDeliveryService } from './deliveries/HttpDeliveryService';
import { HttpDriverService } from './drivers/HttpDriverService';
import { HttpOrderService } from './orders/HttpOrderService';
import { HttpProductService } from './products/HttpProductService';
import { HttpPromotionService } from './promotions/HttpPromotionService';
import { HttpRestaurantAnalyticsService } from './analytics/HttpRestaurantAnalyticsService';
import { HttpRestaurantService } from './restaurants/HttpRestaurantService';
import { HttpTrackingService } from './tracking/HttpTrackingService';
import { HttpUserService } from './users/HttpUserService';
import type { AdminService } from './admin/AdminService';
import type { AuthService } from './auth/AuthService';
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
}

/**
 * Single composition root for data access.
 *
 * UI → React Query → service interface → mock | HTTP implementation.
 * Switch the whole app to the backend by setting `VITE_API_BASE_URL` and
 * `VITE_DATA_SOURCE=http`; no page or component changes.
 */
export const services: Services = env.useMocks
  ? {
      auth: new MockAuthService(),
      restaurants: new MockRestaurantService(),
      analytics: new MockRestaurantAnalyticsService(),
      products: new MockProductService(),
      orders: new MockOrderService(),
      deliveries: new MockDeliveryService(),
      drivers: new MockDriverService(),
      admin: new MockAdminService(),
      users: new MockUserService(),
      tracking: new MockTrackingService(),
      promotions: new MockPromotionService(),
    }
  : {
      auth: new HttpAuthService(apiClient),
      restaurants: new HttpRestaurantService(apiClient),
      analytics: new HttpRestaurantAnalyticsService(apiClient),
      products: new HttpProductService(apiClient),
      orders: new HttpOrderService(apiClient),
      deliveries: new HttpDeliveryService(apiClient),
      drivers: new HttpDriverService(apiClient),
      admin: new HttpAdminService(apiClient),
      users: new HttpUserService(apiClient),
      tracking: new HttpTrackingService(apiClient),
      promotions: new HttpPromotionService(apiClient),
    };

export type {
  AdminService,
  AuthService,
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
