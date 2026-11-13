import { Home, History, ToggleLeft, Truck } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { DashboardShell, type DashboardNavItem } from '@/features/dashboard/components/DashboardShell';
import { useDriverProfile } from '../hooks/useDriverDashboard';
import { ROUTES } from '@/config/routes';

const nav: DashboardNavItem[] = [
  { to: ROUTES.driverDashboard, label: 'Overview', icon: Home, end: true },
  { to: ROUTES.driverActiveDelivery, label: 'Active delivery', icon: Truck },
  { to: ROUTES.driverHistory, label: 'History', icon: History },
  { to: ROUTES.driverAvailability, label: 'Availability', icon: ToggleLeft },
];

export function DriverDashboardLayout() {
  const profile = useDriverProfile();
  const workspaceLabel = profile.data?.serviceArea
    ? `Driver · ${profile.data.serviceArea}`
    : 'Driver workspace';

  return (
    <DashboardShell nav={nav} roleLabel="Delivery partner" workspaceLabel={workspaceLabel}>
      <Outlet />
    </DashboardShell>
  );
}
