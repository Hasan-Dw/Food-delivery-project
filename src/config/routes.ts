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

  // ── Role-scoped dashboard entry points ──────────────────────────────────
  // Only the customer entry is mounted today. The other constants and the
  // role guards in app/router are ready for their owners to mount their pages.
  customerDashboard: '/profile',
  dashboard: '/restaurant/dashboard',
  driverDashboard: '/driver/dashboard',
  adminDashboard: '/admin/dashboard',

  // ── Implemented role dashboards ─────────────────────────────────────────
  dashboardOrder: (orderId = ':orderId') => `/restaurant/orders/${orderId}`,
  dashboardAnalytics: '/restaurant/analytics',
  driverActiveDelivery: '/driver/active-delivery',
  driverHistory: '/driver/history',
  driverAvailability: '/driver/availability',
  adminAccounts: '/admin/accounts',
  adminDrivers: '/admin/drivers',
  adminDeliveries: '/admin/deliveries',
  adminOrders: '/admin/orders',

  // ── Owned by Team Member 2 — Cart & Order Flow ──────────────────────────
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmation: (orderId = ':orderId') => `/order-confirmation/${orderId}`,
  orderHistory: '/orders',

  // ── Owned by Team Member 3 — Restaurant Dashboard ───────────────────────
  dashboardOrders: '/restaurant/orders',
  dashboardMenu: '/restaurant/menu',
  dashboardCategories: '/restaurant/categories',
  dashboardSettings: '/restaurant/settings',

  // ── Owned by Team Member 4 — Restaurant Discovery ───────────────────────
  restaurants: '/restaurants',
  restaurantDetails: (restaurantName = ':restaurantName') => `/restaurants/${restaurantName}`,
} as const;

export type RouteKey = keyof typeof ROUTES;
