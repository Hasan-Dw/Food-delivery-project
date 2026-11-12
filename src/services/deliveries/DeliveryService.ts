import type {
  AutoAssignmentTrigger,
  Delivery,
  DeliveryAction,
  DeliveryAutoAssignmentResult,
  DriverLocationInput,
} from '@/types';

/**
 * Actor context for a manual assignment operation. This is display-only: a
 * real backend must derive the administrator from the session token and ignore
 * a browser-supplied id.
 */
export interface DeliveryAssignmentOptions {
  actorId?: string | null;
}

/** Explicit trigger for an automatic-assignment attempt. */
export interface AutoAssignDeliveryOptions extends DeliveryAssignmentOptions {
  trigger?: AutoAssignmentTrigger;
  /** Used after a manual unassign so the released driver is not re-attached. */
  excludeDriverIds?: string[];
  /** Admin retry ignores the retry cooldown and attempt cap. */
  force?: boolean;
  reason?: string;
}

/**
 * Transportation lifecycle, separate from the customer's order. Assignment is
 * a platform operation; drivers advance an already assigned delivery.
 */
export interface DeliveryService {
  list(): Promise<Delivery[]>;
  getById(deliveryId: string): Promise<Delivery>;
  getByOrderId(orderId: string): Promise<Delivery>;
  getActiveForDriver(driverId: string): Promise<Delivery | null>;
  /** Idempotently create the delivery record for a freshly placed order. */
  createForOrder(input: { idempotencyKey?: string; orderId: string }): Promise<Delivery>;
  assign(
    deliveryId: string,
    driverId: string,
    options?: DeliveryAssignmentOptions,
  ): Promise<Delivery>;
  /**
   * Run the automatic-assignment ranking for one delivery. The call is
   * idempotent: a delivery that is no longer pending returns `SKIPPED` instead
   * of being reassigned.
   */
  autoAssign(
    deliveryId: string,
    options?: AutoAssignDeliveryOptions,
  ): Promise<DeliveryAutoAssignmentResult>;
  /**
   * Release the current driver and return the delivery to
   * `PENDING_ASSIGNMENT`. An automatic replacement is attempted afterwards.
   * The order stays active; this is not a cancellation.
   */
  unassign(
    deliveryId: string,
    reason: string,
    options?: DeliveryAssignmentOptions,
  ): Promise<Delivery>;
  /** Atomically release the current driver and assign another one. */
  reassign(
    deliveryId: string,
    driverId: string,
    reason: string,
    options?: DeliveryAssignmentOptions,
  ): Promise<Delivery>;
  transition(deliveryId: string, action: DeliveryAction): Promise<Delivery>;
  updateLocation(deliveryId: string, input: DriverLocationInput): Promise<Delivery>;
}
