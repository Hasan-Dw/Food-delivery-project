/** Transportation lifecycle, owned by the platform delivery system. */
export enum DeliveryStatus {
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

/** Driver-facing transportation actions. Assignment is a separate operation. */
export enum DeliveryAction {
  ASSIGN = 'ASSIGN',
  PICK_UP = 'PICK_UP',
  START_TRANSIT = 'START_TRANSIT',
  DELIVER = 'DELIVER',
  CANCEL = 'CANCEL',
}

/** Platform assignment audit actions. */
export enum DeliveryAssignmentAction {
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  REASSIGNED = 'REASSIGNED',
}

export enum AssignmentSource {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
}

export enum AutoAssignmentTrigger {
  ORDER_READY = 'ORDER_READY',
  DRIVER_AVAILABLE = 'DRIVER_AVAILABLE',
  DRIVER_LOCATION_UPDATED = 'DRIVER_LOCATION_UPDATED',
  AFTER_UNASSIGN = 'AFTER_UNASSIGN',
  ADMIN_RETRY = 'ADMIN_RETRY',
}

export enum AutoAssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  NO_ELIGIBLE_DRIVER = 'NO_ELIGIBLE_DRIVER',
  SKIPPED = 'SKIPPED',
  COOLDOWN = 'COOLDOWN',
  EXHAUSTED = 'EXHAUSTED',
}

export const DELIVERY_ACTION_TARGET: Record<DeliveryAction, DeliveryStatus> = {
  [DeliveryAction.ASSIGN]: DeliveryStatus.ASSIGNED,
  [DeliveryAction.PICK_UP]: DeliveryStatus.PICKED_UP,
  [DeliveryAction.START_TRANSIT]: DeliveryStatus.ON_THE_WAY,
  [DeliveryAction.DELIVER]: DeliveryStatus.DELIVERED,
  [DeliveryAction.CANCEL]: DeliveryStatus.CANCELLED,
};

export const DELIVERY_STATUS_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  [DeliveryStatus.PENDING_ASSIGNMENT]: [
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
  [DeliveryStatus.PICKED_UP]: [DeliveryStatus.ON_THE_WAY, DeliveryStatus.CANCELLED],
  [DeliveryStatus.ON_THE_WAY]: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
  [DeliveryStatus.DELIVERED]: [],
  [DeliveryStatus.CANCELLED]: [],
};

export function canTransitionDeliveryStatus(
  from: DeliveryStatus,
  to: DeliveryStatus,
): boolean {
  return DELIVERY_STATUS_TRANSITIONS[from].includes(to);
}

/** Only a pre-pickup assignment may be released back to the pool. */
export function canReleaseAssignment(status: DeliveryStatus): boolean {
  return status === DeliveryStatus.ASSIGNED;
}
