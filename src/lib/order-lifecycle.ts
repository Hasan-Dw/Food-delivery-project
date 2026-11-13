import type {
  DeliveryAction,
  DeliveryStatus,
  DriverAvailability,
  OrderAction,
  OrderStatus,
} from '@/types';

/**
 * Customer-facing phase used by the tracking UI. It combines the order and
 * delivery lifecycles without merging the underlying entities. `INCONSISTENT`
 * is a visible warning, never a disguised success state.
 */
export type TrackingPhase = OrderStatus | DeliveryStatus | 'INCONSISTENT';

/**
 * Lifecycle rules shared by mocks, future services and UI action guards.
 * The backend must enforce the same rules; these helpers only keep the
 * frontend honest and prevent impossible actions from being offered.
 */
export const orderStatusTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const deliveryStatusTransitions: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  PENDING_ASSIGNMENT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const driverAvailabilityTransitions: Record<DriverAvailability, readonly DriverAvailability[]> = {
  OFFLINE: ['AVAILABLE'],
  AVAILABLE: ['OFFLINE', 'ON_DELIVERY'],
  ON_DELIVERY: ['AVAILABLE'],
};

export const orderActionStatus: Record<OrderAction, OrderStatus> = {
  ACCEPT: 'ACCEPTED',
  REJECT: 'REJECTED',
  PREPARE: 'PREPARING',
  READY: 'READY',
  COMPLETE: 'COMPLETED',
  CANCEL: 'CANCELLED',
};

export const deliveryActionStatus: Record<DeliveryAction, DeliveryStatus> = {
  ASSIGN: 'ASSIGNED',
  PICK_UP: 'PICKED_UP',
  START_TRANSIT: 'ON_THE_WAY',
  DELIVER: 'DELIVERED',
  CANCEL: 'CANCELLED',
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return orderStatusTransitions[from].includes(to);
}

export function canTransitionDeliveryStatus(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return deliveryStatusTransitions[from].includes(to);
}

export function canTransitionDriverAvailability(
  from: DriverAvailability,
  to: DriverAvailability,
): boolean {
  return driverAvailabilityTransitions[from].includes(to);
}

/** Terminal order states never accept further action. */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return orderStatusTransitions[status].length === 0;
}

/** Terminal delivery states never accept further action. */
export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return deliveryStatusTransitions[status].length === 0;
}

/** Orders that still need work from the restaurant or delivery system. */
export function isActiveOrderStatus(status: OrderStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'REJECTED';
}

/** Deliveries that are still in motion (assigned through to delivered). */
export function isActiveDeliveryStatus(status: DeliveryStatus): boolean {
  return status === 'ASSIGNED' || status === 'PICKED_UP' || status === 'ON_THE_WAY';
}

/**
 * A delivery may be returned to the assignment pool only before the food has
 * been picked up. Once a driver is in physical custody, a normal unassign would
 * strand the order, so the admin UI requires a dedicated handover workflow.
 */
export function canUnassignDelivery(status: DeliveryStatus): boolean {
  return status === 'ASSIGNED';
}

/**
 * In-transit deliveries need custody handover. The current domain model has no
 * handover entity, so the UI blocks the normal unassign flow instead of faking
 * a safe handover.
 */
export function requiresExceptionalHandover(status: DeliveryStatus): boolean {
  return status === 'PICKED_UP' || status === 'ON_THE_WAY';
}

/** Automatic assignment only applies to deliveries still in the pool. */
export function canAutoAssignDelivery(status: DeliveryStatus): boolean {
  return status === 'PENDING_ASSIGNMENT';
}

/**
 * Order completion is owned by successful delivery completion. Manual
 * completion is intentionally never exposed to customers, owners or admins.
 */
export function allowsManualOrderCompletion(): false {
  return false;
}

export interface TrackingConsistency {
  consistent: boolean;
  reason?: string;
}

/**
 * Detect cross-entity states that must not be shown as a happy path. The
 * backend should make delivery + order completion transactional; until then
 * the UI states the conflict explicitly.
 */
export function getTrackingConsistency(
  orderStatus: OrderStatus,
  deliveryStatus: DeliveryStatus,
): TrackingConsistency {
  const activeDelivery = isActiveDeliveryStatus(deliveryStatus);

  if ((orderStatus === 'CANCELLED' || orderStatus === 'REJECTED') && activeDelivery) {
    return {
      consistent: false,
      reason: 'The order is closed but a delivery is still in progress.',
    };
  }

  if (orderStatus === 'COMPLETED' && deliveryStatus !== 'DELIVERED' && deliveryStatus !== 'CANCELLED') {
    return {
      consistent: false,
      reason: 'The order says completed while its delivery has not been delivered.',
    };
  }

  if (deliveryStatus === 'DELIVERED' && orderStatus !== 'COMPLETED' && orderStatus !== 'CANCELLED') {
    return {
      consistent: false,
      reason: 'The delivery was completed but the order was not marked completed.',
    };
  }

  if (
    (deliveryStatus === 'PICKED_UP' || deliveryStatus === 'ON_THE_WAY' || deliveryStatus === 'DELIVERED') &&
    (orderStatus === 'PENDING' || orderStatus === 'ACCEPTED' || orderStatus === 'PREPARING')
  ) {
    return {
      consistent: false,
      reason: 'Food appears to have left the restaurant before the order was marked ready.',
    };
  }

  return { consistent: true };
}

/**
 * Collapse the two lifecycles into one display phase. The tracking UI uses
 * this instead of assuming that order and delivery share a status field.
 */
export function resolveTrackingPhase(
  orderStatus: OrderStatus,
  deliveryStatus: DeliveryStatus,
): TrackingPhase {
  if (!getTrackingConsistency(orderStatus, deliveryStatus).consistent) return 'INCONSISTENT';
  if (orderStatus === 'CANCELLED' || orderStatus === 'REJECTED') return 'CANCELLED';
  if (deliveryStatus === 'CANCELLED') return 'CANCELLED';
  if (deliveryStatus === 'DELIVERED' || orderStatus === 'COMPLETED') return 'DELIVERED';
  if (
    deliveryStatus === 'ASSIGNED' ||
    deliveryStatus === 'PICKED_UP' ||
    deliveryStatus === 'ON_THE_WAY'
  ) {
    return deliveryStatus;
  }
  return orderStatus;
}
