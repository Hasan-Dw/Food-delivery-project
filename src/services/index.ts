import { env } from '@/config/env';
import { apiClient } from './api';
import { MockAuthService } from '@/mocks/services/MockAuthService';
import { MockOrderService } from '@/mocks/services/MockOrderService';
import { MockProductService } from '@/mocks/services/MockProductService';
import { MockPromotionService } from '@/mocks/services/MockPromotionService';
import { MockRestaurantService } from '@/mocks/services/MockRestaurantService';
import { MockTrackingService } from '@/mocks/services/MockTrackingService';
import { MockUserService } from '@/mocks/services/MockUserService';
import { HttpAuthService } from './auth/HttpAuthService';
import { HttpOrderService } from './orders/HttpOrderService';
import { HttpProductService } from './products/HttpProductService';
import { HttpPromotionService } from './promotions/HttpPromotionService';
import { HttpRestaurantService } from './restaurants/HttpRestaurantService';
import { HttpTrackingService } from './tracking/HttpTrackingService';
import { HttpUserService } from './users/HttpUserService';
import type { AuthService } from './auth/AuthService';
import type { OrderService } from './orders/OrderService';
import type { ProductService } from './products/ProductService';
import type { PromotionService } from './promotions/PromotionService';
import type { RestaurantService } from './restaurants/RestaurantService';
import type { TrackingService } from './tracking/TrackingService';
import type { UserService } from './users/UserService';

export interface Services {
  auth: AuthService;
  restaurants: RestaurantService;
  products: ProductService;
  orders: OrderService;
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
      products: new MockProductService(),
      orders: new MockOrderService(),
      users: new MockUserService(),
      tracking: new MockTrackingService(),
      promotions: new MockPromotionService(),
    }
  : {
      auth: new HttpAuthService(apiClient),
      restaurants: new HttpRestaurantService(apiClient),
      products: new HttpProductService(apiClient),
      orders: new HttpOrderService(apiClient),
      users: new HttpUserService(apiClient),
      tracking: new HttpTrackingService(apiClient),
      promotions: new HttpPromotionService(apiClient),
    };

export type {
  AuthService,
  OrderService,
  ProductService,
  PromotionService,
  RestaurantService,
  TrackingService,
  UserService,
};
