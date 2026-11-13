import { BarChart3, ClipboardList, Images, LayoutDashboard, UtensilsCrossed } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { DashboardShell, type DashboardNavItem } from '@/features/dashboard/components/DashboardShell';
import { useRestaurantProfile } from '../hooks/useRestaurantDashboard';
import { ROUTES } from '@/config/routes';

const nav: DashboardNavItem[] = [
  { to: ROUTES.dashboard, label: 'Overview', icon: LayoutDashboard, end: true },
  { to: ROUTES.dashboardOrders, label: 'Order management', icon: ClipboardList },
  { to: ROUTES.dashboardMenu, label: 'Menu management', icon: UtensilsCrossed },
  { to: ROUTES.dashboardSettings, label: 'Profile & brand', icon: Images },
  { to: ROUTES.dashboardAnalytics, label: 'Business analytics', icon: BarChart3 },
];

export function RestaurantDashboardLayout() {
  const restaurant = useRestaurantProfile();
  const workspaceLabel = restaurant.data?.name ?? 'Restaurant workspace';

  return (
    <DashboardShell nav={nav} roleLabel="Restaurant owner" workspaceLabel={workspaceLabel}>
      <Outlet />
    </DashboardShell>
  );
}
