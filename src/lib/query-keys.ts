/** Central query keys keep cache invalidation predictable as modules grow. */
export const queryKeys = {
  restaurantCategories: ['restaurant-categories'] as const,
  restaurants: ['restaurants'] as const,
  featuredRestaurants: ['restaurants', 'featured'] as const,
  restaurant: (idOrSlug: string) => ['restaurants', idOrSlug] as const,
  restaurantMine: (ownerId: string) => ['restaurants', 'mine', ownerId] as const,
  popularProducts: ['products', 'popular'] as const,
  restaurantProducts: (restaurantId: string) => ['products', 'restaurant', restaurantId] as const,
  productCategories: (restaurantId: string) => ['product-categories', restaurantId] as const,
  restaurantReviews: (restaurantId: string, page = 1) =>
    ['reviews', 'restaurant', restaurantId, page] as const,
  restaurantReviewSummary: (restaurantId: string) =>
    ['reviews', 'restaurant', restaurantId, 'summary'] as const,
  menuItemReviews: (menuItemId: string, page = 1) => ['reviews', 'menu-item', menuItemId, page] as const,
  menuItemReviewSummary: (menuItemId: string) =>
    ['reviews', 'menu-item', menuItemId, 'summary'] as const,
  driverReviewSummary: (driverId: string) => ['reviews', 'driver', driverId, 'summary'] as const,
  myReviews: (query: Record<string, string | undefined> = {}) => ['reviews', 'mine', query] as const,
  deliveryReview: (orderId: string) => ['reviews', 'delivery', orderId] as const,
  adminReviews: (query: Record<string, string | undefined> = {}) =>
    ['admin', 'reviews', query] as const,
  promotions: ['promotions'] as const,
  adminPromotions: (query: Record<string, string | undefined> = {}) =>
    ['admin', 'promotions', query] as const,
  allAdminPromotions: ['admin', 'promotions'] as const,
  promotionUsage: (promotionId: string) =>
    ['promotions', promotionId, 'usage'] as const,
  restaurantPromotions: ['restaurant-promotions'] as const,
  restaurantPromotionUsage: (promotionId: string) =>
    ['restaurant-promotions', promotionId, 'usage'] as const,
  promotionPolicy: ['restaurant-promotions', 'policy'] as const,
  checkoutQuote: (restaurantId: string, signature: string, couponCode: string) =>
    ['checkout', 'quote', restaurantId, signature, couponCode] as const,
  orders: ['orders'] as const,
  activeOrder: ['orders', 'active'] as const,
  order: (orderId: string) => ['orders', orderId] as const,
  orderList: (query: Record<string, string | undefined> = {}) => ['orders', 'list', query] as const,
  restaurantOrders: (restaurantId: string) => ['orders', 'restaurant', restaurantId] as const,
  allAnalytics: ['restaurants', 'analytics'] as const,
  restaurantAnalytics: (restaurantId: string, range: string) =>
    ['restaurants', 'analytics', restaurantId, range] as const,
  orderStatusHistory: (orderId: string) => ['orders', orderId, 'status-history'] as const,
  tracking: (orderId: string) => ['tracking', orderId] as const,
  allTracking: ['tracking'] as const,
  drivers: ['drivers'] as const,
  driver: (driverId: string) => ['drivers', driverId] as const,
  driverByUser: (userId: string) => ['drivers', 'user', userId] as const,
  driverLocation: (driverId: string) => ['drivers', driverId, 'location'] as const,
  deliveries: ['deliveries'] as const,
  delivery: (deliveryId: string) => ['deliveries', deliveryId] as const,
  deliveryForOrder: (orderId: string) => ['deliveries', 'order', orderId] as const,
  activeDelivery: (driverId: string) => ['deliveries', 'active', driverId] as const,
  driverDeliveries: (driverId: string) => ['deliveries', 'driver', driverId] as const,
  adminAnalytics: (range: string) => ['admin', 'analytics', range] as const,
  allAdminAnalytics: ['admin', 'analytics'] as const,
  adminAccounts: ['admin', 'accounts'] as const,
  adminDrivers: ['admin', 'drivers'] as const,
  adminDeliveries: ['admin', 'deliveries'] as const,
  adminOrders: ['admin', 'orders'] as const,
  profile: ['profile'] as const,
  addresses: ['addresses'] as const,
  paymentMethods: ['payment-methods'] as const,
};
