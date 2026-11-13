import type {
  AssignmentSource,
  Delivery,
  DeliveryAssignmentEvent,
  Driver,
} from '@/types';
import { isActiveDeliveryStatus } from '@/lib/order-lifecycle';

export type AssignmentFilter = 'ALL' | 'AUTOMATIC' | 'MANUAL' | 'UNASSIGNED';

export interface AssignmentMeta {
  type: AssignmentSource | 'UNASSIGNED' | 'UNRECORDED';
  label: string;
  at?: string;
  event?: DeliveryAssignmentEvent;
  adminId?: string | null;
}

export interface DeliveryOperationStats {
  availableDrivers: number;
  busyDrivers: number;
  unassignedDeliveries: number;
  activeDeliveries: number;
  totalDeliveries: number;
  /** `null` when no automatic attempt has been recorded yet. */
  autoSuccessRate: number | null;
  automaticAttempts: number;
  automaticSuccesses: number;
  awaitingRetry: number;
}

/** Most recent assignment decision, or null when the delivery has none. */
export function latestAssignmentEvent(delivery: Delivery): DeliveryAssignmentEvent | undefined {
  const history = delivery.assignmentHistory ?? [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].action !== 'UNASSIGNED') return history[index];
  }
  return undefined;
}

/**
 * Describe how the current assignment happened. The audit event is the source
 * of truth; a driver without any event is labelled "unrecorded" rather than
 * guessed.
 */
export function assignmentMeta(delivery: Delivery): AssignmentMeta {
  if (!delivery.driverId) {
    return { type: 'UNASSIGNED', label: 'Unassigned' };
  }

  const event = latestAssignmentEvent(delivery);
  if (!event) {
    return { type: 'UNRECORDED', label: 'Not recorded' };
  }

  return {
    type: event.source,
    label: event.source === 'AUTOMATIC' ? 'Automatic' : 'Manual',
    at: event.at,
    event,
    adminId: event.adminId,
  };
}

export function matchesAssignmentFilter(delivery: Delivery, filter: AssignmentFilter): boolean {
  if (filter === 'ALL') return true;
  const meta = assignmentMeta(delivery);
  if (filter === 'UNASSIGNED') return meta.type === 'UNASSIGNED';
  return meta.type === filter;
}

/**
 * Operational overview numbers. Kept out of the page so the same calculation
 * can move server-side with the stats contract unchanged.
 */
export function buildDeliveryOperationStats(
  deliveries: Delivery[],
  drivers: Driver[],
): DeliveryOperationStats {
  const availableDrivers = drivers.filter(
    (driver) =>
      driver.accountStatus === 'APPROVED' &&
      driver.availability === 'AVAILABLE' &&
      driver.activeDeliveryId === null,
  ).length;

  const busyDrivers = drivers.filter((driver) => driver.availability === 'ON_DELIVERY').length;
  const unassignedDeliveries = deliveries.filter(
    (delivery) => delivery.status === 'PENDING_ASSIGNMENT',
  ).length;
  const activeDeliveries = deliveries.filter((delivery) =>
    isActiveDeliveryStatus(delivery.status),
  ).length;

  const automaticAttempts = deliveries.filter(
    (delivery) => (delivery.autoAssignment?.attempts ?? 0) > 0,
  ).length;
  const automaticSuccesses = deliveries.filter(
    (delivery) => delivery.autoAssignment?.status === 'ASSIGNED',
  ).length;
  const awaitingRetry = deliveries.filter(
    (delivery) =>
      delivery.status === 'PENDING_ASSIGNMENT' &&
      (delivery.autoAssignment?.status === 'EXHAUSTED' ||
        delivery.autoAssignment?.status === 'NO_ELIGIBLE_DRIVER'),
  ).length;

  return {
    availableDrivers,
    busyDrivers,
    unassignedDeliveries,
    activeDeliveries,
    totalDeliveries: deliveries.length,
    autoSuccessRate: automaticAttempts > 0 ? automaticSuccesses / automaticAttempts : null,
    automaticAttempts,
    automaticSuccesses,
    awaitingRetry,
  };
}
