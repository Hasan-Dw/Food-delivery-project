import { ClipboardList, LayoutDashboard, PackageSearch, Truck, Users } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { DashboardShell, type DashboardNavItem } from '@/features/dashboard/components/DashboardShell';
import { ROUTES } from '@/config/routes';

const nav: DashboardNavItem[] = [
  { to: ROUTES.adminDashboard, label: 'Overview', icon: LayoutDashboard, end: true },
  { to: ROUTES.adminAccounts, label: 'Accounts', icon: Users },
  { to: ROUTES.adminDrivers, label: 'Drivers', icon: Truck },
  { to: ROUTES.adminDeliveries, label: 'Deliveries', icon: PackageSearch },
  { to: ROUTES.adminOrders, label: 'Orders', icon: ClipboardList },
];

export function AdminDashboardLayout() {
  return (
    <DashboardShell nav={nav} roleLabel="Platform operations" workspaceLabel="Savora control room">
      <Outlet />
    </DashboardShell>
  );
}
