import { Home, History, ToggleLeft, Truck } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { DashboardShell, type DashboardNavItem } from '@/features/dashboard/components/DashboardShell';
import { useDriverActiveContext } from '../hooks/useDriverDashboard';
import {
  DriverLocationPublisherContext,
  useDriverLocationPublisher,
} from '../hooks/useDriverLocationPublisher';
import { ROUTES } from '@/config/routes';

const nav: DashboardNavItem[] = [
  { to: ROUTES.driverDashboard, label: 'Overview', icon: Home, end: true },
  { to: ROUTES.driverActiveDelivery, label: 'Active delivery', icon: Truck },
  { to: ROUTES.driverHistory, label: 'History', icon: History },
  { to: ROUTES.driverAvailability, label: 'Availability', icon: ToggleLeft },
];

export function DriverDashboardLayout() {
  const { profile, activeDelivery } = useDriverActiveContext();
  const driver = profile.data;
  const publisher = useDriverLocationPublisher({
    driverId: driver?.id,
    availability: driver?.availability ?? 'OFFLINE',
    deliveryId: activeDelivery.data?.id ?? driver?.activeDeliveryId,
  });

  const workspaceLabel = 'Driver workspace';

  return (
    <DriverLocationPublisherContext.Provider value={publisher}>
      <DashboardShell nav={nav} roleLabel="Delivery partner" workspaceLabel={workspaceLabel}>
        <Outlet />
      </DashboardShell>
    </DriverLocationPublisherContext.Provider>
  );
}
