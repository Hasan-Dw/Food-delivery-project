/**
 * Route constants. All navigation goes through these names so paths can change
 * in one place. Routes marked `ownedBy` are intentionally not mounted in this
 * build — they belong to another developer on the team.
 */

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  profile: '/profile',
  orderTracking: (orderId = ':orderId') => `/orders/${orderId}`,

  // ── Owned by Team Member 2 — Cart & Order Flow ──────────────────────────
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmation: (orderId = ':orderId') => `/order-confirmation/${orderId}`,
  orderHistory: '/orders',

  // ── Owned by Team Member 3 — Restaurant Dashboard ───────────────────────
  dashboard: '/restaurant/dashboard',
  dashboardOrders: '/restaurant/orders',
  dashboardMenu: '/restaurant/menu',
  dashboardCategories: '/restaurant/categories',
  dashboardSettings: '/restaurant/settings',

  // ── Owned by Team Member 4 — Restaurant Discovery ───────────────────────
  restaurants: '/restaurants',
  restaurantDetails: (restaurantName = ':restaurantName') => `/restaurants/${restaurantName}`,
} as const;

export type RouteKey = keyof typeof ROUTES;
