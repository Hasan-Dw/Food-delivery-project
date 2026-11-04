import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CustomerLayout } from '@/app/layouts/CustomerLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { NotFoundPage } from './NotFoundPage';
import { PageLoader } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';

/* Pages are code-split; the shared shell paints immediately. */
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const OrderTrackingPage = lazy(() => import('@/features/tracking/pages/OrderTrackingPage'));
const RestaurantPage = lazy(() => import('@/features/Restaurant/RestaurantPage'));

/**
 * Route map for this build.
 *
 * Paths owned by other team members are declared in `config/routes.ts` and
 * documented in docs/TEAM-HANDOFF.md, but intentionally have no implementation
 * here. Their routes should be added as children of CustomerLayout (or their
 * own dashboard layout) when they are delivered.
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

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
