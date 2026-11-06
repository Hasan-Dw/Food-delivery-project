import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CustomerLayout } from '@/app/layouts/CustomerLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { NotFoundPage } from './NotFoundPage';
import { PageLoader } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';
import { RestaurantDashboardLayout } from '@/features/restaurant-dashboard/layouts/RestaurantDashboardLayout';
import { DriverDashboardLayout } from '@/features/driver-dashboard/layouts/DriverDashboardLayout';
import { AdminDashboardLayout } from '@/features/admin-dashboard/layouts/AdminDashboardLayout';

/* Pages are code-split; the shared shell paints immediately. */
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const OrderTrackingPage = lazy(() => import('@/features/tracking/pages/OrderTrackingPage'));
const RestaurantPage = lazy(() => import('@/features/Restaurant/RestaurantPage'));
const CartPage = lazy(() => import('@/features/cart/pages/CartPage'));

/* Role workspaces. Each owns an isolated layout and its own guard. */
const RestaurantOverviewPage = lazy(
  () => import('@/features/restaurant-dashboard/pages/RestaurantOverviewPage'),
);
const RestaurantOrdersPage = lazy(
  () => import('@/features/restaurant-dashboard/pages/RestaurantOrdersPage'),
);
const RestaurantOrderDetailPage = lazy(
  () => import('@/features/restaurant-dashboard/pages/RestaurantOrderDetailPage'),
);
const RestaurantAnalyticsPage = lazy(
  () => import('@/features/restaurant-dashboard/pages/RestaurantAnalyticsPage'),
);
const DriverOverviewPage = lazy(() => import('@/features/driver-dashboard/pages/DriverOverviewPage'));
const DriverActiveDeliveryPage = lazy(
  () => import('@/features/driver-dashboard/pages/DriverActiveDeliveryPage'),
);
const DriverHistoryPage = lazy(() => import('@/features/driver-dashboard/pages/DriverHistoryPage'));
const DriverAvailabilityPage = lazy(
  () => import('@/features/driver-dashboard/pages/DriverAvailabilityPage'),
);
const AdminOverviewPage = lazy(() => import('@/features/admin-dashboard/pages/AdminOverviewPage'));
const AdminAccountsPage = lazy(() => import('@/features/admin-dashboard/pages/AdminAccountsPage'));
const AdminDriversPage = lazy(() => import('@/features/admin-dashboard/pages/AdminDriversPage'));
const AdminDeliveriesPage = lazy(
  () => import('@/features/admin-dashboard/pages/AdminDeliveriesPage'),
);
const AdminOrdersPage = lazy(() => import('@/features/admin-dashboard/pages/AdminOrdersPage'));

/**
 * Route map for this build.
 *
 * Paths owned by other team members are declared in `config/routes.ts` and
 * documented in docs/TEAM-HANDOFF.md, but intentionally have no implementation
 * here. Their routes should be added as children of CustomerLayout (or their
 * own dashboard layout) when they are delivered.
 *
 * Dashboard owners should wrap their pages in `<ProtectedRoute roles={[...]} />`
 * and add `requireApproval` for restaurant-owner and driver dashboards.
 * `/profile` is mounted as the customer entry point today.
 */
export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.profile} element={<ProfilePage />} />
          </Route>

          <Route path="/orders/:orderId" element={<OrderTrackingPage />} />
          <Route path={ROUTES.restaurantDetails()} element={<RestaurantPage />} />
          <Route path={ROUTES.cart} element={<CartPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        </Route>

        {/* Restaurant owner workspace — approved owners only. */}
        <Route element={<ProtectedRoute roles={['RESTAURANT_OWNER']} requireApproval />}>
          <Route element={<RestaurantDashboardLayout />}>
            <Route path={ROUTES.dashboard} element={<RestaurantOverviewPage />} />
            <Route path={ROUTES.dashboardOrders} element={<RestaurantOrdersPage />} />
            <Route path={ROUTES.dashboardAnalytics} element={<RestaurantAnalyticsPage />} />
            <Route path={ROUTES.dashboardOrder()} element={<RestaurantOrderDetailPage />} />
          </Route>
        </Route>

        {/* Driver workspace — approved platform drivers only. */}
        <Route element={<ProtectedRoute roles={['DRIVER']} requireApproval />}>
          <Route element={<DriverDashboardLayout />}>
            <Route path={ROUTES.driverDashboard} element={<DriverOverviewPage />} />
            <Route path={ROUTES.driverActiveDelivery} element={<DriverActiveDeliveryPage />} />
            <Route path={ROUTES.driverHistory} element={<DriverHistoryPage />} />
            <Route path={ROUTES.driverAvailability} element={<DriverAvailabilityPage />} />
          </Route>
        </Route>

        {/* Platform operations — administrators only. */}
        <Route element={<ProtectedRoute roles={['ADMIN']} requireApproval />}>
          <Route element={<AdminDashboardLayout />}>
            <Route path={ROUTES.adminDashboard} element={<AdminOverviewPage />} />
            <Route path={ROUTES.adminAccounts} element={<AdminAccountsPage />} />
            <Route path={ROUTES.adminDrivers} element={<AdminDriversPage />} />
            <Route path={ROUTES.adminDeliveries} element={<AdminDeliveriesPage />} />
            <Route path={ROUTES.adminOrders} element={<AdminOrdersPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
