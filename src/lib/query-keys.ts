/** Central query keys keep cache invalidation predictable as modules grow. */
export const queryKeys = {
  restaurantCategories: ['restaurant-categories'] as const,
  restaurants: ['restaurants'] as const,
  featuredRestaurants: ['restaurants', 'featured'] as const,
  restaurant: (idOrSlug: string) => ['restaurants', idOrSlug] as const,
  popularProducts: ['products', 'popular'] as const,
  restaurantProducts: (restaurantId: string) => ['products', 'restaurant', restaurantId] as const,
  productCategories: (restaurantId: string) => ['product-categories', restaurantId] as const,
  promotions: ['promotions'] as const,
  orders: ['orders'] as const,
  activeOrder: ['orders', 'active'] as const,
  order: (orderId: string) => ['orders', orderId] as const,
  orderStatusHistory: (orderId: string) => ['orders', orderId, 'status-history'] as const,
  tracking: (orderId: string) => ['tracking', orderId] as const,
  profile: ['profile'] as const,
  addresses: ['addresses'] as const,
  paymentMethods: ['payment-methods'] as const,
};
