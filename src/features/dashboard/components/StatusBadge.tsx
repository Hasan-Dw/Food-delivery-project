import type { ReactNode } from 'react';
import { PackageCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type {
  AccountStatus,
  DeliveryStatus,
  DriverAvailability,
  OrderStatus,
} from '@/types';
import { deliveryStatusMeta, orderStatusMeta } from '@/config/site';

type BadgeStatus = OrderStatus | DeliveryStatus | AccountStatus | DriverAvailability | 'INCONSISTENT';

const accountLabels: Record<AccountStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

const availabilityLabels: Record<DriverAvailability, string> = {
  OFFLINE: 'Offline',
  AVAILABLE: 'Available',
  ON_DELIVERY: 'On delivery',
};

const statusClasses: Record<BadgeStatus, string> = {
  PENDING: 'bg-gold-100 text-gold-700 ring-gold-300/60',
  ACCEPTED: 'bg-olive-50 text-olive-700 ring-olive-700/20',
  REJECTED: 'bg-danger/8 text-danger ring-danger/25',
  PREPARING: 'bg-gold-100 text-gold-700 ring-gold-300/60',
  READY: 'bg-terracotta-50 text-terracotta-700 ring-terracotta-200/60',
  COMPLETED: 'bg-success/10 text-success ring-success/25',
  CANCELLED: 'bg-brown-50 text-brown-600 ring-brown-200',
  PENDING_ASSIGNMENT: 'bg-gold-100 text-gold-700 ring-gold-300/60',
  ASSIGNED: 'bg-terracotta-50 text-terracotta-700 ring-terracotta-200/60',
  PICKED_UP: 'bg-olive-50 text-olive-700 ring-olive-700/20',
  ON_THE_WAY: 'bg-terracotta-50 text-terracotta-700 ring-terracotta-200/60',
  DELIVERED: 'bg-success/10 text-success ring-success/25',
  PENDING_APPROVAL: 'bg-gold-100 text-gold-700 ring-gold-300/60',
  APPROVED: 'bg-success/10 text-success ring-success/25',
  SUSPENDED: 'bg-danger/8 text-danger ring-danger/25',
  OFFLINE: 'bg-olive-900/6 text-olive-600 ring-olive-900/15',
  AVAILABLE: 'bg-success/10 text-success ring-success/25',
  ON_DELIVERY: 'bg-terracotta-50 text-terracotta-700 ring-terracotta-200/60',
  INCONSISTENT: 'bg-danger/8 text-danger ring-danger/25',
};

const statusLabels: Record<BadgeStatus, string> = {
  ...Object.fromEntries(Object.entries(orderStatusMeta).map(([key, value]) => [key, value.short])),
  ...Object.fromEntries(Object.entries(deliveryStatusMeta).map(([key, value]) => [key, value.short])),
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  OFFLINE: availabilityLabels.OFFLINE,
  AVAILABLE: availabilityLabels.AVAILABLE,
  ON_DELIVERY: availabilityLabels.ON_DELIVERY,
  CANCELLED: 'Cancelled',
  INCONSISTENT: 'Needs review',
} as Record<BadgeStatus, string>;

export function StatusBadge({
  status,
  icon,
  className,
}: {
  status: BadgeStatus;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset',
        statusClasses[status],
        className,
      )}
    >
      {icon ?? (status === 'COMPLETED' || status === 'DELIVERED' ? <PackageCheck aria-hidden="true" className="h-3 w-3" /> : null)}
      {statusLabels[status]}
    </span>
  );
}

export function orderStatusLabel(status: OrderStatus): string {
  return orderStatusMeta[status].label;
}

export function deliveryStatusLabel(status: DeliveryStatus): string {
  return deliveryStatusMeta[status].label;
}

export function accountStatusLabel(status: AccountStatus): string {
  return accountLabels[status];
}

export function availabilityLabel(status: DriverAvailability): string {
  return availabilityLabels[status];
}

/** Small text-only fallback used inside dense tables. */
export function InlineBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Badge tone="outline" size="sm" className={className}>
      {children}
    </Badge>
  );
}
